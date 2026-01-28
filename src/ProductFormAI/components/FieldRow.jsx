// src/ProductFormAI/components/FieldRow.jsx
// 字段行组件 - 用于显示和编辑AI生成的字段

import React from "react";

export default function FieldRow({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  aiNote,
  aiConfidence,
  aiReason,
  readOnly = false,
  rows = 4,
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{label}</div>
          {aiNote ? (
            <div className="mt-1 text-xs text-zinc-600">
              <span className="font-semibold">💭 AI说明：</span>
              {aiNote}
            </div>
          ) : (
            <div className="mt-1 text-xs text-zinc-400">💭 AI说明：暂无</div>
          )}
        </div>

        {typeof aiConfidence === "number" ? (
          <div className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
            置信度 {Math.round(aiConfidence * 100)}%
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {multiline ? (
          <textarea
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2 disabled:bg-zinc-50 disabled:text-zinc-500 resize-none"
            rows={rows}
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={readOnly}
          />
        ) : (
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2 disabled:bg-zinc-50 disabled:text-zinc-500"
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={readOnly}
          />
        )}
      </div>

      {aiReason ? (
        <div className="mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          <span className="font-semibold">理由：</span>
          {aiReason}
        </div>
      ) : null}
    </div>
  );
}
