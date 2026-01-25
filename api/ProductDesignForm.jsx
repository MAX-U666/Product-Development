// File: src/ProductDesignForm.jsx*

import React, { useState, useEffect } from "react";
import { Upload, X, Trash2, Loader, CheckCircle } from "lucide-react";
import { insertProductDesign, uploadToSupabaseStorage, updateProduct } from "./api";

export default function ProductDesignForm({ product, onClose, onSuccess }) {
  const [packageImages, setPackageImages] = useState([]);
  const [bottleImages, setBottleImages] = useState([]);
  const [designNotes, setDesignNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  // 预览 URL 列表
  const [packagePreviews, setPackagePreviews] = useState([]);
  const [bottlePreviews, setBottlePreviews] = useState([]);

  useEffect(() => {
    return () => {
      // 清理预览 URL
      [...packagePreviews, ...bottlePreviews].forEach(url => {
        try { URL.revokeObjectURL(url); } catch {}
      });
    };
  }, [packagePreviews, bottlePreviews]);

  const handlePackageImageChange = (e) => {
    const files = Array.from(e.target.files || []).filter(f => 
      f.type.startsWith('image/')
    );
    
    if (files.length === 0) return;

    // 限制最多3张
    const validFiles = files.slice(0, 3 - packageImages.length);
    
    // 检查文件大小（每张最大2MB）
    const oversized = validFiles.filter(f => f.size > 2 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`以下文件超过 2MB：\n${oversized.map(f => f.name).join('\n')}`);
      return;
    }

    // 创建预览
    const newPreviews = validFiles.map(f => URL.createObjectURL(f));
    
    setPackageImages(prev => [...prev, ...validFiles]);
    setPackagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleBottleImageChange = (e) => {
    const files = Array.from(e.target.files || []).filter(f => 
      f.type.startsWith('image/')
    );
    
    if (files.length === 0) return;

    const validFiles = files.slice(0, 3 - bottleImages.length);
    
    const oversized = validFiles.filter(f => f.size > 2 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`以下文件超过 2MB：\n${oversized.map(f => f.name).join('\n')}`);
      return;
    }

    const newPreviews = validFiles.map(f => URL.createObjectURL(f));
    
    setBottleImages(prev => [...prev, ...validFiles]);
    setBottlePreviews(prev => [...prev, ...newPreviews]);
  };

  const removePackageImage = (index) => {
    try { URL.revokeObjectURL(packagePreviews[index]); } catch {}
    setPackageImages(prev => prev.filter((_, i) => i !== index));
    setPackagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeBottleImage = (index) => {
    try { URL.revokeObjectURL(bottlePreviews[index]); } catch {}
    setBottleImages(prev => prev.filter((_, i) => i !== index));
    setBottlePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // 验证必填
    if (packageImages.length === 0) {
      alert("请至少上传 1 张包装设计图");
      return;
    }
    if (bottleImages.length === 0) {
      alert("请至少上传 1 个瓶型图片");
      return;
    }

    if (!confirm("确认提交设计需求？")) return;

    setUploading(true);
    try {
      // 1. 上传包装设计图到 Supabase Storage
      const packageUrls = [];
      for (const file of packageImages) {
        const result = await uploadToSupabaseStorage(file, 'package-designs');
        if (!result.success) {
          throw new Error(`上传失败：${file.name}`);
        }
        packageUrls.push({
          url: result.url,
          name: file.name,
        });
      }

      // 2. 上传瓶型图片到 Supabase Storage
      const bottleUrls = [];
      for (const file of bottleImages) {
        const result = await uploadToSupabaseStorage(file, 'bottle-designs');
        if (!result.success) {
          throw new Error(`上传失败：${file.name}`);
        }
        bottleUrls.push({
          url: result.url,
          name: file.name,
        });
      }

      // 3. 保存到 product_design 表
      const designData = {
        product_id: product.id,
        package_design_images: packageUrls,
        bottle_images: bottleUrls,
        design_notes: designNotes.trim() || null,
        status: '已提交',
        submitted_at: new Date().toISOString(),
      };

      await insertProductDesign(designData);

      // 4. 更新 products.has_design = true
      await updateProduct(product.id, { has_design: true });

      alert('✅ 设计需求已提交成功！');
      onSuccess?.();
      onClose?.();
    } catch (e) {
      alert(`提交失败：${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!product) return null;

  const canSubmit = packageImages.length > 0 && bottleImages.length > 0 && !uploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-gradient-to-r from-purple-50 to-blue-50 px-5 py-4">
          <div>
            <div className="text-base font-semibold text-zinc-900">🎨 完善包装设计</div>
            <div className="mt-1 text-xs text-zinc-600">
              产品：{product.product_title || product.title} | 
              {product.is_ai_generated && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">🤖 AI</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl p-2 text-zinc-500 hover:bg-white/50 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {/* 包装设计图 */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-900">📦 参考包装设计图 *</div>
                <div className="mt-1 text-xs text-zinc-500">
                  上传 1-3 张参考图片（JPG/PNG/WEBP，单张≤2MB）
                </div>
              </div>
              <div className="text-xs font-semibold text-zinc-600">
                {packageImages.length} / 3
              </div>
            </div>

            {/* 上传按钮 */}
            {packageImages.length < 3 && (
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white px-4 py-6 text-sm font-semibold text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50">
                <Upload className="h-5 w-5" />
                点击上传包装设计图
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePackageImageChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}

            {/* 预览 */}
            {packagePreviews.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {packagePreviews.map((preview, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <img src={preview} alt={`包装设计图 ${idx + 1}`} className="h-40 w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => removePackageImage(idx)}
                        disabled={uploading}
                        className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-zinc-700">
                      {packageImages[idx]?.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 瓶型库 */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-900">🍾 瓶型库备选 *</div>
                <div className="mt-1 text-xs text-zinc-500">
                  上传 1-3 个瓶型图片（JPG/PNG/WEBP，单张≤2MB）
                </div>
              </div>
              <div className="text-xs font-semibold text-zinc-600">
                {bottleImages.length} / 3
              </div>
            </div>

            {bottleImages.length < 3 && (
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white px-4 py-6 text-sm font-semibold text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50">
                <Upload className="h-5 w-5" />
                点击上传瓶型图片
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleBottleImageChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            )}

            {bottlePreviews.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {bottlePreviews.map((preview, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <img src={preview} alt={`瓶型 ${idx + 1}`} className="h-40 w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => removeBottleImage(idx)}
                        disabled={uploading}
                        className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-zinc-700">
                      {bottleImages[idx]?.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 设计说明 */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm font-semibold text-zinc-900">📝 设计说明（可选）</div>
            <textarea
              className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
              rows={4}
              placeholder="例如：主色调、风格偏好、特殊要求等..."
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              disabled={uploading}
            />
          </div>

          {/* 提示 */}
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            ⚠️ 提示：必须至少上传 1 张包装设计图和 1 个瓶型图片才能提交
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            取消
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                提交设计需求
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
