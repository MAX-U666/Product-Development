// src/DraftReviewModal.jsx
import React, { useState } from "react";
import { X, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { updateAIDraftStatus, createProductFromDraft } from "./api";

export default function DraftReviewModal({ draft, onClose, onReviewed, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState('');

  // ✅ 修复：直接从表字段读取
  const category = draft.category || '';
  const market = draft.market || '';
  const platform = draft.platform || '';
  const positioning = draft.positioning || '';
  const sellingPoint = draft.selling_point || draft.sellingPoint || '';
  const ingredients = draft.ingredients || '';
  const efficacy = draft.efficacy || '';
  const volume = draft.volume || '';
  const scent = draft.scent || '';
  const color = draft.texture_color || draft.color || '';
  const pricing = draft.pricing || '';
  const title = draft.title || '';
  const keywords = draft.keywords || '';
  const packaging = draft.packaging_requirements || draft.packaging || '';

  // ✅ 审核通过 + 创建产品
  const handleApprove = async () => {
    if (!confirm('确定通过审核并创建产品吗？')) return;

    setLoading(true);
    try {
      // 1. 更新草稿状态为"已通过"
      await updateAIDraftStatus(draft.id, '已通过', currentUser?.id || null, reviewComment || '审核通过');

      // 2. 创建正式产品
      await createProductFromDraft(draft.id, currentUser?.id || null);

      alert('✅ 审核通过！产品已创建，可在「全部产品」中查看');
      onReviewed?.();
    } catch (error) {
      alert('操作失败：' + (error?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // ✅ 审核拒绝
  const handleReject = async () => {
    if (!reviewComment.trim()) {
      alert('请填写拒绝原因');
      return;
    }

    if (!confirm('确定拒绝这个草稿吗？')) return;

    setLoading(true);
    try {
      await updateAIDraftStatus(draft.id, '已拒绝', currentUser?.id || null, reviewComment);
      alert('✅ 草稿已拒绝');
      onReviewed?.();
    } catch (error) {
      alert('操作失败：' + (error?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative z-10 w-[92vw] max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-6 py-4 shrink-0">
          <div>
            <div className="text-xl font-bold text-gray-800">📝 审核 AI 草稿</div>
            <div className="text-sm text-gray-500 mt-1">
              {category} · {market} · {platform}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body - 可滚动 */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* AI 元数据 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">📊 AI 生成信息</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              <div>
                <span className="font-medium">提取模型：</span>
                {draft.extract_provider || '—'}
              </div>
              <div>
                <span className="font-medium">生成模型：</span>
                {draft.generate_provider || '—'}
              </div>
              <div>
                <span className="font-medium">算力成本：</span>
                ${typeof draft.estimated_cost === 'number' ? draft.estimated_cost.toFixed(4) : '0.0000'}
              </div>
              <div>
                <span className="font-medium">创建时间：</span>
                {draft.created_at ? new Date(draft.created_at).toLocaleString('zh-CN') : '—'}
              </div>
            </div>
          </div>

          {/* 产品方案内容 */}
          <div className="space-y-4">
            <FieldDisplay label="产品标题" value={title} />
            <FieldDisplay label="产品定位" value={positioning} multiline />
            <FieldDisplay label="核心卖点" value={sellingPoint} multiline />
            <FieldDisplay label="主要成分" value={ingredients} />
            <FieldDisplay label="主打功效" value={efficacy} />
            
            <div className="grid grid-cols-2 gap-4">
              <FieldDisplay label="容量规格" value={volume} />
              <FieldDisplay label="香味" value={scent} />
              <FieldDisplay label="料体颜色" value={color} />
              <FieldDisplay label="定价策略" value={pricing} />
            </div>

            <FieldDisplay label="搜索关键词" value={keywords} />
            <FieldDisplay label="包装设计需求" value={packaging} multiline />
          </div>

          {/* 竞品数据（如果有） */}
          {draft.competitors_data && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                📦 查看竞品数据 ({Array.isArray(draft.competitors_data) ? draft.competitors_data.length : 0}个)
              </summary>
              <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(draft.competitors_data, null, 2)}
              </pre>
            </details>
          )}

          {/* 审核意见（仅拒绝时显示） */}
          {draft.status === '待审核' && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                审核意见（拒绝时必填）：
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="请填写审核意见或修改建议..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                rows="3"
              />
            </div>
          )}

          {/* 已审核信息 */}
          {draft.status !== '待审核' && (
            <div className={`mt-6 rounded-xl p-4 border ${
              draft.status === '已通过' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {draft.status === '已通过' ? (
                  <CheckCircle size={20} className="text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1">
                  <div className={`text-sm font-semibold mb-1 ${
                    draft.status === '已通过' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {draft.status === '已通过' ? '✅ 已通过审核' : '❌ 已拒绝'}
                  </div>
                  {draft.review_comment && (
                    <div className={`text-sm ${
                      draft.status === '已通过' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <span className="font-medium">审核意见：</span>
                      {draft.review_comment}
                    </div>
                  )}
                  {draft.reviewed_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      审核时间：{new Date(draft.reviewed_at).toLocaleString('zh-CN')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - 操作按钮 */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            关闭
          </button>

          {draft.status === '待审核' && (
            <>
              <button
                onClick={handleReject}
                disabled={loading}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle size={18} />
                {loading ? '处理中...' : '拒绝'}
              </button>

              <button
                onClick={handleApprove}
                disabled={loading}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={18} />
                {loading ? '处理中...' : '通过并创建产品'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ 字段展示组件
function FieldDisplay({ label, value, multiline = false }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      {multiline ? (
        <div className="text-sm text-gray-900 whitespace-pre-wrap">{value || '—'}</div>
      ) : (
        <div className="text-sm text-gray-900">{value || '—'}</div>
      )}
    </div>
  );
}
