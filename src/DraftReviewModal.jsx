// File: src/DraftReviewModal.jsx
// ✅ 全面升级版本 - 2026-01-29
// 支持显示完整9模块AI方案，与AI生成页面风格一致

import React, { useState } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { createProductFromDraft, updateDraftStatus, updateData } from "./api";
import { getCurrentBeijingISO, formatTime } from "./timeConfig";

// ==================== 工具函数 ====================
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
  if (Array.isArray(maybe)) return maybe.filter(Boolean);
  if (typeof maybe === "string") {
    const s = maybe.trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.filter(Boolean);
      } catch (e) {}
    }
    if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
    return [s];
  }
  return [];
}

// ==================== 子组件 ====================

// 置信度徽章
const ConfidenceBadge = ({ value }) => {
  if (!value && value !== 0) return null;
  const v = typeof value === 'number' ? value : parseFloat(value) || 0;
  
  const getStyle = (val) => {
    if (val >= 90) return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
    if (val >= 80) return { bg: 'bg-green-100', text: 'text-green-700' };
    if (val >= 70) return { bg: 'bg-amber-100', text: 'text-amber-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
  };
  const style = getStyle(v);
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${style.bg} ${style.text}`}>
      置信度 {Math.round(v)}%
    </span>
  );
};

// 模块卡片
const ModuleCard = ({ number, title, confidence, aiNote, reason, children, highlight = false }) => (
  <div className={`rounded-2xl border p-4 ${highlight ? 'border-indigo-300 bg-indigo-50/50' : 'border-zinc-200 bg-white'}`}>
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white ${highlight ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
          {number}
        </span>
        <span className="font-semibold text-zinc-900">{title}</span>
      </div>
      <ConfidenceBadge value={confidence} />
    </div>
    
    {aiNote && (
      <div className="mb-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-indigo-700">{aiNote}</div>
        </div>
      </div>
    )}
    
    <div className="mb-3">{children}</div>
    
    {reason && (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700"><strong>理由：</strong>{reason}</div>
        </div>
      </div>
    )}
  </div>
);

// 图片展示
const ImgTile = ({ title, src }) => {
  if (!src) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-400 flex items-center justify-center h-40">
        暂无
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border-b border-zinc-200">
        <div className="text-sm font-medium text-zinc-800">{title}</div>
        <button onClick={() => safeOpen(src)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          打开 <ExternalLink className="h-3 w-3" />
        </button>
      </div>
      <button className="w-full" onClick={() => safeOpen(src)}>
        <img src={src} alt={title} className="w-full h-40 object-contain bg-white" />
      </button>
    </div>
  );
};

// ==================== 主组件 ====================
export default function DraftReviewModal({
  draft,
  onClose,
  onSuccess,
  mode = "review",
  product = null,
  currentUser = null,
}) {
  const [reviewComment, setReviewComment] = useState("");
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showOldFields, setShowOldFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!draft) return null;

  // 获取完整AI方案
  const aiPlan = draft.ai_generated_plan || {};
  const hasAIPlan = Object.keys(aiPlan).length > 0;
  const competitors = draft.competitors_data || [];

  // 判断审核状态
  const isView = mode === "view";
  const isDevAssetsReview = product?.stage === 1 && product?.dev_assets_status === "待复审";
  const isPackageReview = product?.stage === 3 && product?.package_review_status === "pending";
  const needsReview = isDevAssetsReview || isPackageReview;

  // 开发素材
  const bottleImg = product?.bottle_img || product?.bottle_image_url || null;
  const refImgsFromSlots = [product?.ref_packaging_url_1, product?.ref_packaging_url_2, product?.ref_packaging_url_3].filter(Boolean);
  const refImgs = refImgsFromSlots.length > 0 ? refImgsFromSlots : normalizeImageList(product?.ref_packaging_images);
  const packageDesignUrl = product?.package_design_url;

  // 动态标题
  let modalTitle = "查看 AI 草稿";
  let modalSubtitle = "完整9模块方案";
  if (mode === "review") {
    modalTitle = "审核 AI 草稿";
    modalSubtitle = "审核后创建产品";
  } else if (isDevAssetsReview) {
    modalTitle = "🧪 开发素材复审";
    modalSubtitle = "审核瓶型图和参考包装图";
  } else if (isPackageReview) {
    modalTitle = "🎨 包装设计审核";
    modalSubtitle = "审核设计师上传的包装设计稿";
  }

  // ========== 审核处理函数 ==========
  const handleApprove = async () => {
    if (!reviewComment.trim()) {
      alert("请填写审核意见");
      return;
    }
    if (!confirm("确认通过审核并创建产品？")) return;

    setSubmitting(true);
    try {
      const recommendedName = aiPlan.productName?.options?.find(o => o.isRecommended) || aiPlan.productName?.options?.[0];
      const recommendedTitle = aiPlan.productTitles?.options?.find(o => o.isRecommended) || aiPlan.productTitles?.options?.[0];
      
      const productData = {
        develop_month: draft.develop_month,
        category: draft.category,
        market: draft.market,
        platform: draft.platform,
        positioning: aiPlan.positioning?.valueZh || aiPlan.positioning?.value || draft.positioning,
        selling_point: aiPlan.productIntro?.zh || aiPlan.productIntro?.en || draft.selling_point,
        ingredients: aiPlan.ingredientCombos?.items?.map(i => i.ingredient?.zh || i.ingredient?.en).filter(Boolean).join(', ') || draft.ingredients,
        main_efficacy: aiPlan.mainBenefits?.items?.map(i => i.zh || i.en).filter(Boolean).join('\n') || draft.efficacy,
        volume: draft.volume,
        scent: aiPlan.scent?.valueZh || aiPlan.scent?.value || draft.scent,
        texture_color: aiPlan.bodyColor?.primary?.zh || aiPlan.bodyColor?.primary?.en || draft.texture_color,
        pricing: aiPlan.pricingStrategy?.anchor || draft.pricing,
        product_title: recommendedTitle?.value || draft.title,
        seo_keywords: [...(aiPlan.searchKeywords?.primary || []), ...(aiPlan.searchKeywords?.secondary || []), ...(aiPlan.searchKeywords?.longtail || [])].join(', ') || draft.keywords,
        name_zh: recommendedName?.zh || draft.name_zh,
        name_en: recommendedName?.id || draft.name_en,
        name_id: recommendedName?.id || draft.name_id,
        ai_generated_plan: aiPlan,
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

  const handleDevAssetsApprove = async () => {
    if (!confirm("确定【通过开发素材复审】吗？")) return;
    setSubmitting(true);
    try {
      await updateData("products", product.id, {
        dev_assets_status: "已通过",
        dev_assets_review_note: (reviewComment || "开发素材审核通过").trim(),
        dev_assets_reviewed_at: getCurrentBeijingISO(),
        stage: 2,
        status: "待接单",
      });
      alert("✅ 开发素材审核通过！");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      alert("审核失败：" + (e?.message || "未知错误"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDevAssetsReject = async () => {
    if (!reviewComment.trim()) { alert("请填写退回原因"); return; }
    if (!confirm("确定【退回开发补充】吗？")) return;
    setSubmitting(true);
    try {
      const currentHistory = Array.isArray(product.review_history) ? product.review_history : [];
      await updateData("products", product.id, {
        dev_assets_status: "已拒绝",
        dev_assets_review_note: reviewComment.trim(),
        dev_assets_reviewed_at: getCurrentBeijingISO(),
        review_history: [...currentHistory, { time: getCurrentBeijingISO(), note: `[开发素材退回] ${reviewComment}`, reviewer: currentUser?.name || "管理员" }],
        stage: 1,
        status: "开发补充中",
      });
      alert("✅ 已退回开发补充！");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      alert("退回失败：" + (e?.message || "未知错误"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePackageApprove = async () => {
    if (!confirm("确定【通过包装设计审核】吗？")) return;
    setSubmitting(true);
    try {
      await updateData("products", product.id, {
        package_review_status: "approved",
        package_review_note: (reviewComment || "包装设计审核通过").trim(),
        package_review_time: getCurrentBeijingISO(),
        stage: 4,
        status: "待内容策划",
      });
      alert("✅ 包装设计审核通过！");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      alert("审核失败：" + (e?.message || "未知错误"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePackageReject = async () => {
    if (!reviewComment.trim()) { alert("请填写退回原因"); return; }
    if (!confirm("确定【退回设计修改】吗？")) return;
    setSubmitting(true);
    try {
      const currentHistory = Array.isArray(product.review_history) ? product.review_history : [];
      await updateData("products", product.id, {
        package_review_status: "rejected",
        package_review_note: reviewComment.trim(),
        review_history: [...currentHistory, { time: getCurrentBeijingISO(), note: `[包装设计退回] ${reviewComment}`, reviewer: currentUser?.name || "管理员" }],
        stage: 2,
        status: "包装设计中",
      });
      alert("✅ 已退回设计修改！");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      alert("退回失败：" + (e?.message || "未知错误"));
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== 渲染 ====================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[95vh] overflow-hidden rounded-3xl bg-zinc-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4 flex-shrink-0">
          <div>
            <div className="text-base font-semibold text-zinc-900">{modalTitle}</div>
            <div className="mt-1 text-xs text-zinc-500">
              ID: {draft.id} | 创建时间: {formatTime(draft.created_at)} | {modalSubtitle}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* 审核提示条 */}
          {needsReview && (
            <div className={`mb-5 rounded-2xl border-2 p-4 ${isDevAssetsReview ? "border-blue-300 bg-blue-50" : "border-yellow-300 bg-yellow-50"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white text-xl ${isDevAssetsReview ? "bg-blue-600" : "bg-yellow-600"}`}>
                  {isDevAssetsReview ? "🧪" : "🎨"}
                </div>
                <div>
                  <div className={`text-sm font-semibold ${isDevAssetsReview ? "text-blue-800" : "text-yellow-800"}`}>
                    {isDevAssetsReview ? "待审核：开发素材（瓶型图 / 参考包装）" : "待审核：包装设计稿"}
                  </div>
                  <div className="text-xs text-zinc-600">请检查下方图片，确认后点击底部按钮</div>
                </div>
              </div>
            </div>
          )}

          {/* 基础信息 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 mb-5">
            <div className="text-sm font-semibold text-zinc-900 mb-3">基础信息</div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-xs text-zinc-500">开发月份</div>
                <div className="font-semibold text-zinc-900">{draft.develop_month}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-xs text-zinc-500">类目</div>
                <div className="font-semibold text-zinc-900">{draft.category}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-xs text-zinc-500">市场</div>
                <div className="font-semibold text-zinc-900">{draft.market}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-xs text-zinc-500">平台</div>
                <div className="font-semibold text-zinc-900">{draft.platform}</div>
              </div>
            </div>
            {/* 品牌信息 */}
            {(draft.brand_name || draft.core_selling_point) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {draft.brand_name && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="text-xs text-zinc-500">品牌</div>
                    <div className="font-semibold text-zinc-900">{draft.brand_name}</div>
                  </div>
                )}
                {draft.core_selling_point && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="text-xs text-zinc-500">核心卖点方向</div>
                    <div className="font-semibold text-zinc-900">{draft.core_selling_point}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========== 完整AI方案显示 ========== */}
          {hasAIPlan ? (
            <div className="space-y-5">
              {/* 竞品分析摘要 */}
              {aiPlan.competitorAnalysis && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-indigo-900">🔍 竞品分析摘要</div>
                    <ConfidenceBadge value={aiPlan.competitorAnalysis.confidence} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white p-3 border border-indigo-100">
                      <div className="text-xs text-indigo-600 mb-1">价格带</div>
                      <div className="text-sm font-medium text-zinc-900">
                        {aiPlan.competitorAnalysis.priceRange?.min} - {aiPlan.competitorAnalysis.priceRange?.max}
                      </div>
                      <div className="text-xs text-zinc-500">中位数: {aiPlan.competitorAnalysis.priceRange?.median}</div>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-indigo-100">
                      <div className="text-xs text-indigo-600 mb-1">共同成分</div>
                      <div className="text-sm text-zinc-900">{aiPlan.competitorAnalysis.commonIngredients?.join(', ')}</div>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-indigo-100">
                      <div className="text-xs text-amber-600 mb-1">⚡ 差异化机会</div>
                      <div className="text-sm text-amber-700">{aiPlan.competitorAnalysis.gaps?.join('、')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 9模块网格布局 */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* 1. 产品名称 - 跨两列 */}
                {aiPlan.productName && (
                  <div className="lg:col-span-2">
                    <ModuleCard number="1" title="产品名称 ⭐" confidence={aiPlan.productName.confidence} aiNote={aiPlan.productName.aiNote} reason={aiPlan.productName.reason} highlight>
                      <div className="space-y-2">
                        {aiPlan.productName.options?.map((opt, idx) => (
                          <div key={idx} className={`rounded-xl border p-3 ${opt.isRecommended ? 'border-indigo-400 bg-indigo-50' : 'border-zinc-200 bg-white'}`}>
                            {opt.isRecommended && <span className="inline-block mb-2 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-600 text-white">推荐</span>}
                            {opt.formula && <span className="inline-block mb-2 ml-2 px-2 py-0.5 rounded text-xs bg-zinc-200 text-zinc-600">{opt.formula}</span>}
                            <div className="text-base font-semibold text-zinc-900">{opt.id}</div>
                            <div className="text-sm text-zinc-600">{opt.zh}</div>
                            {opt.reason && <div className="text-xs text-zinc-500 mt-1">💡 {opt.reason}</div>}
                          </div>
                        ))}
                      </div>
                    </ModuleCard>
                  </div>
                )}

                {/* 2. 产品定位 */}
                {aiPlan.positioning && (
                  <ModuleCard number="2" title="产品定位" confidence={aiPlan.positioning.confidence} aiNote={aiPlan.positioning.aiNote} reason={aiPlan.positioning.reason}>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="text-sm font-medium text-zinc-900">{aiPlan.positioning.value}</div>
                      {aiPlan.positioning.valueZh && <div className="text-sm text-zinc-600 mt-1">{aiPlan.positioning.valueZh}</div>}
                    </div>
                  </ModuleCard>
                )}

                {/* 3. 卖点简介 */}
                {aiPlan.productIntro && (
                  <ModuleCard number="3" title="卖点简介" confidence={aiPlan.productIntro.confidence} aiNote={aiPlan.productIntro.aiNote} reason={aiPlan.productIntro.reason}>
                    <div className="space-y-2">
                      {aiPlan.productIntro.en && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-3">
                          <div className="text-xs text-indigo-600 mb-1 font-semibold">🇬🇧 English</div>
                          <div className="text-sm text-zinc-700 leading-relaxed">{aiPlan.productIntro.en}</div>
                        </div>
                      )}
                      {aiPlan.productIntro.zh && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-3">
                          <div className="text-xs text-indigo-600 mb-1 font-semibold">🇨🇳 中文</div>
                          <div className="text-sm text-zinc-700 leading-relaxed">{aiPlan.productIntro.zh}</div>
                        </div>
                      )}
                    </div>
                  </ModuleCard>
                )}

                {/* 4. 概念成分 - 跨两列 */}
                {aiPlan.ingredientCombos && (
                  <div className="lg:col-span-2">
                    <ModuleCard number="4" title="概念成分组合" confidence={aiPlan.ingredientCombos.confidence} aiNote={aiPlan.ingredientCombos.aiNote} reason={aiPlan.ingredientCombos.reason}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {aiPlan.ingredientCombos.items?.map((item, idx) => (
                          <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-3">
                            <div className="flex justify-between items-start mb-1">
                              <div className="text-sm font-semibold text-indigo-700">{item.ingredient?.en}</div>
                              {item.percentage && <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-600">{item.percentage}</span>}
                            </div>
                            <div className="text-xs text-zinc-500">{item.ingredient?.id} | {item.ingredient?.zh}</div>
                            {item.benefits && (
                              <div className="mt-2 text-xs text-zinc-600">
                                {item.benefits.map((b, i) => <span key={i} className="mr-2">• {b.zh || b.en}</span>)}
                              </div>
                            )}
                            {item.source && <div className="text-xs text-amber-600 mt-1">📎 {item.source}</div>}
                          </div>
                        ))}
                      </div>
                    </ModuleCard>
                  </div>
                )}

                {/* 5. 主打功效 */}
                {aiPlan.mainBenefits && (
                  <ModuleCard number="5" title="主打功效" confidence={aiPlan.mainBenefits.confidence} aiNote={aiPlan.mainBenefits.aiNote} reason={aiPlan.mainBenefits.reason}>
                    <div className="grid gap-2">
                      {aiPlan.mainBenefits.items?.map((item, idx) => (
                        <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-3">
                          <div className="text-sm font-medium text-zinc-900">{item.en}</div>
                          <div className="text-xs text-zinc-500">{item.id} | {item.zh}</div>
                        </div>
                      ))}
                    </div>
                  </ModuleCard>
                )}

                {/* 6. 香味 */}
                {aiPlan.scent && (
                  <ModuleCard number="6" title="香味" confidence={aiPlan.scent.confidence} aiNote={aiPlan.scent.aiNote} reason={aiPlan.scent.reason}>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="text-sm font-medium text-zinc-900">{aiPlan.scent.value}</div>
                      {aiPlan.scent.valueZh && <div className="text-sm text-zinc-600 mt-1">{aiPlan.scent.valueZh}</div>}
                    </div>
                  </ModuleCard>
                )}

                {/* 7. 料体颜色 */}
                {aiPlan.bodyColor && (
                  <ModuleCard number="7" title="料体颜色" confidence={aiPlan.bodyColor.confidence} aiNote={aiPlan.bodyColor.aiNote} reason={aiPlan.bodyColor.reason}>
                    <div className="grid gap-2 grid-cols-2">
                      <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50 p-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-600 text-white">主推</span>
                        <div className="text-sm font-medium text-zinc-900 mt-2">{aiPlan.bodyColor.primary?.en}</div>
                        <div className="text-xs text-zinc-500">{aiPlan.bodyColor.primary?.zh}</div>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-white p-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-200 text-zinc-600">备选</span>
                        <div className="text-sm text-zinc-700 mt-2">{aiPlan.bodyColor.alternative?.en}</div>
                        <div className="text-xs text-zinc-500">{aiPlan.bodyColor.alternative?.zh}</div>
                      </div>
                    </div>
                  </ModuleCard>
                )}

                {/* 8. 定价策略 */}
                {aiPlan.pricingStrategy && (
                  <ModuleCard number="8" title="定价策略" confidence={aiPlan.pricingStrategy.confidence} aiNote={aiPlan.pricingStrategy.aiNote} reason={aiPlan.pricingStrategy.reason}>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="text-lg font-bold text-emerald-600">{aiPlan.pricingStrategy.anchor}</div>
                      {aiPlan.pricingStrategy.flash && <div className="text-sm text-zinc-600">Flash: {aiPlan.pricingStrategy.flash}</div>}
                      {aiPlan.pricingStrategy.competitorPrices && <div className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-200">{aiPlan.pricingStrategy.competitorPrices}</div>}
                    </div>
                  </ModuleCard>
                )}

                {/* 9. 产品标题 - 跨两列 */}
                {aiPlan.productTitles && (
                  <div className="lg:col-span-2">
                    <ModuleCard number="9" title="产品标题（255字符）" confidence={aiPlan.productTitles.confidence} aiNote={aiPlan.productTitles.aiNote} reason={aiPlan.productTitles.reason}>
                      <div className="space-y-2">
                        {aiPlan.productTitles.options?.map((opt, idx) => (
                          <div key={idx} className={`rounded-xl border p-3 ${opt.isRecommended ? 'border-indigo-400 bg-indigo-50' : 'border-zinc-200 bg-white'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {opt.isRecommended && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-600 text-white">推荐</span>}
                              <span className={`px-2 py-0.5 rounded text-xs ${(opt.charCount || 0) <= 255 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{opt.charCount || 0} 字符</span>
                            </div>
                            <div className="text-sm text-zinc-900 leading-relaxed">{opt.value}</div>
                            {opt.valueZh && <div className="text-xs text-zinc-500 mt-1">{opt.valueZh}</div>}
                          </div>
                        ))}
                      </div>
                    </ModuleCard>
                  </div>
                )}

                {/* 10. 搜索关键词 - 跨两列 */}
                {aiPlan.searchKeywords && (
                  <div className="lg:col-span-2">
                    <ModuleCard number="10" title="搜索关键词" confidence={aiPlan.searchKeywords.confidence} aiNote={aiPlan.searchKeywords.aiNote} reason={aiPlan.searchKeywords.reason}>
                      <div className="rounded-xl border border-zinc-200 bg-white p-3">
                        {aiPlan.searchKeywords.primary?.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-indigo-600 font-semibold mb-2">🔥 主关键词</div>
                            <div className="flex flex-wrap gap-2">
                              {aiPlan.searchKeywords.primary.map((kw, i) => (
                                <span key={i} className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-sm">{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiPlan.searchKeywords.secondary?.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-zinc-600 font-semibold mb-2">📈 次关键词</div>
                            <div className="flex flex-wrap gap-2">
                              {aiPlan.searchKeywords.secondary.map((kw, i) => (
                                <span key={i} className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-sm">{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiPlan.searchKeywords.longtail?.length > 0 && (
                          <div>
                            <div className="text-xs text-zinc-500 font-semibold mb-2">🎯 长尾词</div>
                            <div className="flex flex-wrap gap-2">
                              {aiPlan.searchKeywords.longtail.map((kw, i) => (
                                <span key={i} className="px-3 py-1 rounded-lg border border-zinc-200 text-zinc-600 text-sm">{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ModuleCard>
                  </div>
                )}
              </div>

              {/* 数据来源说明 */}
              {aiPlan.dataSourceNote && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                  <div className="text-sm font-semibold text-indigo-900 mb-2">📊 数据来源说明</div>
                  <div className="grid gap-2 text-sm text-zinc-700">
                    {aiPlan.dataSourceNote.conceptBasis && <div><span className="text-indigo-600">概念成分依据：</span>{aiPlan.dataSourceNote.conceptBasis}</div>}
                    {aiPlan.dataSourceNote.keywordBasis && <div><span className="text-indigo-600">关键词依据：</span>{aiPlan.dataSourceNote.keywordBasis}</div>}
                    {aiPlan.dataSourceNote.verificationTip && (
                      <div className="mt-2 p-3 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-800">
                        ⚠️ {aiPlan.dataSourceNote.verificationTip}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========== 旧版字段兼容显示 ========== */
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="text-sm font-semibold text-zinc-900 mb-4">AI 生成内容</div>
              <div className="grid gap-4 lg:grid-cols-2">
                {draft.name_zh && (
                  <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="text-xs text-zinc-500 mb-1">产品名称（三语）</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div><span className="text-xs text-zinc-400">中文：</span><span className="font-medium">{draft.name_zh}</span></div>
                      <div><span className="text-xs text-zinc-400">英文：</span><span className="font-medium">{draft.name_en}</span></div>
                      <div><span className="text-xs text-zinc-400">印尼语：</span><span className="font-medium">{draft.name_id}</span></div>
                    </div>
                  </div>
                )}
                {draft.positioning && <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">产品定位</div><div className="text-sm text-zinc-900">{draft.positioning}</div></div>}
                {draft.selling_point && <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">卖点简介</div><div className="text-sm text-zinc-900">{draft.selling_point}</div></div>}
                {draft.ingredients && <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">主要成分</div><div className="text-sm text-zinc-900">{draft.ingredients}</div></div>}
                {draft.efficacy && <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">主打功效</div><div className="text-sm text-zinc-900 whitespace-pre-line">{draft.efficacy}</div></div>}
                {draft.scent && <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">香味</div><div className="text-sm text-zinc-900">{draft.scent}</div></div>}
                {draft.texture_color && <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">料体颜色</div><div className="text-sm text-zinc-900">{draft.texture_color}</div></div>}
                {draft.pricing && <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">定价</div><div className="text-sm text-zinc-900">{draft.pricing}</div></div>}
                {draft.title && <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">产品标题</div><div className="text-sm text-zinc-900">{draft.title}</div></div>}
                {draft.keywords && <div className="lg:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="text-xs text-zinc-500 mb-1">搜索关键词</div><div className="text-sm text-zinc-900">{draft.keywords}</div></div>}
              </div>
            </div>
          )}

          {/* 开发素材 */}
          {(bottleImg || refImgs.length > 0 || isDevAssetsReview) && (
            <div className={`mt-5 rounded-2xl border p-5 ${isDevAssetsReview ? "border-blue-300 bg-blue-50" : "border-zinc-200 bg-white"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-zinc-900">{isDevAssetsReview && "🔍 "}开发素材</div>
                {isDevAssetsReview && <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">待审核</span>}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="text-xs text-zinc-500 mb-2">瓶型图</div>
                  <ImgTile title="瓶型图" src={bottleImg} />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-2">参考包装图</div>
                  {refImgs.length === 0 ? <ImgTile title="参考包装图" src={null} /> : (
                    <div className="grid gap-2 grid-cols-2">
                      {refImgs.map((u, idx) => <ImgTile key={idx} title={`参考图 ${idx + 1}`} src={u} />)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 包装设计稿 */}
          {(packageDesignUrl || isPackageReview) && (
            <div className={`mt-5 rounded-2xl border p-5 ${isPackageReview ? "border-yellow-300 bg-yellow-50" : "border-zinc-200 bg-white"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-zinc-900">{isPackageReview && "🔍 "}包装设计稿</div>
                {isPackageReview && <span className="rounded-full bg-yellow-600 px-3 py-1 text-xs font-semibold text-white">待审核</span>}
              </div>
              {packageDesignUrl ? (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <button className="w-full" onClick={() => safeOpen(packageDesignUrl)}>
                    <img src={packageDesignUrl} alt="包装设计稿" className="w-full max-h-96 object-contain bg-white" />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-400">设计师尚未上传</div>
              )}
            </div>
          )}

          {/* 竞品信息 */}
          {competitors.length > 0 && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
              <button onClick={() => setShowCompetitors(!showCompetitors)} className="flex w-full items-center justify-between text-sm font-semibold text-zinc-900">
                <span>竞品信息（{competitors.length} 个）</span>
                {showCompetitors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showCompetitors && (
                <div className="mt-4 grid gap-3">
                  {competitors.map((comp, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <div className="font-semibold text-zinc-900">竞品 {idx + 1}: {comp.name || comp.data?.listing?.title || "未知"}</div>
                      <div className="mt-1 text-sm text-zinc-600">
                        {comp.price && <span className="mr-3">💰 {comp.price}</span>}
                        {comp.volume && <span className="mr-3">📦 {comp.volume}</span>}
                      </div>
                      {comp.url && (
                        <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">查看链接</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI 元数据 */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm font-semibold text-zinc-900 mb-3">AI 元数据</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-xs text-zinc-500">提取模型</div>
                <div className="font-semibold text-zinc-900">{draft.extract_provider || "—"}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-xs text-zinc-500">生成模型</div>
                <div className="font-semibold text-zinc-900">{draft.generate_provider || "—"}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div className="text-xs text-zinc-500">预估成本</div>
                <div className="font-semibold text-zinc-900">${(draft.estimated_cost || 0).toFixed(4)}</div>
              </div>
            </div>
          </div>

          {/* 审核意见输入框 */}
          {(!isView || needsReview) && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="text-sm font-semibold text-zinc-900">审核意见 {needsReview && "(退回时必填)"}</div>
              <textarea
                className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
                rows={3}
                placeholder="请填写审核意见..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4 flex-shrink-0">
          {mode === "review" && !needsReview && (
            <>
              <button onClick={handleReject} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                <XCircle className="h-4 w-4" /> 拒绝
              </button>
              <button onClick={handleApprove} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" /> {submitting ? "处理中..." : "✅ 通过并创建产品"}
              </button>
            </>
          )}
          {isDevAssetsReview && (
            <>
              <button onClick={handleDevAssetsReject} disabled={submitting || !reviewComment.trim()} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                <XCircle className="h-4 w-4" /> 退回开发补充
              </button>
              <button onClick={handleDevAssetsApprove} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" /> {submitting ? "处理中..." : "✅ 通过复审"}
              </button>
            </>
          )}
          {isPackageReview && (
            <>
              <button onClick={handlePackageReject} disabled={submitting || !reviewComment.trim()} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                <XCircle className="h-4 w-4" /> 退回设计修改
              </button>
              <button onClick={handlePackageApprove} disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-yellow-600 px-5 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" /> {submitting ? "处理中..." : "✅ 通过审核"}
              </button>
            </>
          )}
          {isView && !needsReview && (
            <div className="flex w-full justify-end">
              <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                关闭
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
