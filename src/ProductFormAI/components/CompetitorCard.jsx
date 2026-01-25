// File: src/ProductFormAI/components/CompetitorCard.jsx

import React from "react";
import { providerLabel } from "../utils/helpers";

export default function CompetitorCard({ item, aiConfig }) {
  const data = item.data || {};
  
  const name =
    data?.listing?.title ||
    data?.name ||
    data?.product_name ||
    data?.productName ||
    "（未识别名称）";

  const price =
    data?.listing?.price?.current ||
    data?.price ||
    data?.current_price ||
    data?.currentPrice ||
    "";

  const ingredients =
    data?.content?.keyIngredients ||
    data?.ingredients ||
    data?.main_ingredients ||
    data?.mainIngredients ||
    [];

  const efficacy =
    data?.positioning?.coreClaims ||
    data?.efficacy ||
    data?.claims ||
    data?.mainEfficacy ||
    [];

  const ingredientsText = Array.isArray(ingredients)
    ? ingredients.slice(0, 6).join("、")
    : String(ingredients || "");

  const efficacyText = Array.isArray(efficacy)
    ? efficacy.slice(0, 6).join("、")
    : String(efficacy || "");

  return (
    <div className="rounded-2xl border border-emerald-400 bg-emerald-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-900">{name}</div>
          <div className="mt-1 text-xs text-zinc-600">
            <span className="font-semibold">方式：</span>
            {item.mode === "url" ? "链接提取" : `截图提取（${item.images?.length || 0}张）`}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            <span className="font-semibold">价格：</span>
            {price ? `IDR ${price}` : "—"}
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-xs font-semibold text-emerald-700">
          ✅ {providerLabel(item.providerUsed || aiConfig?.extract_provider)}
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-zinc-700">
        <div className="rounded-xl bg-white/70 px-3 py-2">
          <span className="font-semibold">成分：</span>
          {ingredientsText || "—"}
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2">
          <span className="font-semibold">功效：</span>
          {efficacyText || "—"}
        </div>
      </div>
    </div>
  );
}
