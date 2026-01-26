// File: src/DraftReviewModal.jsx

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import FieldRow from "./ProductFormAI/components/FieldRow";
import { createProductFromDraft, updateDraftStatus } from "./api";
import { getCurrentBeijingISO } from "./timeConfig";

function safeOpen(url) {
  if (!url) return;
  const u = String(url).trim();
  if (!u) return;
  if (!/^https?:\/\//i.test(u)) {
    window.open("https://" + u, "_blank", "noopener,noreferrer");
    return;
  }
  window.open(u, "_blank", "noopener,noreferrer");
}

function normalizeImageList(maybe) {
  if (!maybe) return [];
  // already array
  if (Array.isArray(maybe)) return maybe.filter(Boolean);

  // string: could be JSON array or single url
  if (typeof maybe === "string") {
    const s = maybe.trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.filter(Boolean);
      } catch (e) {
        // ignore
      }
    }
    // comma-separated or single
    if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
    return [s];
  }

  return [];
}

function ImgTile({ title, src }) {
  if (!src) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-400 flex items-center justify-center h-[160px]">
        暂无
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border-b border-zinc-200">
        <div className="text-sm font-semibold text-zinc-800">{title}</div>
        <button
          type="button"
          onClick={() => safeOpen(src)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          打开 <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
      <button type="button" className="w-full" onClick={() => safeOpen(src)}>
        <img
          src={src}
          alt={title}
          className="w-full h-[220px] object-contain bg-white"
        />
      </button>
    </div>
  );
}

