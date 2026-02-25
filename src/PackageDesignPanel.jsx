// File: src/PackageDesignPanel.jsx
// 包装方案展示面板 — 展示 AI 生成的包装设计方案（方案墙）
// 用于 ProductDevEdit 提交后 & ProductDetail 中查看

import React, { useState, useEffect, useCallback } from "react";
import {
  Loader,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Image,
  Maximize2,
  X,
} from "lucide-react";

// 排版风格标签颜色
const STYLE_COLORS = {
  A: "bg-blue-100 text-blue-700",
  B: "bg-purple-100 text-purple-700",
  C: "bg-amber-100 text-amber-700",
  D: "bg-green-100 text-green-700",
  E: "bg-pink-100 text-pink-700",
};

const STYLE_NAMES = {
  A: "居中对称",
  B: "左右分栏",
  C: "产品主导",
  D: "元素环绕",
  E: "场景沉浸",
};

export default function PackageDesignPanel({ productId, onClose }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [regenerating, setRegenerating] = useState({});

  // 获取方案列表
  const loadDesigns = useCallback(async () => {
    if (!productId) return;
    try {
      const res = await fetch(`/api/ai/package-status?product_id=${productId}`);
      const data = await res.json();
      if (data.success) {
        setDesigns(data.designs || []);
        // 如果还有正在生成的，继续轮询
        if (data.generating > 0) {
          setPolling(true);
        } else {
          setPolling(false);
        }
      }
    } catch (e) {
      console.error("Load designs error:", e);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // 初始加载
  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  // 轮询（如果有正在生成的）
  useEffect(() => {
    if (!polling) return;
    const timer = setInterval(loadDesigns, 8000);
    return () => clearInterval(timer);
  }, [polling, loadDesigns]);

  // 重新生成单个方案
  const handleRegenerate = async (designId) => {
    setRegenerating((prev) => ({ ...prev, [designId]: true }));
    try {
      const res = await fetch("/api/ai/regenerate-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design_id: designId }),
      });
      const data = await res.json();
      if (data.success) {
        loadDesigns(); // 刷新
      } else {
        alert(`重新生成失败: ${data.error}`);
      }
    } catch (e) {
      alert(`重新生成失败: ${e.message}`);
    } finally {
      setRegenerating((prev) => ({ ...prev, [designId]: false }));
    }
  };

  // 按瓶型分组
  const groupByBottle = () => {
    const groups = {};
    for (const d of designs) {
      const key = d.bottle_id || "unknown";
      if (!groups[key]) {
        groups[key] = {
          bottleName: d.bottle_name || `瓶型 ${d.bottle_id}`,
          bottleId: d.bottle_id,
          designs: [],
        };
      }
      groups[key].designs.push(d);
    }
    return Object.values(groups);
  };

  // 统计
  const totalCount = designs.length;
  const successCount = designs.filter(
    (d) => d.status === "pending" || d.status === "approved"
  ).length;
  const failCount = designs.filter((d) => d.status === "failed").length;
  const generatingCount = designs.filter((d) => d.status === "generating").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-zinc-500">加载方案中...</span>
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
        <Image className="h-12 w-12 mb-3" />
        <p className="text-sm">暂无包装方案</p>
        <p className="text-xs mt-1">提交瓶型后将自动生成</p>
      </div>
    );
  }

  const groups = groupByBottle();

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-900">
            🎨 包装方案 ({totalCount}套)
          </span>
          {generatingCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
              <Loader className="h-3 w-3 animate-spin" />
              生成中 {generatingCount}
            </span>
          )}
          {successCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600">
              <CheckCircle className="h-3 w-3" />
              已完成 {successCount}
            </span>
          )}
          {failCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
              <XCircle className="h-3 w-3" />
              失败 {failCount}
            </span>
          )}
        </div>
        <button
          onClick={loadDesigns}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
        >
          <RefreshCw className="h-3 w-3" />
          刷新
        </button>
      </div>

      {/* 按瓶型分组展示 */}
      {groups.map((group) => (
        <div key={group.bottleId} className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-zinc-800">
              🍾 {group.bottleName}
            </span>
            <span className="ml-2 text-xs text-zinc-400">
              {group.designs.length} 套方案
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3 p-4">
            {group.designs
              .sort((a, b) => {
                const order = "ABCDE";
                return (
                  order.indexOf(a.layout_style_id) - order.indexOf(b.layout_style_id)
                );
              })
              .map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onPreview={() => setPreviewUrl(design.design_url)}
                  onRegenerate={() => handleRegenerate(design.id)}
                  regenerating={regenerating[design.id]}
                />
              ))}
          </div>
        </div>
      ))}

      {/* 图片预览弹窗 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={previewUrl}
              alt="预览"
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -right-3 -top-3 rounded-full bg-white p-2 shadow-lg hover:bg-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 单个方案卡片
function DesignCard({ design, onPreview, onRegenerate, regenerating }) {
  const styleId = design.layout_style_id || "A";
  const styleName = design.layout_style_name || STYLE_NAMES[styleId] || styleId;
  const colorClass = STYLE_COLORS[styleId] || "bg-zinc-100 text-zinc-600";

  if (design.status === "generating") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 aspect-square">
        <Loader className="h-6 w-6 animate-spin text-blue-400 mb-2" />
        <span className="text-xs font-medium text-blue-500">生成中...</span>
        <span className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
          {styleName}
        </span>
      </div>
    );
  }

  if (design.status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50/50 p-4 aspect-square">
        <AlertTriangle className="h-6 w-6 text-red-400 mb-2" />
        <span className="text-xs font-medium text-red-500 mb-2">生成失败</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
          {styleName}
        </span>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-200 disabled:opacity-50"
        >
          {regenerating ? (
            <Loader className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          重试
        </button>
      </div>
    );
  }

  // 有图的状态（pending / approved / rejected / need_revision）
  return (
    <div className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md aspect-square">
      {design.design_url ? (
        <img
          src={design.design_url}
          alt={`方案 ${styleId}`}
          className="h-full w-full object-cover cursor-pointer"
          onClick={onPreview}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-50">
          <Image className="h-8 w-8 text-zinc-300" />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
          {styleName}
        </span>
      </div>

      {/* 放大按钮 */}
      {design.design_url && (
        <button
          onClick={onPreview}
          className="absolute right-1.5 top-1.5 rounded-lg bg-white/80 p-1.5 opacity-0 shadow transition-opacity group-hover:opacity-100"
        >
          <Maximize2 className="h-3 w-3 text-zinc-700" />
        </button>
      )}

      {/* 状态角标 */}
      {design.status === "approved" && (
        <div className="absolute left-1.5 top-1.5 rounded-full bg-green-500 p-1">
          <CheckCircle className="h-3 w-3 text-white" />
        </div>
      )}
      {design.status === "rejected" && (
        <div className="absolute left-1.5 top-1.5 rounded-full bg-red-500 p-1">
          <XCircle className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
}
