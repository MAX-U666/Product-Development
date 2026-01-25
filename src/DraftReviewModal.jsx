// File: src/DraftReviewModal.jsx

import React, { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import FieldRow from "./ProductFormAI/components/FieldRow";
import { createProductFromDraft, updateDraftStatus } from "./api";
import { getCurrentBeijingISO } from "./timeConfig";

export default function DraftReviewModal({ draft, onClose, onSuccess }) {
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
        status: "进行中",
        developer_id: draft.created_by,
        is_ai_generated: true,
        created_from_draft_id: draft.id,
        has_design: false,
        created_at: getCurrentBeijingISO(),
      };

      console.log('准备创建产品，数据：', productData);
      
      const createResult = await createProductFromDraft(productData);
      
      console.log('API 返回结果：', createResult);

      if (!createResult?.success || !createResult?.product_id) {
        throw new Error(createResult?.message || "创建产品失败");
      }

      const productId = createResult.product_id;

      // 2. 更新草稿状态（适配原有 API）
      await updateDraftStatus(draft.id, 'approve', reviewComment, draft.created_by);

      alert(`✅ 产品已创建成功！\n\n产品 ID: ${productId}`);
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
      // 适配原有 API
      await updateDraftStatus(draft.id, 'reject', reviewComment, draft.created_by);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-zinc-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
          <div>
            <div className="text-base font-semibold text-zinc-900">审核 AI 草稿</div>
            <div className="mt-1 text-xs text-zinc-500">
              ID: {draft.id} | 创建时间: {new Date(draft.created_at).toLocaleString("zh-CN")}
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
                <div className="font-semibold text-zinc-900">{draft.develop_month}</div>
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

          {/* AI 生成的字段（可编辑）*/}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900">AI 生成内容（可编辑）</div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <FieldRow
                label="产品定位"
                value={formData.positioning}
                onChange={(v) => setFormData((p) => ({ ...p, positioning: v }))}
                placeholder="例如：高保湿修护、敏感肌可用..."
                aiNote={aiExplain?.positioning?.note}
                aiConfidence={aiExplain?.positioning?.confidence}
                aiReason={aiExplain?.positioning?.reason}
              />

              <FieldRow
                label="核心卖点"
                multiline
                value={formData.sellingPoint}
                onChange={(v) => setFormData((p) => ({ ...p, sellingPoint: v }))}
                placeholder="功效+成分+体验+人群..."
                aiNote={aiExplain?.sellingPoint?.note || aiExplain?.selling_point?.note}
                aiConfidence={aiExplain?.sellingPoint?.confidence || aiExplain?.selling_point?.confidence}
                aiReason={aiExplain?.sellingPoint?.reason || aiExplain?.selling_point?.reason}
              />

              <FieldRow
                label="主要成分"
                value={formData.ingredients}
                onChange={(v) => setFormData((p) => ({ ...p, ingredients: v }))}
                placeholder="例如：Niacinamide, PDRN..."
                aiNote={aiExplain?.ingredients?.note}
                aiConfidence={aiExplain?.ingredients?.confidence}
                aiReason={aiExplain?.ingredients?.reason}
              />

              <FieldRow
                label="主打功效"
                value={formData.efficacy}
                onChange={(v) => setFormData((p) => ({ ...p, efficacy: v }))}
                placeholder="例如：美白、保湿、修护..."
                aiNote={aiExplain?.efficacy?.note}
                aiConfidence={aiExplain?.efficacy?.confidence}
                aiReason={aiExplain?.efficacy?.reason}
              />

              <FieldRow
                label="容量"
                value={formData.volume}
                onChange={(v) => setFormData((p) => ({ ...p, volume: v }))}
                placeholder="例如：400ml"
                aiNote={aiExplain?.volume?.note}
                aiConfidence={aiExplain?.volume?.confidence}
                aiReason={aiExplain?.volume?.reason}
              />

              <FieldRow
                label="香味"
                value={formData.scent}
                onChange={(v) => setFormData((p) => ({ ...p, scent: v }))}
                placeholder="例如：花香/果香..."
                aiNote={aiExplain?.scent?.note}
                aiConfidence={aiExplain?.scent?.confidence}
                aiReason={aiExplain?.scent?.reason}
              />

              <FieldRow
                label="料体颜色"
                value={formData.color}
                onChange={(v) => setFormData((p) => ({ ...p, color: v }))}
                placeholder="例如：乳白/透明..."
                aiNote={aiExplain?.color?.note || aiExplain?.texture_color?.note}
                aiConfidence={aiExplain?.color?.confidence || aiExplain?.texture_color?.confidence}
                aiReason={aiExplain?.color?.reason || aiExplain?.texture_color?.reason}
              />

              <FieldRow
                label="定价"
                value={formData.pricing}
                onChange={(v) => setFormData((p) => ({ ...p, pricing: v }))}
                placeholder="例如：IDR 49,900"
                aiNote={aiExplain?.pricing?.note}
                aiConfidence={aiExplain?.pricing?.confidence}
                aiReason={aiExplain?.pricing?.reason}
              />

              <FieldRow
                label="产品标题"
                multiline
                value={formData.title}
                onChange={(v) => setFormData((p) => ({ ...p, title: v }))}
                placeholder="关键词 + 卖点 + 容量"
                aiNote={aiExplain?.title?.note}
                aiConfidence={aiExplain?.title?.confidence}
                aiReason={aiExplain?.title?.reason}
              />

              <FieldRow
                label="搜索关键词"
                multiline
                value={formData.keywords}
                onChange={(v) => setFormData((p) => ({ ...p, keywords: v }))}
                placeholder="keyword1, keyword2..."
                aiNote={aiExplain?.keywords?.note}
                aiConfidence={aiExplain?.keywords?.confidence}
                aiReason={aiExplain?.keywords?.reason}
              />

              <FieldRow
                label="包装设计需求"
                multiline
                value={formData.packaging}
                onChange={(v) => setFormData((p) => ({ ...p, packaging: v }))}
                placeholder="风格、色调、元素..."
                aiNote={aiExplain?.packaging?.note || aiExplain?.packaging_requirements?.note}
                aiConfidence={aiExplain?.packaging?.confidence || aiExplain?.packaging_requirements?.confidence}
                aiReason={aiExplain?.packaging?.reason || aiExplain?.packaging_requirements?.reason}
              />
            </div>
          </div>

          {/* 竞品信息（可折叠）*/}
          {competitors.length > 0 && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
              <button
                onClick={() => setShowCompetitors(!showCompetitors)}
                className="flex w-full items-center justify-between text-sm font-semibold text-zinc-900"
              >
                <span>竞品信息（{competitors.length} 个）</span>
                {showCompetitors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showCompetitors && (
                <div className="mt-4 grid gap-3">
                  {competitors.map((comp, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                      <div className="font-semibold text-zinc-900">
                        竞品 {idx + 1}: {comp.data?.listing?.title || comp.data?.name || "未知"}
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
                <div className="font-semibold text-zinc-900">{draft.extract_provider || "—"}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">生成模型</div>
                <div className="font-semibold text-zinc-900">{draft.generate_provider || "—"}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <div className="text-xs text-zinc-500">预估成本</div>
                <div className="font-semibold text-zinc-900">
                  ${(draft.estimated_cost || 0).toFixed(4)}
                </div>
              </div>
            </div>
          </div>

          {/* 审核意见 */}
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4">
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
        </div>
      </div>
    </div>
  );
}