export default function DraftReviewModal({
  draft,
  onClose,
  onSuccess,
  mode = "review",
  product = null, // ✅ 关联产品，用于展示瓶型图 & 参考包装
}) {
  const [formData, setFormData] = useState({
    positioning: "",
    sellingPoint: "",
    ingredients: "",
    efficacy: "",
    volume: "",
    scent: "",
    color: "",
    pricing: "",
    title: "",
    keywords: "",
    packaging: "",
  });

  const [reviewComment, setReviewComment] = useState("");
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (draft) {
      setFormData({
        positioning: draft.positioning || "",
        sellingPoint: draft.selling_point || "",
        ingredients: draft.ingredients || "",
        efficacy: draft.efficacy || "",
        volume: draft.volume || "",
        scent: draft.scent || "",
        color: draft.texture_color || "",
        pricing: draft.pricing || "",
        title: draft.title || "",
        keywords: draft.keywords || "",
        packaging: draft.packaging_requirements || "",
      });
    }
  }, [draft]);

  const handleApprove = async () => {
    if (!reviewComment.trim()) {
      alert("请填写审核意见");
      return;
    }

    if (!confirm("确认通过审核并创建产品？")) return;

    setSubmitting(true);
    try {
      // 1. 创建产品
      const productData = {
        develop_month: draft.develop_month,
        category: draft.category,
        market: draft.market,
        platform: draft.platform,
        positioning: formData.positioning,
        selling_point: formData.sellingPoint,
        ingredients: formData.ingredients,
        main_efficacy: formData.efficacy,
        volume: formData.volume,
        scent: formData.scent,
        texture_color: formData.color,
        pricing: formData.pricing,
        product_title: formData.title,
        seo_keywords: formData.keywords,
        packaging_design: formData.packaging,
        stage: 1,
        status: "开发补充中",
        developer_id: draft.created_by,
        is_ai_generated: true,
        created_from_draft_id: draft.id,
        has_design: false,
        created_at: getCurrentBeijingISO(),
      };

      const createResult = await createProductFromDraft(productData);
      if (!createResult?.success || !createResult?.product_id) {
        throw new Error(createResult?.message || "创建产品失败");
      }

      // 2. 更新草稿状态
      await updateDraftStatus(draft.id, "approve", reviewComment, draft.created_by);

      alert(`✅ 产品已创建成功！\n\n产品 ID: ${createResult.product_id}`);
      onSuccess?.();
      onClose?.();
    } catch (e) {
      alert(`创建失败：${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reviewComment.trim()) {
      alert("拒绝时必须填写审核意见");
      return;
    }

    if (!confirm("确认拒绝该草稿？")) return;

    setSubmitting(true);
    try {
      await updateDraftStatus(draft.id, "reject", reviewComment, draft.created_by);
      alert("✅ 已拒绝该草稿");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      alert(`拒绝失败：${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!draft) return null;

  const aiExplain = draft.ai_explanations || {};
  const competitors = draft.competitors_data || [];

  // =========================
  // ✅ 开发素材字段映射（兼容多命名 + 兼容 ref_packaging_url_1/2/3）
  // =========================
  const bottleImg =
    product?.bottle_img || // ✅ 常见：瓶型图字段
    product?.bottle_image_url ||
    product?.bottle_img_url ||
    product?.bottle_img_url_1 ||
    product?.bottle_img_1 ||
    product?.bottle_url ||
    product?.bottleImage ||
    product?.bottle_image ||
    null;

  // 参考包装图：优先吃“3格字段”，其次吃数组/字符串字段
  const refImgsFromSlots = [
    product?.ref_packaging_url_1,
    product?.ref_packaging_url_2,
    product?.ref_packaging_url_3,
  ].filter(Boolean);

  const refImgs =
    refImgsFromSlots.length > 0
      ? refImgsFromSlots
      : normalizeImageList(product?.ref_packaging_images).length > 0
      ? normalizeImageList(product?.ref_packaging_images)
      : normalizeImageList(
          product?.ref_design_imgs ||
            product?.ref_design_img ||
            product?.ref_packaging ||
            product?.ref_packaging_urls ||
            product?.ref_packaging_imgs
        );

  const isView = mode === "view";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-zinc-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
          <div>
            <div className="text-base font-semibold text-zinc-900">
              {isView ? "查看 AI 草稿" : "审核 AI 草稿"}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              ID: {draft.id} | 创建时间:{" "}
              {new Date(draft.created_at).toLocaleString("zh-CN")}
              {isView ? " | 只读模式" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {/* 基础信息 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900">基础信息</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">开发月份</div>
                <div className="font-semibold text-zinc-900">
                  {draft.develop_month}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">类目</div>
                <div className="font-semibold text-zinc-900">{draft.category}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">市场</div>
                <div className="font-semibold text-zinc-900">{draft.market}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">平台</div>
                <div className="font-semibold text-zinc-900">{draft.platform}</div>
              </div>
            </div>
          </div>

          {/* AI 生成的字段（可编辑/只读） */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900">
              AI 生成内容（{isView ? "只读" : "可编辑"}）
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <FieldRow
                label="产品定位"
                value={formData.positioning}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, positioning: v }))
                }
                placeholder="例如：高保湿修护、敏感肌可用..."
                aiNote={aiExplain?.positioning?.note}
                aiConfidence={aiExplain?.positioning?.confidence}
                aiReason={aiExplain?.positioning?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="核心卖点"
                multiline
                value={formData.sellingPoint}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, sellingPoint: v }))
                }
                placeholder="功效+成分+体验+人群..."
                aiNote={aiExplain?.sellingPoint?.note || aiExplain?.selling_point?.note}
                aiConfidence={
                  aiExplain?.sellingPoint?.confidence || aiExplain?.selling_point?.confidence
                }
                aiReason={aiExplain?.sellingPoint?.reason || aiExplain?.selling_point?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="主要成分"
                value={formData.ingredients}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, ingredients: v }))
                }
                placeholder="例如：Niacinamide, PDRN..."
                aiNote={aiExplain?.ingredients?.note}
                aiConfidence={aiExplain?.ingredients?.confidence}
                aiReason={aiExplain?.ingredients?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="主打功效"
                value={formData.efficacy}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, efficacy: v }))
                }
                placeholder="例如：美白、保湿、修护..."
                aiNote={aiExplain?.efficacy?.note}
                aiConfidence={aiExplain?.efficacy?.confidence}
                aiReason={aiExplain?.efficacy?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="容量"
                value={formData.volume}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, volume: v }))
                }
                placeholder="例如：400ml"
                aiNote={aiExplain?.volume?.note}
                aiConfidence={aiExplain?.volume?.confidence}
                aiReason={aiExplain?.volume?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="香味"
                value={formData.scent}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, scent: v }))
                }
                placeholder="例如：花香/果香..."
                aiNote={aiExplain?.scent?.note}
                aiConfidence={aiExplain?.scent?.confidence}
                aiReason={aiExplain?.scent?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="料体颜色"
                value={formData.color}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, color: v }))
                }
                placeholder="例如：乳白/透明..."
                aiNote={aiExplain?.color?.note || aiExplain?.texture_color?.note}
                aiConfidence={
                  aiExplain?.color?.confidence || aiExplain?.texture_color?.confidence
                }
                aiReason={aiExplain?.color?.reason || aiExplain?.texture_color?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="定价"
                value={formData.pricing}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, pricing: v }))
                }
                placeholder="例如：IDR 49,900"
                aiNote={aiExplain?.pricing?.note}
                aiConfidence={aiExplain?.pricing?.confidence}
                aiReason={aiExplain?.pricing?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="产品标题"
                multiline
                value={formData.title}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, title: v }))
                }
                placeholder="关键词 + 卖点 + 容量"
                aiNote={aiExplain?.title?.note}
                aiConfidence={aiExplain?.title?.confidence}
                aiReason={aiExplain?.title?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="搜索关键词"
                multiline
                value={formData.keywords}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, keywords: v }))
                }
                placeholder="keyword1, keyword2..."
                aiNote={aiExplain?.keywords?.note}
                aiConfidence={aiExplain?.keywords?.confidence}
                aiReason={aiExplain?.keywords?.reason}
                readOnly={isView}
              />

              <FieldRow
                label="包装设计需求"
                multiline
                value={formData.packaging}
                onChange={(v) =>
                  !isView && setFormData((p) => ({ ...p, packaging: v }))
                }
                placeholder="风格、色调、元素..."
                aiNote={aiExplain?.packaging?.note || aiExplain?.packaging_requirements?.note}
                aiConfidence={
                  aiExplain?.packaging?.confidence ||
                  aiExplain?.packaging_requirements?.confidence
                }
                aiReason={
                  aiExplain?.packaging?.reason || aiExplain?.packaging_requirements?.reason
                }
                readOnly={isView}
              />
            </div>
          </div>

          {/* ✅ 开发上传的素材（瓶型图 & 参考包装图） */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900">
              开发素材（瓶型图 / 参考包装）
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-xs text-zinc-500">瓶型图</div>
                <ImgTile title="瓶型图" src={bottleImg} />
              </div>

              <div>
                <div className="mb-2 text-xs text-zinc-500">参考包装图</div>
                {refImgs.length === 0 ? (
                  <ImgTile title="参考包装图" src={null} />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {refImgs.map((u, idx) => (
                      <ImgTile key={idx} title={`参考图 ${idx + 1}`} src={u} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 小提示：如果你想强提示“没传 product” */}
            {!product && (
              <div className="mt-3 text-xs text-amber-600">
                提示：当前未传入 product，无法显示瓶型/参考包装。请在打开 Modal 时传入 product（最好是全字段版本）。
              </div>
            )}
          </div>

          {/* 竞品信息（可折叠） */}
          {competitors.length > 0 && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
              <button
                onClick={() => setShowCompetitors(!showCompetitors)}
                className="flex w-full items-center justify-between text-sm font-semibold text-zinc-900"
              >
                <span>竞品信息（{competitors.length} 个）</span>
                {showCompetitors ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showCompetitors && (
                <div className="mt-4 grid gap-3">
                  {competitors.map((comp, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm"
                    >
                      <div className="font-semibold text-zinc-900">
                        竞品 {idx + 1}:{" "}
                        {comp.data?.listing?.title || comp.data?.name || "未知"}
                      </div>
                      <div className="mt-2 text-xs text-zinc-600">
                        提取方式: {comp.mode === "url" ? "链接" : "截图"}
                        {comp.url && (
                          <>
                            {" | "}
                            <a
                              href={comp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              查看链接
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI 元数据 */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900">AI 元数据</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">提取模型</div>
                <div className="font-semibold text-zinc-900">
                  {draft.extract_provider || "—"}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">生成模型</div>
                <div className="font-semibold text-zinc-900">
                  {draft.generate_provider || "—"}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">预估成本</div>
                <div className="font-semibold text-zinc-900">
                  ${(draft.estimated_cost || 0).toFixed(4)}
                </div>
              </div>
            </div>
          </div>

          {/* 审核意见（只在 review 模式显示） */}
          {!isView && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="text-sm font-semibold text-zinc-900">审核意见 *</div>
              <textarea
                className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
                rows={3}
                placeholder="请填写审核意见（必填）"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer：view 模式只保留关闭；review 模式保留拒绝/通过 */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4">
          {isView ? (
            <div className="flex w-full justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                关闭
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                拒绝
              </button>

              <button
                onClick={handleApprove}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {submitting ? "处理中..." : "✅ 通过并创建产品"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
