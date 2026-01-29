// File: src/DraftReviewModal.jsx
// ✅ 完全同步 AI 创建页面样式 - 2026-01-29
// 深色主题 + 完整10模块 + 置信度 + AI说明 + 理由 + 三语言

import React, { useState } from "react";
import { X, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
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

// ==================== 样式常量（与AI创建页面一致） ====================
const styles = {
  // 主容器
  container: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    backgroundColor: '#FAF9F5',
    color: '#e2e8f0',
    fontFamily: "'Noto Sans SC', 'SF Pro Display', -apple-system, sans-serif",
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  // Header
  header: {
    padding: '16px 32px',
    borderBottom: '1px solid #1e1e2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F5',
    flexShrink: 0
  },
  // 内容区
  content: {
    flex: 1,
    padding: '20px 28px',
    overflowY: 'auto',
    backgroundColor: '#FAF9F5'
  },
  // 模块卡片
  moduleCard: {
    backgroundColor: '#FAF9F5',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid #2d2d44'
  },
  // AI说明框
  aiNoteBox: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginBottom: '12px',
    fontSize: '13px',
    lineHeight: '1.5'
  },
  // 理由框
  reasonBox: {
    marginTop: '12px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.5'
  },
  // 值框
  valueBox: {
    padding: '14px 16px',
    borderRadius: '8px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155'
  }
};

// ==================== 子组件（与AI创建页面完全一致） ====================

// 置信度徽章
const ConfidenceBadge = ({ value }) => {
  if (!value && value !== 0) return null;
  const v = typeof value === 'number' ? value : parseFloat(value) || 0;
  
  const getStyle = (val) => {
    if (val >= 90) return { bg: '#065f46', text: '#6ee7b7' };
    if (val >= 80) return { bg: '#166534', text: '#86efac' };
    if (val >= 70) return { bg: '#854d0e', text: '#fde047' };
    return { bg: '#991b1b', text: '#fca5a5' };
  };
  const style = getStyle(v);
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '6px',
      backgroundColor: style.bg,
      color: style.text,
      fontSize: '12px',
      fontWeight: '600'
    }}>
      置信度 {Math.round(v)}%
    </div>
  );
};

// 模块卡片（与AI创建页面完全一致）
const ModuleCard = ({ number, title, confidence, aiNote, reason, children, highlight = false }) => {
  const borderColor = highlight ? '#f97316' : '#2d2d44';
  
  return (
    <div style={{
      backgroundColor: '#FAF9F5',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: `1px solid ${borderColor}`,
      position: 'relative'
    }}>
      {/* 标题行 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: '600',
          color: '#e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: highlight 
              ? 'linear-gradient(135deg, #f97316, #fb923c)'
              : 'linear-gradient(135deg, #475569, #64748b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '700',
            color: 'white'
          }}>{number}</span>
          {title}
        </h3>
        <ConfidenceBadge value={confidence} />
      </div>
      
      {/* AI说明 */}
      {aiNote && (
        <div style={styles.aiNoteBox}>
          <span style={{ color: '#fdba74' }}>💡 AI说明：</span>
          <span style={{ color: '#cbd5e1' }}> {aiNote}</span>
        </div>
      )}

      {/* 内容 */}
      <div>{children}</div>

      {/* 理由 */}
      {reason && (
        <div style={styles.reasonBox}>
          <span style={{ color: '#f59e0b' }}>📊 理由：</span> {reason}
        </div>
      )}
    </div>
  );
};

// 值显示框
const ValueBox = ({ value, valueZh, subInfo }) => (
  <div style={styles.valueBox}>
    <div style={{ fontSize: '15px', color: '#f1f5f9', fontWeight: '500', marginBottom: valueZh ? '6px' : 0 }}>
      {value || '-'}
    </div>
    {valueZh && (
      <div style={{ fontSize: '13px', color: '#94a3b8' }}>
        {valueZh}
      </div>
    )}
    {subInfo && (
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #334155' }}>
        {subInfo}
      </div>
    )}
  </div>
);

