// File: src/ProductFormAI/Step1Basic.jsx

import React from "react";
import { AlertCircle } from "lucide-react";
import StepHeader from "./components/StepHeader";
import { CATEGORIES, MARKETS, PLATFORMS } from "./utils/constants";

export default function Step1Basic({
  category,
  setCategory,
  targetMarket,
  setTargetMarket,
  targetPlatform,
  setTargetPlatform,
  step1Done,
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
      <StepHeader
        step={1}
        title="基本信息"
        done={step1Done}
        subtitle="选择：类目 / 市场 / 平台（完成后才会出现 Step 2）"
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Category */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">类目</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold transition",
                  category === c
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Market */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">市场</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {MARKETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTargetMarket(m)}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold transition",
                  targetMarket === m
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                ].join(" ")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-sm font-semibold text-zinc-900">平台</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTargetPlatform(p)}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-semibold transition",
                  targetPlatform === p
                    ? "bg-indigo-600 text-white"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {step1Done ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✅ Step 1 完成：已选择 {category} / {targetMarket} / {targetPlatform}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          请选择类目、市场、平台后继续
        </div>
      )}
    </div>
  );
}
