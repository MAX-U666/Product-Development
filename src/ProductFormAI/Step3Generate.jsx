// File: src/ProductFormAI/Step3Generate.jsx

import React from "react";
import { Loader, Save } from "lucide-react";
import StepHeader from "./components/StepHeader";
import { providerLabel } from "./utils/helpers";

export default function Step3Generate({
  step2Done,
  step3Done,
  canGeneratePlan,
  planLoading,
  planResult,
  planProviderUsed,
  handleGeneratePlan,
  handleSaveDraft,
  savingDraft,
  formData,
  aiConfig,
  aiExplain,
}) {
  if (!step2Done) return null;

  return (
    <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5">
      <StepHeader
        step={3}
        title="AI 生成产品方案"
        done={step3Done}
        subtitle="生成后会出现渐变卡片，并自动填充到可编辑表单（Step 4）"
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-zinc-700">
          使用：<span className="font-semibold">{providerLabel(aiConfig.generate_provider)}</span>{" "}
          生成方案（可在右上角 AI 配置切换）
        </div>

        <button
          type="button"
          onClick={handleGeneratePlan}
          disabled={!canGeneratePlan}
          className={[
            "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white",
            canGeneratePlan ? "bg-emerald-600 hover:bg-emerald-700" : "bg-zinc-400",
          ].join(" ")}
        >
          {planLoading ? <Loader className="h-4 w-4 animate-spin" /> : null}
          生成产品方案
        </button>
      </div>

      {planLoading ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700">
          <Loader className="mr-2 inline h-4 w-4 animate-spin" />
          生成中…（可能需要 20–60 秒）
        </div>
      ) : null}

      {planResult ? (
        <div className="mt-5 rounded-3xl border border-emerald-200 bg-gradient-to-r from-green-50 to-blue-50 p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold text-zinc-900">AI 生成结果</div>
              <div className="mt-1 text-xs font-semibold text-emerald-700">
                ✅ 使用 {providerLabel(planProviderUsed || aiConfig.generate_provider)} 生成成功
              </div>
            </div>
            <div className="text-xs text-zinc-600">提示：下方 Step 4 可逐字段编辑，并保留 AI 置信度与理由</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-white/70 p-4">
              <div className="text-xs font-semibold text-zinc-600">自动填充字段预览</div>
              <div className="mt-2 space-y-2 text-sm text-zinc-900">
                <div>
                  <span className="text-zinc-500">标题：</span>
                  <span className="font-semibold">{formData.title || "—"}</span>
                </div>
                <div>
                  <span className="text-zinc-500">定价：</span>
                  <span className="font-semibold">{formData.pricing || "—"}</span>
                </div>
                <div>
                  <span className="text-zinc-500">定位：</span>
                  <span className="font-semibold">{formData.positioning || "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/70 p-4">
              <div className="text-xs font-semibold text-zinc-600">AI 置信度（示例）</div>
              <div className="mt-2 space-y-2 text-sm text-zinc-900">
                {Object.keys(aiExplain || {}).length ? (
                  Object.entries(aiExplain)
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-zinc-600">{k}</span>
                        {typeof v?.confidence === "number" ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                            {Math.round(v.confidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="text-xs text-zinc-500">
                    未提供 explanations 字段也没关系，你仍可在 Step 4 手动编辑。
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 保存草稿按钮 */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white/70 p-4">
            <div className="text-xs text-zinc-600">
              💡 <strong>可直接保存草稿</strong>，无需等待人工编辑。管理员审核通过后将自动创建正式产品。
            </div>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {savingDraft ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingDraft ? '保存中...' : '💾 保存草稿'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