// 图片展示
const ImgTile = ({ title, src }) => {
  if (!src) {
    return (
      <div style={{
        borderRadius: '12px',
        border: '2px dashed #334155',
        backgroundColor: '#0f172a',
        padding: '16px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '14px',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        暂无
      </div>
    );
  }
  return (
    <div style={{
      borderRadius: '12px',
      border: '1px solid #334155',
      backgroundColor: '#0f172a',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#FAF9F5',
        borderBottom: '1px solid #334155'
      }}>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{title}</span>
        <button onClick={() => safeOpen(src)} style={{
          background: 'none',
          border: 'none',
          color: '#f97316',
          fontSize: '11px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          打开 <ExternalLink size={12} />
        </button>
      </div>
      <button style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => safeOpen(src)}>
        <img src={src} alt={title} style={{ width: '100%', height: '160px', objectFit: 'contain', backgroundColor: '#0f172a' }} />
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
  let modalSubtitle = "完整10模块方案";
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

  // ==================== 渲染（与AI创建页面完全一致的样式） ====================
  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>📋</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#f1f5f9' }}>{modalTitle}</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              ID: {draft.id} | {formatTime(draft.created_at)} | {modalSubtitle}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #334155',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <X size={16} /> 关闭
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={styles.content}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          {/* 审核提示条 */}
          {needsReview && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: isDevAssetsReview ? '#1e3a5f' : '#4a3728',
              border: isDevAssetsReview ? '1px solid #3b82f6' : '1px solid #f59e0b',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isDevAssetsReview ? '#3b82f6' : '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                {isDevAssetsReview ? '🧪' : '🎨'}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>
                  {isDevAssetsReview ? '待审核：开发素材（瓶型图 / 参考包装）' : '待审核：包装设计稿'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>请检查下方图片，确认后点击底部按钮</div>
              </div>
            </div>
          )}

          {/* 基础信息 */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#FAF9F5',
            border: '1px solid #2d2d44',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#fdba74', marginBottom: '12px' }}>📝 基础信息</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>开发月份</div>
                <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.develop_month}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>类目</div>
                <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.category}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>市场</div>
                <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.market}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>平台</div>
                <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.platform}</div>
              </div>
            </div>
            {/* 品牌信息 */}
            {(draft.brand_name || draft.core_selling_point || draft.concept_ingredient) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
                {draft.brand_name && (
                  <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>品牌</div>
                    <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.brand_name}</div>
                  </div>
                )}
                {draft.core_selling_point && (
                  <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>核心卖点方向</div>
                    <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.core_selling_point}</div>
                  </div>
                )}
                {draft.concept_ingredient && (
                  <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>主概念成分</div>
                    <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.concept_ingredient}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========== 完整AI方案显示（与AI创建页面一致） ========== */}
          {hasAIPlan ? (
            <>
              {/* 竞品分析摘要 */}
              {aiPlan.competitorAnalysis && (
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#431407',
                  border: '1px solid #9a3412',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#fed7aa', fontWeight: '600' }}>🔍 竞品分析摘要</h3>
                    <ConfidenceBadge value={aiPlan.competitorAnalysis.confidence} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a' }}>
                      <div style={{ fontSize: '10px', color: '#fdba74', marginBottom: '4px' }}>价格带</div>
                      <div style={{ fontSize: '13px', color: '#f1f5f9' }}>
                        {aiPlan.competitorAnalysis.priceRange?.min} - {aiPlan.competitorAnalysis.priceRange?.max}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>中位数: {aiPlan.competitorAnalysis.priceRange?.median}</div>
                    </div>
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a' }}>
                      <div style={{ fontSize: '10px', color: '#fdba74', marginBottom: '4px' }}>共同成分</div>
                      <div style={{ fontSize: '12px', color: '#f1f5f9' }}>{aiPlan.competitorAnalysis.commonIngredients?.join(', ')}</div>
                    </div>
                    <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a' }}>
                      <div style={{ fontSize: '10px', color: '#fbbf24', marginBottom: '4px' }}>⚡ 差异化机会</div>
                      <div style={{ fontSize: '12px', color: '#fbbf24' }}>{aiPlan.competitorAnalysis.gaps?.join('、')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 双列布局模块 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* 1. 产品名称 - 跨两列 */}
                {aiPlan.productName && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <ModuleCard number="1" title="产品名称 ⭐" confidence={aiPlan.productName.confidence} aiNote={aiPlan.productName.aiNote} reason={aiPlan.productName.reason} highlight>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {aiPlan.productName.options?.map((opt, idx) => (
                          <div key={idx} style={{
                            padding: '14px',
                            borderRadius: '8px',
                            backgroundColor: '#0f172a',
                            border: opt.isRecommended ? '2px solid #f97316' : '1px solid #2d2d44'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              {opt.isRecommended && (
                                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f97316', color: 'white' }}>推荐</span>
                              )}
                              {opt.formula && (
                                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#1e293b', color: '#94a3b8' }}>{opt.formula}</span>
                              )}
                            </div>
                            <div style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: '600', marginBottom: '4px' }}>{opt.id}</div>
                            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>{opt.zh}</div>
                            {opt.reason && <div style={{ fontSize: '11px', color: '#64748b' }}>💡 {opt.reason}</div>}
                          </div>
                        ))}
                      </div>
                    </ModuleCard>
                  </div>
                )}

                {/* 2. 产品定位 */}
                {aiPlan.positioning && (
                  <ModuleCard number="2" title="产品定位" confidence={aiPlan.positioning.confidence} aiNote={aiPlan.positioning.aiNote} reason={aiPlan.positioning.reason}>
                    <ValueBox value={aiPlan.positioning.value} valueZh={aiPlan.positioning.valueZh} />
                  </ModuleCard>
                )}

                {/* 3. 卖点简介 */}
                {aiPlan.productIntro && (
                  <ModuleCard number="3" title="卖点简介" confidence={aiPlan.productIntro.confidence} aiNote={aiPlan.productIntro.aiNote} reason={aiPlan.productIntro.reason}>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {aiPlan.productIntro.en && (
                        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #2d2d44' }}>
                          <div style={{ fontSize: '11px', color: '#fdba74', marginBottom: '8px', fontWeight: '600' }}>🇬🇧 English</div>
                          <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.6', margin: 0 }}>{aiPlan.productIntro.en}</p>
                        </div>
                      )}
                      {aiPlan.productIntro.zh && (
                        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #2d2d44' }}>
                          <div style={{ fontSize: '11px', color: '#fdba74', marginBottom: '8px', fontWeight: '600' }}>🇨🇳 中文</div>
                          <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.6', margin: 0 }}>{aiPlan.productIntro.zh}</p>
                        </div>
                      )}
                    </div>
                  </ModuleCard>
                )}

                {/* 4. 概念成分 - 跨两列 */}
                {aiPlan.ingredientCombos && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <ModuleCard number="4" title="概念成分组合" confidence={aiPlan.ingredientCombos.confidence} aiNote={aiPlan.ingredientCombos.aiNote} reason={aiPlan.ingredientCombos.reason}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {aiPlan.ingredientCombos.items?.map((item, idx) => (
                          <div key={idx} style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #2d2d44' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div>
                                <div style={{ fontSize: '14px', color: '#fdba74', fontWeight: '600' }}>{item.ingredient?.en}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{item.ingredient?.id} | {item.ingredient?.zh}</div>
                              </div>
                              {item.percentage && (
                                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#7c2d12', color: '#fdba74' }}>{item.percentage}</span>
                              )}
                            </div>
                            {item.benefits && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                                {item.benefits.map((b, i) => (
                                  <div key={i}>• {b.en} / {b.id} / {b.zh}</div>
                                ))}
                              </div>
                            )}
                            {item.source && (
                              <div style={{ fontSize: '10px', color: '#f59e0b', paddingTop: '6px', borderTop: '1px solid #2d2d44' }}>📎 {item.source}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ModuleCard>
                  </div>
                )}

                {/* 5. 主打功效 - 跨两列 */}
                {aiPlan.mainBenefits && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <ModuleCard number="5" title="主打功效" confidence={aiPlan.mainBenefits.confidence} aiNote={aiPlan.mainBenefits.aiNote} reason={aiPlan.mainBenefits.reason}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        {aiPlan.mainBenefits.items?.map((item, idx) => (
                          <div key={idx} style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #2d2d44' }}>
                            <div style={{ fontSize: '13px', color: '#f1f5f9', marginBottom: '4px' }}>{item.en}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.id}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{item.zh}</div>
                          </div>
                        ))}
                      </div>
                    </ModuleCard>
                  </div>
                )}

                {/* 6. 香味 */}
                {aiPlan.scent && (
                  <ModuleCard number="6" title="香味" confidence={aiPlan.scent.confidence} aiNote={aiPlan.scent.aiNote} reason={aiPlan.scent.reason}>
                    <ValueBox value={aiPlan.scent.value} valueZh={aiPlan.scent.valueZh} />
                  </ModuleCard>
                )}

                {/* 7. 料体颜色 */}
                {aiPlan.bodyColor && (
                  <ModuleCard number="7" title="料体颜色" confidence={aiPlan.bodyColor.confidence} aiNote={aiPlan.bodyColor.aiNote} reason={aiPlan.bodyColor.reason}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '2px solid #f97316' }}>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f97316', color: 'white' }}>主推</span>
                        <div style={{ fontSize: '13px', color: '#f1f5f9', marginTop: '8px' }}>{aiPlan.bodyColor.primary?.en}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{aiPlan.bodyColor.primary?.zh}</div>
                      </div>
                      <div style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #2d2d44' }}>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#334155', color: '#94a3b8' }}>备选</span>
                        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>{aiPlan.bodyColor.alternative?.en}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{aiPlan.bodyColor.alternative?.zh}</div>
                      </div>
                    </div>
                  </ModuleCard>
                )}

                {/* 8. 定价策略 */}
                {aiPlan.pricingStrategy && (
                  <ModuleCard number="8" title="定价策略" confidence={aiPlan.pricingStrategy.confidence} aiNote={aiPlan.pricingStrategy.aiNote} reason={aiPlan.pricingStrategy.reason}>
                    <ValueBox 
                      value={`${aiPlan.pricingStrategy.anchor || '-'}${aiPlan.pricingStrategy.flash ? ` (Flash: ${aiPlan.pricingStrategy.flash})` : ''}`}
                      subInfo={aiPlan.pricingStrategy.competitorPrices}
                    />
                  </ModuleCard>
                )}

                {/* 9. 产品标题 - 跨两列 */}
                {aiPlan.productTitles && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <ModuleCard number="9" title="产品标题（255字符）" confidence={aiPlan.productTitles.confidence} aiNote={aiPlan.productTitles.aiNote} reason={aiPlan.productTitles.reason}>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {aiPlan.productTitles.options?.map((opt, idx) => (
                          <div key={idx} style={{
                            padding: '14px',
                            borderRadius: '8px',
                            backgroundColor: '#0f172a',
                            border: opt.isRecommended ? '2px solid #f97316' : '1px solid #2d2d44'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              {opt.isRecommended && (
                                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f97316', color: 'white' }}>推荐</span>
                              )}
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: (opt.charCount || 0) <= 255 ? '#065f46' : '#991b1b',
                                color: (opt.charCount || 0) <= 255 ? '#6ee7b7' : '#fca5a5'
                              }}>{opt.charCount || 0} 字符</span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#f1f5f9', lineHeight: '1.5' }}>{opt.value}</div>
                            {opt.valueZh && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>{opt.valueZh}</div>}
                          </div>
                        ))}
                      </div>
                    </ModuleCard>
                  </div>
                )}

                {/* 10. 搜索关键词 - 跨两列 */}
                {aiPlan.searchKeywords && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <ModuleCard number="10" title="搜索关键词" confidence={aiPlan.searchKeywords.confidence} aiNote={aiPlan.searchKeywords.aiNote} reason={aiPlan.searchKeywords.reason}>
                      <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #2d2d44' }}>
                        {aiPlan.searchKeywords.primary?.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#fdba74', marginBottom: '6px', fontWeight: '600' }}>🔥 主关键词</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {aiPlan.searchKeywords.primary.map((kw, idx) => (
                                <span key={idx} style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#7c2d12', color: '#fdba74', fontSize: '12px' }}>{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiPlan.searchKeywords.secondary?.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>📈 次关键词</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {aiPlan.searchKeywords.secondary.map((kw, idx) => (
                                <span key={idx} style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '12px' }}>{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {aiPlan.searchKeywords.longtail?.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: '600' }}>🎯 长尾词</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {aiPlan.searchKeywords.longtail.map((kw, idx) => (
                                <span key={idx} style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#64748b', fontSize: '12px' }}>{kw}</span>
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
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#431407',
                  border: '1px solid #9a3412',
                  marginTop: '16px'
                }}>
                  <h4 style={{ fontSize: '13px', color: '#fed7aa', margin: '0 0 12px 0' }}>📊 数据来源说明</h4>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '12px', color: '#e2e8f0' }}>
                    {aiPlan.dataSourceNote.conceptBasis && <div><span style={{ color: '#fdba74' }}>概念成分依据：</span>{aiPlan.dataSourceNote.conceptBasis}</div>}
                    {aiPlan.dataSourceNote.keywordBasis && <div><span style={{ color: '#fdba74' }}>关键词依据：</span>{aiPlan.dataSourceNote.keywordBasis}</div>}
                    {aiPlan.dataSourceNote.verificationTip && (
                      <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#7c2d12', marginTop: '4px' }}>
                        ⚠️ {aiPlan.dataSourceNote.verificationTip}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ========== 旧版字段兼容显示 ========== */
            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#FAF9F5', border: '1px solid #2d2d44', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', marginBottom: '16px' }}>AI 生成内容（旧版数据）</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {draft.name_zh && (
                  <div style={{ gridColumn: 'span 2', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>产品名称（三语）</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <div><span style={{ fontSize: '10px', color: '#fdba74' }}>中文：</span><span style={{ color: '#f1f5f9' }}>{draft.name_zh}</span></div>
                      <div><span style={{ fontSize: '10px', color: '#fdba74' }}>英文：</span><span style={{ color: '#f1f5f9' }}>{draft.name_en}</span></div>
                      <div><span style={{ fontSize: '10px', color: '#fdba74' }}>印尼语：</span><span style={{ color: '#f1f5f9' }}>{draft.name_id}</span></div>
                    </div>
                  </div>
                )}
                {draft.positioning && <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>产品定位</div><div style={{ fontSize: '13px', color: '#f1f5f9' }}>{draft.positioning}</div></div>}
                {draft.selling_point && <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>卖点简介</div><div style={{ fontSize: '13px', color: '#f1f5f9' }}>{draft.selling_point}</div></div>}
                {draft.ingredients && <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>主要成分</div><div style={{ fontSize: '13px', color: '#f1f5f9' }}>{draft.ingredients}</div></div>}
                {draft.efficacy && <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>主打功效</div><div style={{ fontSize: '13px', color: '#f1f5f9', whiteSpace: 'pre-line' }}>{draft.efficacy}</div></div>}
                {draft.scent && <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>香味</div><div style={{ fontSize: '13px', color: '#f1f5f9' }}>{draft.scent}</div></div>}
                {draft.texture_color && <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>料体颜色</div><div style={{ fontSize: '13px', color: '#f1f5f9' }}>{draft.texture_color}</div></div>}
                {draft.pricing && <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>定价</div><div style={{ fontSize: '13px', color: '#f1f5f9' }}>{draft.pricing}</div></div>}
                {draft.title && <div style={{ gridColumn: 'span 2', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>产品标题</div><div style={{ fontSize: '13px', color: '#f1f5f9' }}>{draft.title}</div></div>}
                {draft.keywords && <div style={{ gridColumn: 'span 2', padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}><div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>搜索关键词</div><div style={{ fontSize: '13px', color: '#f1f5f9' }}>{draft.keywords}</div></div>}
              </div>
            </div>
          )}

          {/* 开发素材 */}
          {(bottleImg || refImgs.length > 0 || isDevAssetsReview) && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: isDevAssetsReview ? '#1e3a5f' : '#FAF9F5',
              border: isDevAssetsReview ? '1px solid #3b82f6' : '1px solid #2d2d44',
              marginTop: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{isDevAssetsReview && '🔍 '}开发素材</div>
                {isDevAssetsReview && <span style={{ padding: '4px 12px', borderRadius: '20px', backgroundColor: '#3b82f6', color: 'white', fontSize: '12px', fontWeight: '500' }}>待审核</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>瓶型图</div>
                  <ImgTile title="瓶型图" src={bottleImg} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>参考包装图</div>
                  {refImgs.length === 0 ? <ImgTile title="参考包装图" src={null} /> : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {refImgs.map((u, idx) => <ImgTile key={idx} title={`参考图 ${idx + 1}`} src={u} />)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 包装设计稿 */}
          {(packageDesignUrl || isPackageReview) && (
            <div style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: isPackageReview ? '#4a3728' : '#FAF9F5',
              border: isPackageReview ? '1px solid #f59e0b' : '1px solid #2d2d44',
              marginTop: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{isPackageReview && '🔍 '}包装设计稿</div>
                {isPackageReview && <span style={{ padding: '4px 12px', borderRadius: '20px', backgroundColor: '#f59e0b', color: 'white', fontSize: '12px', fontWeight: '500' }}>待审核</span>}
              </div>
              {packageDesignUrl ? (
                <button style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => safeOpen(packageDesignUrl)}>
                  <img src={packageDesignUrl} alt="包装设计稿" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', backgroundColor: '#0f172a' }} />
                </button>
              ) : (
                <div style={{ padding: '40px', borderRadius: '8px', border: '2px dashed #334155', textAlign: 'center', color: '#64748b' }}>设计师尚未上传</div>
              )}
            </div>
          )}

          {/* 竞品信息 */}
          {competitors.length > 0 && (
            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#FAF9F5', border: '1px solid #2d2d44', marginTop: '16px' }}>
              <button 
                onClick={() => setShowCompetitors(!showCompetitors)} 
                style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: '#f1f5f9' }}
              >
                <span style={{ fontSize: '14px', fontWeight: '600' }}>竞品信息（{competitors.length} 个）</span>
                {showCompetitors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showCompetitors && (
                <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                  {competitors.map((comp, idx) => (
                    <div key={idx} style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#f1f5f9' }}>竞品 {idx + 1}: {comp.name || comp.data?.listing?.title || '未知'}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        {comp.price && <span style={{ marginRight: '12px' }}>💰 {comp.price}</span>}
                        {comp.volume && <span>📦 {comp.volume}</span>}
                      </div>
                      {comp.url && <a href={comp.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#f97316' }}>查看链接</a>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI 元数据 */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#FAF9F5', border: '1px solid #2d2d44', marginTop: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', marginBottom: '12px' }}>AI 元数据</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>提取模型</div>
                <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.extract_provider || '—'}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>生成模型</div>
                <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>{draft.generate_provider || '—'}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>预估成本</div>
                <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>${(draft.estimated_cost || 0).toFixed(4)}</div>
              </div>
            </div>
          </div>

          {/* 审核意见输入框 */}
          {(!isView || needsReview) && (
            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#FAF9F5', border: '1px solid #2d2d44', marginTop: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', marginBottom: '12px' }}>审核意见 {needsReview && '(退回时必填)'}</div>
              <textarea
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                rows={3}
                placeholder="请填写审核意见..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderTop: '1px solid #1e1e2e',
        backgroundColor: '#FAF9F5',
        flexShrink: 0
      }}>
        {mode === "review" && !needsReview && (
          <>
            <button
              onClick={handleReject}
              disabled={submitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #ef4444',
                backgroundColor: 'transparent',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <XCircle size={16} /> 拒绝
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={16} /> {submitting ? '处理中...' : '✅ 通过并创建产品'}
            </button>
          </>
        )}
        {isDevAssetsReview && (
          <>
            <button onClick={handleDevAssetsReject} disabled={submitting || !reviewComment.trim()} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', fontSize: '14px', fontWeight: '600', cursor: (submitting || !reviewComment.trim()) ? 'not-allowed' : 'pointer', opacity: (submitting || !reviewComment.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={16} /> 退回开发补充
            </button>
            <button onClick={handleDevAssetsApprove} disabled={submitting} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} /> {submitting ? '处理中...' : '✅ 通过复审'}
            </button>
          </>
        )}
        {isPackageReview && (
          <>
            <button onClick={handlePackageReject} disabled={submitting || !reviewComment.trim()} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', fontSize: '14px', fontWeight: '600', cursor: (submitting || !reviewComment.trim()) ? 'not-allowed' : 'pointer', opacity: (submitting || !reviewComment.trim()) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <XCircle size={16} /> 退回设计修改
            </button>
            <button onClick={handlePackageApprove} disabled={submitting} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} /> {submitting ? '处理中...' : '✅ 通过审核'}
            </button>
          </>
        )}
        {isView && !needsReview && (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              关闭
            </button>
          </div>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #FAF9F5; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>
    </div>
  );
}
