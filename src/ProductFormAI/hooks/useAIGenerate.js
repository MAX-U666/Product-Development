// File: src/ProductFormAI/hooks/useAIGenerate.js

import { useState, useMemo, useCallback } from "react";
import { generateProductPlan } from "../../api";
import { withTimeout, safeJson } from "../utils/helpers";

export function useAIGenerate(
  category,
  targetMarket,
  targetPlatform,
  competitors,
  aiConfig,
  step1Done,
  extractedCount,
  setFormData,
  setAIExplain
) {
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planProviderUsed, setPlanProviderUsed] = useState("");

  const canGeneratePlan = useMemo(() => {
    if (!step1Done) return false;
    if (extractedCount < 1) return false;
    if (planLoading) return false;
    return true;
  }, [step1Done, extractedCount, planLoading]);

  const handleGeneratePlan = useCallback(async () => {
    if (!canGeneratePlan) return;

    const validCompetitors = competitors
      .filter((c) => c.success && c.data)
      .map((c) => ({
        input_mode: c.mode,
        url: c.mode === "url" ? c.url : "",
        extracted: c.data,
      }));

    setPlanLoading(true);
    setPlanResult(null);
    setPlanProviderUsed("");

    try {
      const payload = {
        category,
        market: targetMarket,
        platform: targetPlatform,
        competitors: validCompetitors,
        ai_config: aiConfig,
      };

      const result = await withTimeout(generateProductPlan(payload), 120000);

      if (!result?.success) {
        const msg = result?.message || "生成失败，请稍后重试";
        alert(msg);
        setPlanLoading(false);
        return;
      }

      const dataObj = safeJson(result.data) ?? result.data;
      if (!dataObj || typeof dataObj !== "object") {
        alert("AI 返回格式错误");
        setPlanLoading(false);
        return;
      }

      const providerUsed = result.provider || result.providerUsed || aiConfig.generate_provider || "unknown";
      setPlanProviderUsed(providerUsed);
      setPlanResult(dataObj);

      const draft = dataObj.plan || dataObj;
      const explanations = dataObj.explanations || dataObj.ai_explanations || {};

      setFormData((prev) => ({
        ...prev,
        category,
        market: targetMarket,
        platform: targetPlatform,
        positioning: draft.positioning || prev.positioning,
        sellingPoint: draft.sellingPoint || draft.selling_point || draft.coreSellingPoints || prev.sellingPoint,
        ingredients: draft.ingredients || draft.mainIngredients || prev.ingredients,
        efficacy: draft.efficacy || draft.mainEfficacy || draft.claims || prev.efficacy,
        volume: draft.volume || draft.volumeMl || prev.volume,
        scent: draft.scent || prev.scent,
        color: draft.color || draft.textureColor || prev.color,
        pricing: draft.pricing || draft.price || prev.pricing,
        title: draft.title || draft.productTitle || prev.title,
        keywords: Array.isArray(draft.keywords) ? draft.keywords.join(", ") : draft.keywords || prev.keywords,
        packaging: draft.packaging || draft.packagingRequirements || prev.packaging,
      }));

      setAIExplain(() => {
        const out = {};
        const get = (k) => explanations?.[k] || explanations?.[String(k || "").toLowerCase()] || null;

        const mapField = (fieldKey, aliasKeys = []) => {
          const cand = [fieldKey, ...aliasKeys].map((k) => get(k)).find((v) => v && typeof v === "object");
          if (!cand) return;
          out[fieldKey] = {
            note: cand.note || cand.desc || cand.summary || "",
            confidence:
              typeof cand.confidence === "number"
                ? cand.confidence
                : typeof cand.score === "number"
                ? cand.score
                : undefined,
            reason: cand.reason || cand.why || "",
          };
        };

        mapField("positioning", ["product_positioning"]);
        mapField("sellingPoint", ["selling_point", "coreSellingPoints"]);
        mapField("ingredients", ["mainIngredients"]);
        mapField("efficacy", ["mainEfficacy", "claims"]);
        mapField("volume", ["volumeMl"]);
        mapField("scent", ["fragrance"]);
        mapField("color", ["textureColor"]);
        mapField("pricing", ["price"]);
        mapField("title", ["productTitle"]);
        mapField("keywords", ["seoKeywords"]);
        mapField("packaging", ["packagingRequirements"]);

        return out;
      });

      setPlanLoading(false);
    } catch (e) {
      const msg =
        String(e?.message || e) === "NETWORK_TIMEOUT"
          ? "网络超时：生成时间较长，请稍后重试"
          : "生成失败：请稍后重试";
      alert(msg);
      setPlanLoading(false);
    }
  }, [canGeneratePlan, competitors, category, targetMarket, targetPlatform, aiConfig, setFormData, setAIExplain]);

  return {
    planLoading,
    planResult,
    planProviderUsed,
    canGeneratePlan,
    handleGeneratePlan,
  };
}
