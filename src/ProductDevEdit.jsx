// File: src/ProductDevEdit.jsx
// 产品开发编辑页面（stage=1）
// 功能：编辑文案字段 + 上传瓶型和参考图 + 提交进入设计

import React, { useState, useEffect } from "react";
import { X, Upload, Trash2, Save, Send, Loader } from "lucide-react";
import { updateData, uploadImage, fetchData } from "./api";

export default function ProductDevEdit({ product, onClose, onSuccess }) {
  // 文案字段
  const [formData, setFormData] = useState({
    positioning: "",
    selling_point: "",
    ingredients: "",
    main_efficacy: "",
    volume: "",
    scent: "",
    texture_color: "",
    pricing: "",
    product_title: "",
    seo_keywords: "",
    packaging_design: "",
  });

  // 图片字段
  const [bottleFile, setBottleFile] = useState(null);
  const [bottlePreview, setBottlePreview] = useState("");
  const [refFiles, setRefFiles] = useState([null, null, null]);
  const [refPreviews, setRefPreviews] = useState(["", "", ""]);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 初始化数据
  useEffect(() => {
    if (product) {
      setFormData({
        positioning: product.positioning || "",
        selling_point: product.selling_point || "",
        ingredients: product.ingredients || "",
        main_efficacy: product.main_efficacy || "",
        volume: product.volume || "",
        scent: product.scent || "",
        texture_color: product.texture_color || "",
        pricing: product.pricing || "",
        product_title: product.product_title || "",
        seo_keywords: product.seo_keywords || "",
        packaging_design: product.packaging_design || "",
      });

      // 加载已有图片
      if (product.bottle_img) setBottlePreview(product.bottle_img);
      if (product.ref_packaging_url_1) {
        setRefPreviews((prev) => [product.ref_packaging_url_1, prev[1], prev[2]]);
      }
      if (product.ref_packaging_url_2) {
        setRefPreviews((prev) => [prev[0], product.ref_packaging_url_2, prev[2]]);
      }
      if (product.ref_packaging_url_3) {
        setRefPreviews((prev) => [prev[0], prev[1], product.ref_packaging_url_3]);
      }
    }
  }, [product]);

  // 处理瓶型图片上传
  const handleBottleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("图片大小不能超过 2MB");
      return;
    }

    setBottleFile(file);
    const preview = URL.createObjectURL(file);
    setBottlePreview(preview);
  };

  // 处理参考图上传
  const handleRefChange = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("图片大小不能超过 2MB");
      return;
    }

    const newFiles = [...refFiles];
    newFiles[index] = file;
    setRefFiles(newFiles);

    const preview = URL.createObjectURL(file);
    const newPreviews = [...refPreviews];
    newPreviews[index] = preview;
    setRefPreviews(newPreviews);
  };

  // 删除参考图
  const handleRemoveRef = (index) => {
    const newFiles = [...refFiles];
    newFiles[index] = null;
    setRefFiles(newFiles);

    const newPreviews = [...refPreviews];
    if (newPreviews[index].startsWith("blob:")) {
      URL.revokeObjectURL(newPreviews[index]);
    }
    newPreviews[index] = "";
    setRefPreviews(newPreviews);
  };

  // 保存草稿（不改 stage）
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { ...formData };

      // 上传瓶型图（如果有新文件）
      if (bottleFile) {
        const url = await uploadImage("product-images", bottleFile);
        updates.bottle_img = url;
      }

      // 上传参考图（如果有新文件）
      for (let i = 0; i < 3; i++) {
        if (refFiles[i]) {
          const url = await uploadImage("product-images", refFiles[i]);
          const fieldName = `ref_packaging_url_${i + 1}`;
          updates[fieldName] = url;
        }
      }

      await updateData("products", product.id, updates);

      alert("✅ 保存成功！");
      onSuccess?.();
    } catch (e) {
      alert(`保存失败：${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 提交进入设计（改 stage=2）
  const handleSubmit = async () => {
    // 检查最低门槛
    const hasBottle = bottleFile || bottlePreview;
    const hasRef1 = refFiles[0] || refPreviews[0];

    if (!hasBottle || !hasRef1) {
      alert("⚠️ 需要至少：\n\n• 瓶型图 1 张\n• 参考包装图 1 张\n\n才能提交进入设计！");
      return;
    }

    if (!confirm("确认提交进入设计阶段？\n\n提交后将进入待接单状态。")) {
      return;
    }

    setSubmitting(true);
    try {
      // 1. 先保存（确保图片已上传）
      const updates = { ...formData };

      if (bottleFile) {
        const url = await uploadImage("product-images", bottleFile);
        updates.bottle_img = url;
      }

      for (let i = 0; i < 3; i++) {
        if (refFiles[i]) {
          const url = await uploadImage("product-images", refFiles[i]);
          const fieldName = `ref_packaging_url_${i + 1}`;
          updates[fieldName] = url;
        }
      }

      await updateData("products", product.id, updates);

      // 2. 调用提交 API
      const response = await fetch("/api/product-dev-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "提交失败");
      }

      alert("✅ 已成功提交进入设计阶段！");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      alert(`提交失败：${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  const canSubmit = (bottleFile || bottlePreview) && (refFiles[0] || refPreviews[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4">
          <div>
            <div className="text-base font-semibold text-zinc-900">
              📝 产品开发 - Stage 1
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              产品 ID: {product.id} | 继续完善资料并上传瓶型和参考图
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving || submitting}
            className="rounded-xl p-2 text-zinc-500 hover:bg-white/50 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto p-5">
          {/* 文案字段 */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm font-semibold text-zinc-900">产品信息</div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-zinc-700">产品定位</label>
                <input
                  type="text"
                  value={formData.positioning}
                  onChange={(e) => setFormData((p) => ({ ...p, positioning: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="例如：高保湿修护、敏感肌可用"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">核心卖点</label>
                <textarea
                  value={formData.selling_point}
                  onChange={(e) => setFormData((p) => ({ ...p, selling_point: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="功效+成分+体验+人群"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">主要成分</label>
                <input
                  type="text"
                  value={formData.ingredients}
                  onChange={(e) => setFormData((p) => ({ ...p, ingredients: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="例如：Niacinamide, PDRN"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">主打功效</label>
                <input
                  type="text"
                  value={formData.main_efficacy}
                  onChange={(e) => setFormData((p) => ({ ...p, main_efficacy: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="例如：美白、保湿、修护"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">容量</label>
                <input
                  type="text"
                  value={formData.volume}
                  onChange={(e) => setFormData((p) => ({ ...p, volume: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="例如：400ml"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">香味</label>
                <input
                  type="text"
                  value={formData.scent}
                  onChange={(e) => setFormData((p) => ({ ...p, scent: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="例如：花香/果香"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">料体颜色</label>
                <input
                  type="text"
                  value={formData.texture_color}
                  onChange={(e) => setFormData((p) => ({ ...p, texture_color: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="例如：乳白/透明"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">定价</label>
                <input
                  type="text"
                  value={formData.pricing}
                  onChange={(e) => setFormData((p) => ({ ...p, pricing: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="例如：IDR 49,900"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="text-xs font-semibold text-zinc-700">产品标题</label>
                <textarea
                  value={formData.product_title}
                  onChange={(e) => setFormData((p) => ({ ...p, product_title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="关键词 + 卖点 + 容量"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">搜索关键词</label>
                <input
                  type="text"
                  value={formData.seo_keywords}
                  onChange={(e) => setFormData((p) => ({ ...p, seo_keywords: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder="keyword1, keyword2, ..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700">包装设计需求</label>
                <textarea
                  value={formData.packaging_design}
                  onChange={(e) => setFormData((p) => ({ ...p, packaging_design: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="风格、色调、元素..."
                />
              </div>
            </div>
          </div>

          {/* 瓶型图 */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">
                🍾 瓶型图 <span className="text-red-600">*</span>
              </div>
              {bottlePreview && (
                <span className="text-xs font-semibold text-green-600">✓ 已上传</span>
              )}
            </div>

            {!bottlePreview ? (
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white px-4 py-6 text-sm font-semibold text-zinc-700 hover:border-zinc-400">
                <Upload className="h-5 w-5" />
                点击上传瓶型图
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBottleChange}
                  className="hidden"
                  disabled={saving || submitting}
                />
              </label>
            ) : (
              <div className="mt-3 relative overflow-hidden rounded-xl border border-zinc-200">
                <img src={bottlePreview} alt="瓶型" className="h-40 w-full object-cover" />
                <button
                  onClick={() => {
                    if (bottlePreview.startsWith("blob:")) URL.revokeObjectURL(bottlePreview);
                    setBottlePreview("");
                    setBottleFile(null);
                  }}
                  disabled={saving || submitting}
                  className="absolute right-2 top-2 rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* 参考包装图 */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm font-semibold text-zinc-900">
              📦 参考包装图（至少1张）<span className="text-red-600">*</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div key={index}>
                  <div className="mb-2 text-xs font-semibold text-zinc-700">
                    参考图 {index + 1} {index === 0 && <span className="text-red-600">*</span>}
                  </div>

                  {!refPreviews[index] ? (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white px-3 py-6 text-xs font-semibold text-zinc-700 hover:border-zinc-400">
                      <Upload className="h-4 w-4" />
                      上传
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleRefChange(index, e)}
                        className="hidden"
                        disabled={saving || submitting}
                      />
                    </label>
                  ) : (
                    <div className="relative overflow-hidden rounded-xl border border-zinc-200">
                      <img
                        src={refPreviews[index]}
                        alt={`参考图${index + 1}`}
                        className="h-32 w-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveRef(index)}
                        disabled={saving || submitting}
                        className="absolute right-1 top-1 rounded-lg bg-red-600 p-1 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 提示 */}
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            ⚠️ 提示：必须上传【瓶型图1张 + 参考包装图至少1张】才能提交进入设计阶段
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4">
          <button
            onClick={onClose}
            disabled={saving || submitting}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            取消
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存草稿
                </>
              )}
            </button>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || saving || submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  提交进入设计
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
