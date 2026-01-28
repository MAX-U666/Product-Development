// src/AIDraftDashboard.jsx
// 🔄 更新版本 - 添加已拒绝草稿重新编辑功能
import React, { useEffect, useMemo, useState } from "react";
import { fetchAIDrafts } from "./api";
import DraftReviewModal from "./DraftReviewModal";
import DraftEditModal from "./DraftEditModal"; // 新增：编辑弹窗

// ✅ 把数据库里各种可能的 status 统一成你UI的三态
function normalizeStatus(raw) {
  const s = String(raw ?? "").trim();

  // 空值兜底：当成待审核
  if (!s) return "待审核";

  // 已经是中文三态
  if (s === "待审核" || s === "已通过" || s === "已拒绝") return s;

  // 常见英文
  if (["pending", "review", "to_review", "needs_review", "draft"].includes(s)) return "待审核";
  if (["approved", "passed", "accept", "accepted", "ok"].includes(s)) return "已通过";
  if (["rejected", "deny", "denied", "fail", "failed"].includes(s)) return "已拒绝";

  // 常见中文近义/变体
  if (["待審核", "待审", "审核中", "未审核"].includes(s)) return "待审核";
  if (["通过", "已审通过", "审核通过"].includes(s)) return "已通过";
  if (["拒绝", "已驳回", "驳回", "审核拒绝"].includes(s)) return "已拒绝";

  // 其他未知状态：先归到待审核，避免页面"空白"
  return "待审核";
}

export default function AIDraftDashboard({ currentUser, onRefresh }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDraft, setActiveDraft] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null); // 新增：正在编辑的草稿

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchAIDrafts();
      setDrafts(rows || []);
    } catch (e) {
      alert(`加载 AI 草稿失败：${String(e?.message || e)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ 审核完成后回调
  const handleReviewed = async () => {
    setActiveDraft(null);
    await load();
    onRefresh?.();
  };

  // ✅ 编辑完成后回调
  const handleEdited = async () => {
    setEditingDraft(null);
    await load();
    onRefresh?.();
  };

  // ✅ 归一化后的 drafts（最关键：避免分组筛不到导致"空白"）
  const normalizedDrafts = useMemo(() => {
    return (drafts || []).map((d) => ({
      ...d,
      _ui_status: normalizeStatus(d.status),
    }));
  }, [drafts]);

  const pending = normalizedDrafts.filter((d) => d._ui_status === "待审核");
  const approved = normalizedDrafts.filter((d) => d._ui_status === "已通过");
  const rejected = normalizedDrafts.filter((d) => d._ui_status === "已拒绝");

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🤖 AI 草稿箱</h2>
          <p className="text-sm text-gray-500 mt-1">
            AI 生成的产品方案，需要人工审核后才能创建正式产品
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          刷新
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">加载中…</div>
      ) : normalizedDrafts.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <div className="text-gray-300 mb-4">
            <svg className="mx-auto w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-2">暂无 AI 草稿</p>
          <p className="text-sm text-gray-400">点击顶部「🤖 AI 创建」按钮开始使用 AI 生成产品方案</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 待审核 */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                待审核 ({pending.length})
              </h3>
              <div className="grid gap-3">
                {pending.map((d) => (
                  <DraftCard
                    key={d.id}
                    draft={d}
                    onReview={() => setActiveDraft(d)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 已通过 */}
          {approved.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                已通过 ({approved.length})
              </h3>
              <div className="grid gap-3">
                {approved.map((d) => (
                  <DraftCard
                    key={d.id}
                    draft={d}
                    onReview={() => setActiveDraft(d)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 已拒绝 - 新增重新编辑按钮 */}
          {rejected.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                已拒绝 ({rejected.length})
              </h3>
              <div className="grid gap-3">
                {rejected.map((d) => (
                  <DraftCard
                    key={d.id}
                    draft={d}
                    onReview={() => setActiveDraft(d)}
                    onEdit={() => setEditingDraft(d)}
                    showEditButton={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ✅ 兜底：如果三组都空（理论上不会了），给个提示 */}
          {pending.length === 0 && approved.length === 0 && rejected.length === 0 && (
            <div className="text-sm text-zinc-500">
              草稿已加载，但状态字段不符合预期。请检查 ai_drafts.status 的实际值。
            </div>
          )}
        </div>
      )}

      {/* 审核弹窗 */}
      {activeDraft && (
        <DraftReviewModal
          draft={activeDraft}
          currentUser={currentUser}
          onClose={() => setActiveDraft(null)}
          onSuccess={handleReviewed}
        />
      )}

      {/* 编辑弹窗 */}
      {editingDraft && (
        <DraftEditModal
          draft={editingDraft}
          currentUser={currentUser}
          onClose={() => setEditingDraft(null)}
          onSuccess={handleEdited}
        />
      )}
    </div>
  );
}

// ✅ 草稿卡片组件 - 新增 onEdit 和 showEditButton 属性
function DraftCard({ draft, onReview, onEdit, showEditButton = false }) {
  const category = draft.category || '未知类目';
  const market = draft.market || '未知市场';
  const platform = draft.platform || '未知平台';
  const title = draft.title || '';
  
  // 新增：显示产品名称（优先中文）
  const productName = draft.name_zh || draft.name_en || draft.name_id || '';

  const statusConfig = {
    '待审核': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '待审核' },
    '已通过': { bg: 'bg-green-100', text: 'text-green-700', label: '已通过' },
    '已拒绝': { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝' },
  };

  const uiStatus = draft._ui_status || "待审核";
  const status = statusConfig[uiStatus] || statusConfig['待审核'];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* 产品名称（新增） */}
          {productName && (
            <div className="font-semibold text-base text-zinc-900 mb-1 line-clamp-1">
              {productName}
            </div>
          )}
          
          {/* 基础信息 */}
          <div className="font-medium text-sm text-zinc-600 mb-1">
            {category} · {market} · {platform}
          </div>

          {/* 标题 */}
          {title ? (
            <div className="text-xs text-zinc-500 line-clamp-2 mb-2">
              <span className="font-medium">标题：</span>
              {title}
            </div>
          ) : (
            <div className="text-xs text-zinc-400 mb-2">标题：—</div>
          )}

          {/* 元信息 */}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>
              创建：{draft.created_at ? new Date(draft.created_at).toLocaleString('zh-CN') : '—'}
            </span>
            {draft.extract_provider && <span>提取：{draft.extract_provider}</span>}
            {draft.generate_provider && <span>生成：{draft.generate_provider}</span>}
            {typeof draft.estimated_cost === 'number' && draft.estimated_cost > 0 && (
              <span>成本：${draft.estimated_cost.toFixed(4)}</span>
            )}
          </div>

          {/* 拒绝原因（如有） */}
          {uiStatus === '已拒绝' && draft.review_comment && (
            <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-700">
              <span className="font-medium">拒绝原因：</span>
              {draft.review_comment}
            </div>
          )}
        </div>

        {/* 右侧操作区 */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
            {status.label}
          </span>

          <div className="flex items-center gap-2">
            {/* 已拒绝状态显示"重新编辑"按钮 */}
            {showEditButton && onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-600 text-sm font-medium hover:bg-orange-100 transition-colors"
              >
                ✏️ 重新编辑
              </button>
            )}

            <button
              onClick={onReview}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              {uiStatus === '待审核' ? '审核' : '查看'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
