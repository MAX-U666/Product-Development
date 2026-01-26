// File: src/ProductDetail.jsx
// ✅ 完整版本 - 2026-01-26
// 传统创建产品审核页面 - 完整展示所有创建时填写的字段

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  ExternalLink,
  Eye,
  Calendar,
  Tag,
  Globe,
  ShoppingBag,
  Droplet,
  Package,
  DollarSign,
  Sparkles,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  Clock,
  User,
  Palette,
  Beaker,
} from "lucide-react";
import { updateData } from "./api";
import { createClient } from "@supabase/supabase-js";
import { getCurrentBeijingISO, formatTime } from "./timeConfig";

// Supabase 客户端（用于查询瓶型图）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ========== 工具函数 ==========
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

// ========== 子组件 ==========
function FieldItem({ label, value, fullWidth = false }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 min-h-[44px]">
        {value || <span className="text-zinc-400">-</span>}
      </div>
    </div>
  );
}

function ImgTile({ title, src, size = "normal" }) {
  const heightClass = size === "large" ? "h-[280px]" : size === "small" ? "h-[120px]" : "h-[160px]";
  
  if (!src) {
    return (
      <div className={`rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-400 flex items-center justify-center ${heightClass}`}>
        <div className="text-center">
          <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-40" />
          <span className="text-xs">暂无图片</span>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 border-b border-zinc-100">
        <div className="text-xs font-medium text-zinc-700">{title}</div>
        <button
          type="button"
          onClick={() => safeOpen(src)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          打开 <ExternalLink className="h-3 w-3" />
        </button>
      </div>
      <button type="button" className="w-full" onClick={() => safeOpen(src)}>
        <img
          src={src}
          alt={title}
          className={`w-full ${heightClass} object-contain bg-white`}
        />
      </button>
    </div>
  );
}

function SectionCard({ icon: Icon, title, badge = null, highlight = false, children }) {
  return (
    <div className={`rounded-2xl border p-5 ${
      highlight ? "border-blue-300 bg-blue-50" : "border-zinc-200 bg-white"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          {Icon && <Icon className="h-4 w-4 text-zinc-600" />}
          <span>{title}</span>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ========== 主组件 ==========
export default function ProductDetail({
  product,
  onClose,
  onRefresh,
  currentUser = null,
  onOpenDraftPreview = null,
}) {
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bottleImgUrl, setBottleImgUrl] = useState(null);

  // 查询瓶型图（如果只有 bottle_id 没有 bottle_img）
  useEffect(() => {
    async function fetchBottleImg() {
      // 如果已有 bottle_img，直接用
      if (product?.bottle_img) {
        setBottleImgUrl(product.bottle_img);
        return;
      }
      // 如果有 bottle_id，查询 bottles 表
      if (product?.bottle_id && supabase) {
        try {
          const { data, error } = await supabase
            .from("bottles")
            .select("img_url")
            .eq("id", product.bottle_id)
            .single();
          if (!error && data?.img_url) {
            setBottleImgUrl(data.img_url);
          }
        } catch (e) {
          console.error("查询瓶型图失败:", e);
        }
      }
    }
    fetchBottleImg();
  }, [product?.bottle_img, product?.bottle_id]);

  if (!product) return null;

  // ========== 数据解析 ==========
  // 瓶型图 - 使用 state 中查询到的 URL
  const bottleImg = bottleImgUrl;

  // 参考包装图 - 数据库字段: ref_design_img (单张) 或 ref_packaging_url_1/2/3 (多张)
  const refImgsFromSlots = [
    product.ref_packaging_url_1,
    product.ref_packaging_url_2,
    product.ref_packaging_url_3,
  ].filter(Boolean);

  // 如果没有分开的字段，尝试用 ref_design_img
  const refImgs =
    refImgsFromSlots.length > 0
      ? refImgsFromSlots
      : product.ref_design_img 
        ? [product.ref_design_img] 
        : [];

  // 包装设计稿
  const packageDesignUrl = product.package_design_url;

  // 竞品数据（3组链接+图片）- 数据库字段: competitor_1_url, competitor_1_img
  const competitors = [
    { 
      link: product.competitor_1_url, 
      img: product.competitor_1_img 
    },
    { 
      link: product.competitor_2_url, 
      img: product.competitor_2_img 
    },
    { 
      link: product.competitor_3_url, 
      img: product.competitor_3_img 
    },
  ];

  // ========== 审核状态判断 ==========
  const isDevAssetsReview = product.stage === 1 && 
    (product.dev_assets_status === "待复审" || product.status === "待管理员复审" || product.status === "待审核");
  
  const isPackageReview = product.stage === 3 && product.package_review_status === "pending";
  
  const needsReview = isDevAssetsReview || isPackageReview;

  // ========== 审核操作 ==========
  const handleDevAssetsApprove = async () => {
    if (!confirm("确定【通过开发素材复审】吗？\n\n通过后将进入【设计待接单】阶段。")) return;

    setSubmitting(true);
    try {
      await updateData("products", product.id, {
        dev_assets_status: "已通过",
        dev_assets_review_note: (reviewComment || "开发素材审核通过").trim(),
        dev_assets_reviewed_at: getCurrentBeijingISO(),
        stage: 2,
        status: "待接单",
      });

      alert("✅ 开发素材审核通过！\n\n产品已进入【设计待接单】阶段。");
      onRefresh?.();
      onClose?.();
    } catch (e) {
      alert("审核失败：" + (e?.message || "未知错误"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDevAssetsReject = async () => {
    if (!reviewComment.trim()) {
      alert("请填写退回原因（必填）");
      return;
    }
    if (!confirm("确定【退回开发补充】吗？")) return;

    setSubmitting(true);
    try {
      const currentHistory = Array.isArray(product.review_history) ? product.review_history : [];
      const newHistory = [
        ...currentHistory,
        {
          time: getCurrentBeijingISO(),
          note: `[开发素材退回] ${reviewComment}`,
          reviewer: currentUser?.name || "管理员",
        },
      ];

      await updateData("products", product.id, {
        dev_assets_status: "已拒绝",
        dev_assets_review_note: reviewComment.trim(),
        dev_assets_reviewed_at: getCurrentBeijingISO(),
        review_history: newHistory,
        stage: 1,
        status: "开发补充中",
      });

      alert("✅ 已退回开发补充！");
      onRefresh?.();
      onClose?.();
    } catch (e) {
      alert("退回失败：" + (e?.message || "未知错误"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePackageApprove = async () => {
    if (!confirm("确定【通过包装设计审核】吗？\n\n通过后将进入【内容策划】阶段。")) return;

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
      onRefresh?.();
      onClose?.();
    } catch (e) {
      alert("审核失败：" + (e?.message || "未知错误"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePackageReject = async () => {
    if (!reviewComment.trim()) {
      alert("请填写退回原因（必填）");
      return;
    }
    if (!confirm("确定【退回设计修改】吗？")) return;

    setSubmitting(true);
    try {
      const currentHistory = Array.isArray(product.review_history) ? product.review_history : [];
      const newHistory = [
        ...currentHistory,
        {
          time: getCurrentBeijingISO(),
          note: `[包装设计退回] ${reviewComment}`,
          reviewer: currentUser?.name || "管理员",
        },
      ];

      await updateData("products", product.id, {
        package_review_status: "rejected",
        package_review_note: reviewComment.trim(),
        review_history: newHistory,
        stage: 2,
        status: "包装设计中",
      });

      alert("✅ 已退回设计修改！");
      onRefresh?.();
      onClose?.();
    } catch (e) {
      alert("退回失败：" + (e?.message || "未知错误"));
    } finally {
      setSubmitting(false);
    }
  };

  // ========== 审核状态徽章 ==========
  let reviewBadge = null;
  if (isDevAssetsReview) {
    reviewBadge = (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
        🧪 待复审 - 开发素材
      </span>
    );
  } else if (isPackageReview) {
    reviewBadge = (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
        🎨 待审核 - 包装设计
      </span>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-zinc-50 shadow-2xl">
        {/* ========== Header ========== */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-zinc-900">
                {product.product_title || product.category || "产品详情"}
              </h2>
              {reviewBadge}
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-zinc-500">
              <span>开发月份：{product.develop_month || "-"}</span>
              <span>阶段：{product.stage}</span>
              <span>状态：{product.status || "-"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {product.is_ai_generated && product.created_from_draft_id && onOpenDraftPreview && (
              <button
                onClick={() => onOpenDraftPreview(product)}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Eye className="h-4 w-4" />
                查看AI草稿
              </button>
            )}
            <button
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              🗑️ 删除
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ========== Content ========== */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          
          {/* 审核提示条 */}
          {needsReview && (
            <div className={`rounded-2xl border-2 p-4 ${
              isDevAssetsReview 
                ? "border-blue-300 bg-blue-50" 
                : "border-yellow-300 bg-yellow-50"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white text-xl ${
                  isDevAssetsReview ? "bg-blue-600" : "bg-yellow-600"
                }`}>
                  {isDevAssetsReview ? "🧪" : "🎨"}
                </div>
                <div>
                  <div className={`text-sm font-bold ${
                    isDevAssetsReview ? "text-blue-800" : "text-yellow-800"
                  }`}>
                    {isDevAssetsReview ? "待复审：请检查开发资料、竞品信息和图片素材" : "待审核：请检查包装设计稿"}
                  </div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    确认后点击底部按钮通过或退回
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========== 1. 基础信息 ========== */}
          <SectionCard icon={FileText} title="基础信息">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldItem label="开发月份 *" value={product.develop_month} />
              <FieldItem label="开发时间" value={product.develop_time} />
              <FieldItem label="开发品类 *" value={product.category} />
              <FieldItem label="赛道" value={product.track} />
              <FieldItem label="目标市场" value={product.target_market || product.market} />
              <FieldItem label="目标平台" value={product.target_platform || product.platform} />
            </div>
          </SectionCard>

          {/* ========== 2. 产品规格 ========== */}
          <SectionCard icon={Droplet} title="产品规格">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FieldItem label="料体颜色" value={product.material_color || product.texture_color} />
              <FieldItem label="容量" value={product.capacity || product.volume} />
              <FieldItem label="香味" value={product.fragrance || product.scent} />
              <FieldItem label="价格" value={product.price || product.pricing} />
            </div>
          </SectionCard>

          {/* ========== 3. 产品卖点 ========== */}
          <SectionCard icon={Sparkles} title="产品卖点">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldItem label="卖点 *" value={product.selling_point} fullWidth />
              <FieldItem label="主概念" value={product.main_concept || product.positioning} />
              <FieldItem label="主要成分" value={product.ingredient || product.ingredients} />
              <FieldItem label="主打功效" value={product.primary_benefit || product.main_efficacy} />
              <FieldItem label="完整成分" value={product.ingredients} />
            </div>
          </SectionCard>

          {/* ========== 4. 包装设计需求 ========== */}
          <SectionCard icon={Palette} title="包装设计需求">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 min-h-[80px] whitespace-pre-wrap">
              {product.packaging_design || product.packaging_requirements || <span className="text-zinc-400">-</span>}
            </div>
          </SectionCard>

          {/* ========== 5. 竞品信息（3条链接 + 3张图片）========== */}
          <SectionCard 
            icon={LinkIcon} 
            title="竞品信息（3条链接 + 3张图片）"
            highlight={isDevAssetsReview}
            badge={isDevAssetsReview && (
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                需检查
              </span>
            )}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {competitors.map((comp, idx) => (
                <div key={idx} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-zinc-800">竞品 {idx + 1}</span>
                    {comp.link ? (
                      <a
                        href={comp.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        查看链接 <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400">无链接</span>
                    )}
                  </div>
                  
                  {/* 竞品链接显示 */}
                  <div className="mb-3">
                    <div className="text-xs text-zinc-500 mb-1">竞品链接 {idx + 1}</div>
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 truncate">
                      {comp.link || <span className="text-zinc-400">https://...</span>}
                    </div>
                  </div>

                  {/* 竞品图片显示 */}
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">竞品图片 {idx + 1}</div>
                    {comp.img ? (
                      <button type="button" className="w-full" onClick={() => safeOpen(comp.img)}>
                        <img
                          src={comp.img}
                          alt={`竞品图 ${idx + 1}`}
                          className="w-full h-[120px] object-contain bg-zinc-50 rounded-lg border border-zinc-200"
                        />
                      </button>
                    ) : (
                      <div className="w-full h-[120px] bg-zinc-50 rounded-lg border border-dashed border-zinc-200 flex items-center justify-center text-xs text-zinc-400">
                        <div className="text-center">
                          <ImageIcon className="h-5 w-5 mx-auto mb-1 opacity-40" />
                          暂无图片
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ========== 6. 参考包装 & 瓶型图 ========== */}
          <SectionCard 
            icon={Package} 
            title="参考包装 & 瓶型"
            highlight={isDevAssetsReview}
            badge={isDevAssetsReview && (
              <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                需检查
              </span>
            )}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              {/* 参考包装 */}
              <div>
                <div className="text-xs text-zinc-500 mb-2 font-medium">参考包装图</div>
                {refImgs.length === 0 ? (
                  <ImgTile title="参考包装" src={null} />
                ) : (
                  <div className="grid gap-2 grid-cols-2">
                    {refImgs.map((u, idx) => (
                      <ImgTile key={idx} title={`参考图 ${idx + 1}`} src={u} size="small" />
                    ))}
                  </div>
                )}
              </div>

              {/* 瓶型图 */}
              <div>
                <div className="text-xs text-zinc-500 mb-2 font-medium">瓶型图</div>
                <ImgTile title="瓶型图" src={bottleImg} />
              </div>
            </div>
          </SectionCard>

          {/* ========== 7. 包装设计稿（设计师上传）========== */}
          {(packageDesignUrl || isPackageReview) && (
            <SectionCard 
              icon={Palette} 
              title="包装设计稿（设计师上传）"
              highlight={isPackageReview}
              badge={isPackageReview && (
                <span className="rounded-full bg-yellow-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  待审核
                </span>
              )}
            >
              {packageDesignUrl ? (
                <>
                  <ImgTile title="当前设计稿" src={packageDesignUrl} size="large" />
                  {product.package_designer_id && (
                    <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        设计师: {product.package_designer_id}
                      </span>
                      {product.package_design_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          提交: {formatTime(product.package_design_time)}
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center text-sm text-zinc-400">
                  <Palette className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  设计师尚未上传包装设计稿
                </div>
              )}
            </SectionCard>
          )}

          {/* ========== 8. 审核意见 ========== */}
          {needsReview && (
            <SectionCard icon={FileText} title="审核意见">
              <div className="text-xs text-zinc-500 mb-2">退回时必填审核意见</div>
              <textarea
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none ring-blue-500 focus:ring-2 focus:bg-white transition-colors"
                rows={3}
                placeholder={
                  isDevAssetsReview 
                    ? "例如：瓶型图需要换成透明背景；参考图至少补一张正面；尺寸比例不对..."
                    : "例如：主标题字号需要加大；背景色调太暗；LOGO位置需要调整..."
                }
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </SectionCard>
          )}

          {/* ========== 9. 退回历史记录 ========== */}
          {product.review_history && Array.isArray(product.review_history) && product.review_history.length > 0 && (
            <SectionCard icon={Clock} title="退回历史记录">
              <div className="space-y-2">
                {product.review_history.map((record, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-700">第 {idx + 1} 次退回</span>
                      <span className="text-xs text-zinc-500">{formatTime(record.time)}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">审核人：{record.reviewer || "管理员"}</div>
                    <div className="mt-2 text-sm text-zinc-800">{record.note}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

        </div>

        {/* ========== Footer ========== */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-6 py-4">
          {/* 开发素材复审模式 */}
          {isDevAssetsReview && (
            <>
              <button
                onClick={handleDevAssetsReject}
                disabled={submitting || !reviewComment.trim()}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle className="h-4 w-4" />
                退回开发补充
              </button>

              <button
                onClick={handleDevAssetsApprove}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                {submitting ? "处理中..." : "✅ 通过复审 → 进入设计待接单"}
              </button>
            </>
          )}

          {/* 包装设计审核模式 */}
          {isPackageReview && (
            <>
              <button
                onClick={handlePackageReject}
                disabled={submitting || !reviewComment.trim()}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XCircle className="h-4 w-4" />
                退回设计修改
              </button>

              <button
                onClick={handlePackageApprove}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                {submitting ? "处理中..." : "✅ 通过审核 → 进入内容策划"}
              </button>
            </>
          )}

          {/* 非审核模式 */}
          {!needsReview && (
            <div className="flex w-full justify-end">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
