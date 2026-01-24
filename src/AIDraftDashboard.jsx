// src/AIDraftDashboard.jsx
import React, { useEffect, useState } from "react";
import { fetchAIDrafts } from "./api";
import DraftReviewModal from "./DraftReviewModal";

export default function AIDraftDashboard({ currentUser, onRefresh }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDraft, setActiveDraft] = useState(null);

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
    // ✅ 通知 App.jsx 刷新待审核数量
    onRefresh?.();
  };

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
      ) : drafts.length === 0 ? (
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
        <>
          {/* ✅ 按状态分组显示 */}
          <div className="space-y-6">
            {/* 待审核 */}
            {drafts.filter(d => d.status === '待审核').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  待审核 ({drafts.filter(d => d.status === '待审核').length})
                </h3>
                <div className="grid gap-3">
                  {drafts.filter(d => d.status === '待审核').map((d) => (
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
            {drafts.filter(d => d.status === '已通过').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  已通过 ({drafts.filter(d => d.status === '已通过').length})
                </h3>
                <div className="grid gap-3">
                  {drafts.filter(d => d.status === '已通过').map((d) => (
                    <DraftCard 
                      key={d.id} 
                      draft={d} 
                      onReview={() => setActiveDraft(d)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 已拒绝 */}
            {drafts.filter(d => d.status === '已拒绝').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  已拒绝 ({drafts.filter(d => d.status === '已拒绝').length})
                </h3>
                <div className="grid gap-3">
                  {drafts.filter(d => d.status === '已拒绝').map((d) => (
                    <DraftCard 
                      key={d.id} 
                      draft={d} 
                      onReview={() => setActiveDraft(d)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeDraft && (
        <DraftReviewModal
          draft={activeDraft}
          currentUser={currentUser}
          onClose={() => setActiveDraft(null)}
          onReviewed={handleReviewed}
        />
      )}
    </div>
  );
}

// ✅ 草稿卡片组件
function DraftCard({ draft, onReview }) {
  // ✅ 修复：直接从表字段读取
  const category = draft.category || '未知类目';
  const market = draft.market || '未知市场';
  const platform = draft.platform || '未知平台';
  const title = draft.title || '';

  const statusConfig = {
    '待审核': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '待审核' },
    '已通过': { bg: 'bg-green-100', text: 'text-green-700', label: '已通过' },
    '已拒绝': { bg: 'bg-red-100', text: 'text-red-700', label: '已拒绝' },
  };

  const status = statusConfig[draft.status] || statusConfig['待审核'];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow">
      <div className="min-w-0 flex-1">
        {/* 类目/市场/平台 */}
        <div className="font-semibold text-sm text-gray-800 mb-1">
          {category} · {market} · {platform}
        </div>

        {/* 标题 */}
        {title ? (
          <div className="text-xs text-zinc-700 line-clamp-2 mb-2">
            <span className="font-semibold">标题：</span>
            {title}
          </div>
        ) : (
          <div className="text-xs text-zinc-400 mb-2">标题：—</div>
        )}

        {/* 元数据 */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>
            创建时间：{draft.created_at ? new Date(draft.created_at).toLocaleString('zh-CN') : '—'}
          </span>
          {draft.extract_provider && (
            <span>
              提取模型：{draft.extract_provider}
            </span>
          )}
          {draft.generate_provider && (
            <span>
              生成模型：{draft.generate_provider}
            </span>
          )}
          {typeof draft.estimated_cost === 'number' && (
            <span>
              成本：${draft.estimated_cost.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* 状态 + 操作 */}
      <div className="flex items-center gap-3 shrink-0">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>

        <button
          onClick={onReview}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          {draft.status === '待审核' ? '审核' : '查看'}
        </button>
      </div>
    </div>
  );
}
