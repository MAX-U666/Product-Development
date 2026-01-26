// File: src/ProductDetail.jsx
// ✅ 优化版本 - 2026-01-26
// 传统创建产品审核页面，风格与 DraftReviewModal 统一

import React, { useState } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  ExternalLink,
  Eye,
  Package,
  FileText,
  Beaker,
  Palette,
  Image as ImageIcon,
  Clock,
  User,
  Calendar,
  Tag,
  Globe,
  ShoppingBag,
} from "lucide-react";
import { updateData } from "./api";
import { getCurrentBeijingISO, formatTime } from "./timeConfig";

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
function InfoCard({ icon: Icon, label, value, className = "" }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-semibold text-zinc-900">{value || "-"}</div>
    </div>
  );
}

function ImgTile({ title, src, size = "normal" }) {
  const heightClass = size === "large" ? "h-[280px]" : "h-[180px]";
  
  if (!src) {
    return (
      <div className={`rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-400 flex items-center justify-center ${heightClass}`}>
        <div className="text-center">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <span>暂无图片</span>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
          className={`w-full ${heightClass} object-contain bg-white`}
        />
      </button>
    </div>
  );
}

function SectionTitle({ icon: Icon, children, badge = null }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-base font-semibold text-zinc-900">
        {Icon && <Icon className="h-5 w-5 text-zinc-600" />}
        <span>{children}</span>
      </div>
      {badge}
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

  if (!product) return null;

  // ========== 数据解析 ==========
  const bottleImg =
    product.bottle_img ||
    product.bottle_image_url ||
    product.bottle_img_url ||
    null;

  const refImgsFromSlots = [
    product.ref_packaging_url_1,
    product.ref_packaging_url_2,
    product.ref_packaging_url_3,
  ].filter(Boolean);

  const refImgs =
    refImgsFromSlots.length > 0
      ? refImgsFromSlots
      : normalizeImageList(product.ref_packaging_images);

  const packageDesignUrl = product.package_design_url;

  // 竞品图片
  const competitorImgs = [
    { url: product.competitor_img_1, link: product.competitor_link_1 },
    { url: product.competitor_img_2, link: product.competitor_link_2 },
    { url: product.competitor_img_3, link: product.competitor_link_3 },
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

  // ========== 动态标题 ==========
  let reviewBadge = null;
  if (isDevAssetsReview) {
    reviewBadge = (
      <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
        <Beaker className="h-3.5 w-3.5" />
        待复审 - 开发素材
      </span>
    );
  } else if (isPackageReview) {
    reviewBadge = (
      <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
        <Palette className="h-3.5 w-3.5" />
        待审核 - 包装设计
      </span>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-zinc-50 shadow-2xl">
        {/* ========== Header ========== */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-6 py-4">
          <div className="flex-1">
            <div className="flex items-center">
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
            {/* AI 草稿按钮 */}
            {product.is_ai_generated && product.created_from_draft_id && onOpenDraftPreview && (
              <button
                onClick={() => onOpenDraftPreview(product)}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                <Eye className="h-4 w-4" />
                查看AI草稿
              </button>
            )}

            {/* 删除按钮 */}
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm("确定删除该产品吗？")) {
                  // 删除逻辑
                }
              }}
            >
              🗑️ 删除
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ========== Content ========== */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-6">
          {/* 审核提示条 */}
          {needsReview && (
            <div className={`mb-6 rounded-2xl border-2 p-5 ${
              isDevAssetsReview 
                ? "border-blue-300 bg-blue-50" 
                : "border-yellow-300 bg-yellow-50"
            }`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white text-2xl ${
                  isDevAssetsReview ? "bg-blue-600" : "bg-yellow-600"
                }`}>
                  {isDevAssetsReview ? "🧪" : "🎨"}
                </div>
                <div className="flex-1">
                  <div className={`text-base font-bold ${
                    isDevAssetsReview ? "text-blue-800" : "text-yellow-800"
                  }`}>
                    {isDevAssetsReview ? "待复审：开发素材（瓶型图 / 参考包装 / 竞品）" : "待审核：包装设计稿"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    {isDevAssetsReview 
                      ? "请检查下方开发上传的素材，确认后点击底部按钮通过或退回"
                      : "请检查下方设计师上传的包装设计稿，确认后点击底部按钮"
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 基础信息 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <SectionTitle icon={FileText}>基础信息</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCard icon={Calendar} label="开发月份" value={product.develop_month} />
              <InfoCard icon={Tag} label="类目" value={product.category} />
              <InfoCard icon={Globe} label="市场" value={product.market} />
              <InfoCard icon={ShoppingBag} label="平台" value={product.platform} />
            </div>
          </div>

          {/* 开发资料 */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
            <SectionTitle icon={Beaker}>开发资料</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500 mb-1">卖点</div>
                  <div className="text-sm text-zinc-900">{product.selling_point || "-"}</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500 mb-1">主概念</div>
                  <div className="text-sm text-zinc-900">{product.positioning || "-"}</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500 mb-1">主要成分</div>
                  <div className="text-sm text-zinc-900">{product.ingredients || "-"}</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500 mb-1">主打功效</div>
                  <div className="text-sm text-zinc-900">{product.main_efficacy || "-"}</div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500 mb-1">完整成分</div>
                  <div className="text-sm text-zinc-900">{product.full_ingredients || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500 mb-1">开发时间</div>
                    <div className="text-sm text-zinc-900">{product.develop_month || "-"}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500 mb-1">创建时间</div>
                    <div className="text-sm text-zinc-900">{formatTime(product.created_at)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* 参考包装 */}
                <div>
                  <div className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    参考包装
                  </div>
                  {refImgs.length === 0 ? (
                    <ImgTile title="参考包装" src={null} />
                  ) : (
                    <div className="grid gap-2 grid-cols-2">
                      {refImgs.map((u, idx) => (
                        <ImgTile key={idx} title={`参考图 ${idx + 1}`} src={u} />
                      ))}
                    </div>
                  )}
                </div>

                {/* 瓶型 */}
                <div>
                  <div className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    瓶型
                  </div>
                  <ImgTile title="瓶型图" src={bottleImg} />
                </div>
              </div>
            </div>
          </div>

          {/* 竞品信息 */}
          <div className={`mt-5 rounded-2xl border p-5 ${
            isDevAssetsReview 
              ? "border-blue-300 bg-blue-50" 
              : "border-zinc-200 bg-white"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                🔗 竞品（链接 + 图片）
              </div>
              {isDevAssetsReview && (
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  需检查
                </span>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {competitorImgs.map((comp, idx) => (
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
                  {comp.url ? (
                    <button type="button" className="w-full" onClick={() => safeOpen(comp.url)}>
                      <img
                        src={comp.url}
                        alt={`竞品图 ${idx + 1}`}
                        className="w-full h-[140px] object-contain bg-zinc-50 rounded-lg"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-[140px] bg-zinc-50 rounded-lg flex items-center justify-center text-sm text-zinc-400">
                      暂无图片
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 包装设计稿（如果有）*/}
          {(packageDesignUrl || isPackageReview) && (
            <div className={`mt-5 rounded-2xl border p-5 ${
              isPackageReview 
                ? "border-yellow-300 bg-yellow-50" 
                : "border-zinc-200 bg-white"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                  <Palette className="h-5 w-5" />
                  {isPackageReview && "🔍 "} 包装设计稿
                </div>
                {isPackageReview && (
                  <span className="rounded-full bg-yellow-600 px-3 py-1 text-xs font-semibold text-white">
                    待审核
                  </span>
                )}
              </div>
              {packageDesignUrl ? (
                <ImgTile title="当前设计稿" src={packageDesignUrl} size="large" />
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-12 text-center text-sm text-zinc-400">
                  <Palette className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  设计师尚未上传包装设计稿
                </div>
              )}

              {product.package_designer_id && (
                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    设计师ID: {product.package_designer_id}
                  </span>
                  {product.package_design_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      提交时间: {formatTime(product.package_design_time)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 审核意见输入框 */}
          {needsReview && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="text-sm font-semibold text-zinc-900 mb-3">
                审核意见 <span className="font-normal text-zinc-500">(退回时必填)</span>
              </div>
              <textarea
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2 focus:bg-white transition-colors"
                rows={3}
                placeholder={
                  isDevAssetsReview 
                    ? "例如：瓶型图需要换成透明背景；参考图至少补一张正面；尺寸比例不对..."
                    : "例如：主标题字号需要加大；背景色调太暗；LOGO位置需要调整..."
                }
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
          )}

          {/* 退回历史记录 */}
          {product.review_history && Array.isArray(product.review_history) && product.review_history.length > 0 && (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="text-sm font-semibold text-zinc-900 mb-3">📜 退回历史记录</div>
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
            </div>
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
