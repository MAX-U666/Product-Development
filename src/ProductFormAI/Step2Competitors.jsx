// File: src/ProductFormAI/Step2Competitors.jsx

import React from "react";
import { Loader, AlertCircle } from "lucide-react";
import StepHeader from "./components/StepHeader";
import CompetitorCard from "./components/CompetitorCard";
import { providerLabel } from "./utils/helpers";

export default function Step2Competitors({
  step1Done,
  step2Done,
  competitors,
  extractedCount,
  aiConfig,
  updateCompetitor,
  resetCompetitorResult,
  setCompetitorMode,
  handlePickImages,
  clearImages,
  handleExtractOne,
}) {
  if (!step1Done) return null;

  return (
    <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5">
      <StepHeader
        step={2}
        title="竞品输入（支持链接 / 截图）"
        done={step2Done}
        subtitle="每个竞品二选一：A 链接提取；B 上传截图（最多3张）识图提取"
      />

      <div className="mt-5 grid gap-4">
        {competitors.map((c, idx) => (
          <div key={idx} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-zinc-900">竞品 {idx + 1}</div>

              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-700">
                  <input
                    type="radio"
                    name={`mode_${idx}`}
                    checked={c.mode === "url"}
                    onChange={() => setCompetitorMode(idx, "url")}
                  />
                  链接
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-700">
                  <input
                    type="radio"
                    name={`mode_${idx}`}
                    checked={c.mode === "image"}
                    onChange={() => setCompetitorMode(idx, "image")}
                  />
                  截图
                </label>
              </div>
            </div>

            {/* URL Mode */}
            {c.mode === "url" ? (
              <div className="mt-3">
                <div className="text-xs text-zinc-500">方式A：粘贴链接（Shopee/Amazon/TikTok 等）</div>
                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
                  placeholder="粘贴竞品链接"
                  value={c.url}
                  onChange={(e) => {
                    updateCompetitor(idx, { url: e.target.value });
                    resetCompetitorResult(idx);
                  }}
                />
              </div>
            ) : (
              /* Image Mode */
              <div className="mt-3">
                <div className="text-xs text-zinc-500">
                  方式B：上传截图（最多3张，建议：详情页/成分表/评价页）
                </div>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePickImages(idx, e.target.files)}
                    className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-800 hover:file:bg-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => clearImages(idx)}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    清空截图
                  </button>
                </div>

                <input
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
                  placeholder="可选提示：例如'这是商品详情页/成分表/评价页'"
                  value={c.hint || ""}
                  onChange={(e) => {
                    updateCompetitor(idx, { hint: e.target.value });
                    resetCompetitorResult(idx);
                  }}
                />

                {c.imagePreviews?.length ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {c.imagePreviews.map((src, i) => (
                      <div key={i} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                        <img src={src} alt={`preview_${idx}_${i}`} className="h-24 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-zinc-400">未选择截图</div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExtractOne(idx)}
                disabled={c.loading}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white",
                  c.loading ? "bg-zinc-400" : "bg-indigo-600 hover:bg-indigo-700",
                ].join(" ")}
              >
                {c.loading ? <Loader className="h-4 w-4 animate-spin" /> : null}
                🤖 AI提取
              </button>

              <div className="text-xs text-zinc-500">
                使用：<span className="font-semibold">{providerLabel(aiConfig.extract_provider)}</span>
              </div>
            </div>

            {/* Status */}
            <div className="mt-3">
              {c.loading ? (
                <div className="text-xs font-semibold text-zinc-600">
                  <Loader className="mr-2 inline h-4 w-4 animate-spin" />
                  提取中…（{c.mode === "url" ? "链接" : "截图"}）
                </div>
              ) : c.success ? (
                <div className="text-xs font-semibold text-emerald-700">
                  ✅ 使用 {providerLabel(c.providerUsed || aiConfig.extract_provider)} 提取成功
                </div>
              ) : c.error ? (
                <div className="text-xs font-semibold text-red-600">
                  <AlertCircle className="mr-1 inline h-4 w-4" />
                  {c.error}
                </div>
              ) : (
                <div className="text-xs text-zinc-400">等待提取</div>
              )}
            </div>

            {/* Result card */}
            {c.success && c.data ? (
              <div className="mt-4">
                <CompetitorCard item={c} aiConfig={aiConfig} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        当前进度：已提取 <span className="font-bold">{extractedCount}</span> 个竞品（至少需要 1 个）
      </div>

      {step2Done ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✅ Step 2 完成：已提取 {extractedCount} 个竞品
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          至少需要提取 1 个竞品后才能生成方案
        </div>
      )}
    </div>
  );
}
