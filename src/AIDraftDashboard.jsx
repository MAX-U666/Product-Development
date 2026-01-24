// src/AIDraftDashboard.jsx
import React, { useEffect, useState } from "react";
import { fetchAIDrafts } from "./api";
import DraftReviewModal from "./DraftReviewModal";

function safeGet(obj, path, fallback = "") {
  try {
    const parts = String(path).split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return fallback;
      cur = cur[p];
    }
    return cur ?? fallback;
  } catch {
    return fallback;
  }
}

function pickDraftMeta(d) {
  // ✅ 兼容：你把草稿正文放在 ai_explanations.draft
  const draft = d?.ai_explanations?.draft || {};

  const category = draft.category || d.category || "";
  const market = draft.market || d.market || "";
  const platform = draft.platform || d.platform || "";

  // ✅ 标题优先：draft.title
  const title = draft.title || d.title || "";

  // ✅ 兜底：如果都没有，给个占位
  const header = [category, market, platform].filter(Boolean).join(" / ") || "（未写基础信息）";

  return { draft, category, market, platform, title, header };
}

function formatStatus(s) {
  // ✅ 你表里 status 是中文枚举默认“待审核”
  if (!s) return "待审核";
  if (s === "draft") return "待审核"; // 兼容老数据
  return s;
}

export default function AIDraftDashboard({ currentUser }) {
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

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold">🤖 AI 草稿箱</div>
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
        <div className="text-sm text-zinc-400">暂无 AI 草稿</div>
      ) : (
        <div className="grid gap-3">
          {drafts.map((d) => {
            const { header, title } = pickDraftMeta(d);

            return (
              <div
                key={d.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{header}</div>

                  {title ? (
                    <div className="mt-1 text-xs text-zinc-700 line-clamp-2">
                      <span className="font-semibold">标题：</span>
                      {title}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-zinc-400">标题：—</div>
                  )}

                  <div className="mt-1 text-xs text-zinc-500">
                    创建时间：{d.created_at ? new Date(d.created_at).toLocaleString() : "—"}
                  </div>

                  <div className="text-xs mt-1">
                    状态：
                    <span className="ml-1 font-semibold">{formatStatus(d.status)}</span>
                  </div>

                  {/* 可选：显示创建人 */}
                  <div className="text-xs mt-1 text-zinc-400">
                    created_by：{d.created_by ?? "—"}
                  </div>
                </div>

                <button
                  onClick={() => setActiveDraft(d)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  审核
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeDraft && (
        <DraftReviewModal
          draft={activeDraft}
          currentUser={currentUser}
          onClose={() => setActiveDraft(null)}
          onReviewed={() => {
            setActiveDraft(null);
            load();
          }}
        />
      )}
    </div>
  );
}
