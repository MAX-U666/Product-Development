// src/DraftReviewModal.jsx
import React, { useState } from "react";
import { X } from "lucide-react";
import { updateAIDraftStatus } from "./api";

export default function DraftReviewModal({ draft, onClose, onReviewed, currentUser }) {
  const [loading, setLoading] = useState(false);
  const plan = draft.plan?.plan || draft.plan || {};

  const handleAction = async (action) => {
    setLoading(true);
    try {
      await updateAIDraftStatus(
        draft.id,
        action,
        currentUser?.id || null,
        ""
      );
      onReviewed();
    } catch (e) {
      alert("操作失败");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">📝 AI 草稿审核</div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto text-sm space-y-2">
          <div><b>定位：</b>{plan.positioning}</div>
          <div><b>卖点：</b>{plan.sellingPoint}</div>
          <div><b>成分：</b>{plan.ingredients}</div>
          <div><b>功效：</b>{plan.efficacy}</div>
          <div><b>容量：</b>{plan.volume}</div>
          <div><b>定价：</b>{plan.pricing}</div>
          <div><b>标题：</b>{plan.title}</div>
          <div><b>关键词：</b>{plan.keywords}</div>
          <div><b>包装：</b>{plan.packaging}</div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            disabled={loading}
            onClick={() => handleAction("rejected")}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            驳回
          </button>
          <button
            disabled={loading}
            onClick={() => handleAction("approved")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            通过
          </button>
        </div>
      </div>
    </div>
  );
}
