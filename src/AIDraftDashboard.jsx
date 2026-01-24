// src/AIDraftDashboard.jsx
import React, { useEffect, useState } from "react";
import { fetchAIDrafts } from "./api";
import DraftReviewModal from "./DraftReviewModal";

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
      alert("加载 AI 草稿失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4 text-lg font-semibold">🤖 AI 草稿箱</div>

      {loading ? (
        <div className="text-sm text-zinc-500">加载中…</div>
      ) : drafts.length === 0 ? (
        <div className="text-sm text-zinc-400">暂无 AI 草稿</div>
      ) : (
        <div className="grid gap-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between"
            >
              <div className="min-w-0">
                <div className="font-semibold text-sm">
                  {d.category} / {d.market} / {d.platform}
                </div>
                <div className="text-xs text-zinc-500">
                  创建时间：{new Date(d.created_at).toLocaleString()}
                </div>
                <div className="text-xs mt-1">
                  状态：
                  <span className="ml-1 font-semibold">
                    {d.status === "draft" ? "待审核" : d.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveDraft(d)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                审核
              </button>
            </div>
          ))}
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
