// File: src/ProductDevEdit.jsx
// 产品开发编辑页面（stage=1）
// ✅ Phase 1 升级：
// 1) 去掉管理员审核，开发员直接提交触发 AI 包装生成
// 2) 瓶型从单选改为多选（1-3个），从瓶型库选择
// 3) 参考图改为选填（0-3张）
// 4) 提交后直接调 /api/ai/generate-package，展示生成进度
// 5) 新增 PackageDesignPanel 展示生成结果

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Trash2,
  Save,
  Sparkles,
  Loader,
  Check,
  AlertCircle,
} from "lucide-react";
import { fetchData, updateData, uploadImage } from "./api";
import PackageDesignPanel from "./PackageDesignPanel";

function isBlobUrl(u) {
  return typeof u === "string" && u.startsWith("blob:");
}
function isHttpUrl(u) {
  return typeof u === "string" && /^https?:\/\//i.test(u);
}

export default function ProductDevEdit({ product, onClose, onSuccess }) {
  // ===== 文案字段 =====
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

  // ===== 瓶型多选（1-3个）=====
  const [allBottles, setAllBottles] = useState([]);
  const [selectedBottleIds, setSelectedBottleIds] = useState([]);
  const [bottlesLoading, setBottlesLoading] = useState(true);

  // ===== 参考图（0-3张，选填）=====
  const [refFiles, setRefFiles] = useState([null, null, null]);
  const [refPreviews, setRefPreviews] = useState(["", "", ""]);

  // ===== 状态 =====
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  const [showDesigns, setShowDesigns] = useState(false);

  // ===== 初始化 =====
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

      // 加载已有参考图
      setRefPreviews((prev) => {
        const next = [...prev];
        if (product.ref_packaging_url_1) next[0] = product.ref_packaging_url_1;
        if (product.ref_packaging_url_2) next[1] = product.ref_packaging_url_2;
        if (product.ref_packaging_url_3) next[2] = product.ref_packaging_url_3;
        return next;
      });

      // 如果产品已有包装方案（已提交过），显示方案面板
      if (
        product.status === "待设计师审核" ||
        product.status === "AI包装生成中" ||
        product.status === "AI生成失败"
      ) {
        setShowDesigns(true);
      }
    }
  }, [product?.id]);

  // ===== 加载瓶型库 =====
  useEffect(() => {
    async function loadBottles() {
      try {
        const bottles = await fetchData("bottles", { orderBy: "id.asc" });
        setAllBottles(bottles || []);
      } catch (e) {
        console.error("加载瓶型库失败:", e);
      } finally {
        setBottlesLoading(false);
      }
    }
    loadBottles();
  }, []);

  // ===== 组件卸载释放 blob URLs =====
  useEffect(() => {
    return () => {
      refPreviews.forEach((u) => {
        if (isBlobUrl(u)) URL.revokeObjectURL(u);
      });
    };
  }, []);

  // ===== 瓶型选择 =====
  const toggleBottle = (bottleId) => {
    setSelectedBottleIds((prev) => {
      if (prev.includes(bottleId)) {
        return prev.filter((id) => id !== bottleId);
      }
      if (prev.length >= 3) {
        alert("最多选择 3 个瓶型");
        return prev;
      }
      return [...prev, bottleId];
    });
  };

  // ===== 参考图处理 =====
  const handleRefChange = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("图片大小不能超过 5MB");
      return;
    }
    const newFiles = [...refFiles];
    newFiles[index] = file;
    setRefFiles(newFiles);

    setRefPreviews((prev) => {
      const next = [...prev];
      if (isBlobUrl(next[index])) URL.revokeObjectURL(next[index]);
      next[index] = URL.createObjectURL(file);
      return next;
    });
  };

  const handleRemoveRef = (index) => {
    const newFiles = [...refFiles];
    newFiles[index] = null;
    setRefFiles(newFiles);
    setRefPreviews((prev) => {
      const next = [...prev];
      if (isBlobUrl(next[index])) URL.revokeObjectURL(next[index]);
      next[index] = "";
      return next;
    });
  };

  // ===== 保存草稿 =====
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = { ...formData };

      for (let i = 0; i < 3; i++) {
        if (refFiles[i]) {
          const url = await uploadImage("product-images", refFiles[i]);
          updates[`ref_packaging_url_${i + 1}`] = url;
        } else if (isHttpUrl(refPreviews[i])) {
          updates[`ref_packaging_url_${i + 1}`] = refPreviews[i];
        }
      }

      await updateData("products", product.id, updates);
      alert("✅ 保存成功！");
      onSuccess?.();
    } catch (e) {
      alert(`保存失败：${e?.message || String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // ===== 提交 AI 生成包装 =====
  const handleGenerate = async () => {
    if (selectedBottleIds.length === 0) {
      alert("⚠️ 请至少选择 1 个瓶型！");
      return;
    }

    const bottleCount = selectedBottleIds.length;
    const totalDesigns = bottleCount * 5;

    if (
      !confirm(
        `确认提交 AI 包装生成？\n\n` +
          `• 选择了 ${bottleCount} 个瓶型\n` +
          `• 将生成 ${bottleCount} × 5种排版 = ${totalDesigns} 套方案\n` +
          `• 预计耗时 1-3 分钟\n\n` +
          `生成完成后将自动推送设计师审核。`
      )
    ) {
      return;
    }

    setGenerating(true);
    setGenerateResult(null);

    try {
      // 1) 先保存当前表单数据
      const updates = { ...formData };
      for (let i = 0; i < 3; i++) {
        if (refFiles[i]) {
          const url = await uploadImage("product-images", refFiles[i]);
          updates[`ref_packaging_url_${i + 1}`] = url;
        } else if (isHttpUrl(refPreviews[i])) {
          updates[`ref_packaging_url_${i + 1}`] = refPreviews[i];
        }
      }
      await updateData("products", product.id, updates);

      // 2) 收集参考图 URLs
      const refImageUrls = [];
      for (let i = 0; i < 3; i++) {
        const url = updates[`ref_packaging_url_${i + 1}`];
        if (url && isHttpUrl(url)) refImageUrls.push(url);
      }

      // 3) 调用 AI 生成
      const res = await fetch("/api/ai/generate-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          bottle_ids: selectedBottleIds,
          ref_image_urls: refImageUrls,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setGenerateResult({
          type: "success",
          message: data.message,
          successCount: data.success_count,
          failCount: data.fail_count,
          total: data.total,
        });
        setShowDesigns(true);
      } else {
        setGenerateResult({
          type: "error",
          message: data.error || "生成失败",
        });
      }
    } catch (e) {
      setGenerateResult({
        type: "error",
        message: e?.message || String(e),
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!product) return null;

  const canGenerate = selectedBottleIds.length >= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-gradient-to-r from-violet-50 to-blue-50 px-5 py-4">
          <div>
            <div className="text-base font-semibold text-zinc-900">
              🎨 AI 包装设计 - 产品开发
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              产品 ID: {product.id} | {product.category || "未分类"} |
              选瓶型 → AI自动生成包装方案 → 设计师审核
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="rounded-xl p-2 text-zinc-500 hover:bg-white/50 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ===== Content ===== */}
        <div className="max-h-[75vh] overflow-y-auto p-5">
          {/* 产品信息 */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm font-semibold text-zinc-900">📋 产品信息（继承自AI草稿）</div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {[
                { key: "positioning", label: "产品定位", placeholder: "高保湿修护、敏感肌可用" },
                { key: "selling_point", label: "核心卖点", placeholder: "功效+成分+体验+人群", textarea: true },
                { key: "ingredients", label: "主要成分", placeholder: "Niacinamide, PDRN" },
                { key: "main_efficacy", label: "主打功效", placeholder: "美白、保湿、修护" },
                { key: "volume", label: "容量", placeholder: "400ml" },
                { key: "scent", label: "香味", placeholder: "花香/果香" },
                { key: "texture_color", label: "料体颜色", placeholder: "乳白/透明" },
                { key: "pricing", label: "定价", placeholder: "IDR 49,900" },
              ].map(({ key, label, placeholder, textarea }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-zinc-700">{label}</label>
                  {textarea ? (
                    <textarea
                      value={formData[key]}
                      onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      rows={2}
                      placeholder={placeholder}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData[key]}
                      onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      placeholder={placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ===== 瓶型多选 ===== */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">
                🍾 选择瓶型 <span className="text-red-600">*</span>
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  （最少1个，最多3个，已选 {selectedBottleIds.length}/3）
                </span>
              </div>
            </div>

            {bottlesLoading ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
                <Loader className="h-4 w-4 animate-spin" />
                加载瓶型库...
              </div>
            ) : allBottles.length === 0 ? (
              <div className="mt-3 text-sm text-zinc-400">瓶型库为空，请先在管理后台添加瓶型</div>
            ) : (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                {allBottles.map((bottle) => {
                  const isSelected = selectedBottleIds.includes(bottle.id);
                  return (
                    <button
                      key={bottle.id}
                      onClick={() => toggleBottle(bottle.id)}
                      disabled={generating}
                      className={`relative flex flex-col items-center rounded-xl border-2 p-2 transition-all ${
                        isSelected
                          ? "border-violet-500 bg-violet-50 shadow-sm"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      } disabled:opacity-50`}
                    >
                      {isSelected && (
                        <div className="absolute -right-1 -top-1 rounded-full bg-violet-500 p-0.5">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <img
                        src={bottle.img_url}
                        alt={bottle.name}
                        className="h-16 w-16 rounded-lg object-contain"
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect fill='%23f4f4f5' width='64' height='64' rx='8'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' fill='%23a1a1aa' font-size='10'%3E🍾%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <span className="mt-1 text-[10px] font-medium text-zinc-600 truncate w-full text-center">
                        {bottle.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== 参考包装图（选填）===== */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm font-semibold text-zinc-900">
              📦 参考包装图（选填，0-3张）
              <span className="ml-2 text-xs font-normal text-zinc-500">
                来源 Pinterest / INS / TK / 淘宝
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div key={index}>
                  <div className="mb-2 text-xs font-semibold text-zinc-700">
                    参考图 {index + 1}
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
                        disabled={saving || generating}
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
                        disabled={saving || generating}
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

          {/* ===== 提示 ===== */}
          <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-800">
            <strong>💡 流程说明：</strong> 选择瓶型后点击「AI 生成包装」→ 系统自动生成{" "}
            <strong>瓶型数 × 5种排版 = 最多15套方案</strong> → 生成完成后自动推送设计师审核。
            参考图为选填，不传则系统根据品类自动生成。
          </div>

          {/* ===== 生成结果反馈 ===== */}
          {generateResult && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                generateResult.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {generateResult.type === "success" ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>{generateResult.message}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span>生成失败：{generateResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* ===== 包装方案面板 ===== */}
          {showDesigns && (
            <div className="mt-5">
              <PackageDesignPanel productId={product.id} />
            </div>
          )}
        </div>

        {/* ===== Footer ===== */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4">
          <button
            onClick={onClose}
            disabled={generating}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            取消
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || generating}
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
              onClick={handleGenerate}
              disabled={!canGenerate || saving || generating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:shadow-none"
            >
              {generating ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  AI 生成中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI 生成包装（{selectedBottleIds.length}×5={selectedBottleIds.length * 5}套）
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
