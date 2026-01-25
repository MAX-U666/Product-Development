// File: src/ProductFormAI/hooks/useCompetitors.js

import { useState, useMemo, useCallback } from "react";
import { extractCompetitorInfo } from "../../api";
import { withTimeout, fileToDataUrl, safeJson, makeEmptyCompetitor } from "../utils/helpers";

export function useCompetitors(aiConfig) {
  const [competitors, setCompetitors] = useState([
    makeEmptyCompetitor(),
    makeEmptyCompetitor(),
    makeEmptyCompetitor(),
  ]);

  const extractedCount = useMemo(() => 
    competitors.filter((c) => c.success).length, 
    [competitors]
  );

  const updateCompetitor = useCallback((idx, patch) => {
    setCompetitors((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }, []);

  const resetCompetitorResult = useCallback((idx) => {
    updateCompetitor(idx, { success: false, error: "", data: null, providerUsed: "" });
  }, [updateCompetitor]);

  const setCompetitorMode = useCallback((idx, mode) => {
    setCompetitors((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        return {
          ...c,
          mode,
          url: mode === "url" ? c.url || "" : "",
          images: mode === "image" ? c.images || [] : [],
          imagePreviews: mode === "image" ? c.imagePreviews || [] : [],
          hint: c.hint || "",
          loading: false,
          success: false,
          error: "",
          data: null,
          providerUsed: "",
        };
      })
    );
  }, []);

  const handlePickImages = useCallback(async (idx, filesLike) => {
    const files = Array.from(filesLike || []).filter((f) => 
      f && String(f.type || "").startsWith("image/")
    );
    if (files.length === 0) return;

    const sliced = files.slice(0, 3);
    const previews = sliced.map((f) => URL.createObjectURL(f));

    try {
      (competitors[idx]?.imagePreviews || []).forEach((u) => URL.revokeObjectURL(u));
    } catch {}

    updateCompetitor(idx, { images: sliced, imagePreviews: previews });
    resetCompetitorResult(idx);
  }, [competitors, updateCompetitor, resetCompetitorResult]);

  const clearImages = useCallback((idx) => {
    try {
      (competitors[idx]?.imagePreviews || []).forEach((u) => URL.revokeObjectURL(u));
    } catch {}
    updateCompetitor(idx, { images: [], imagePreviews: [] });
    resetCompetitorResult(idx);
  }, [competitors, updateCompetitor, resetCompetitorResult]);

  const handleExtractOne = useCallback(async (idx) => {
    const item = competitors[idx];

    if (item.mode === "url") {
      const url = (item.url || "").trim();
      if (!url) {
        alert("请先输入竞品链接");
        return;
      }
    } else {
      if (!item.images || item.images.length === 0) {
        alert("请先上传截图（最多3张）");
        return;
      }
    }

    updateCompetitor(idx, { loading: true, error: "" });

    try {
      let input;
      if (item.mode === "url") {
        input = (item.url || "").trim();
      } else {
        const dataUrls = await Promise.all(item.images.slice(0, 3).map(fileToDataUrl));
        input = {
          mode: "image",
          images: item.images.slice(0, 3).map((f, i) => ({
            name: f.name || `screenshot_${i + 1}.png`,
            type: f.type || "image/png",
            dataUrl: dataUrls[i],
          })),
          hint: (item.hint || "").trim(),
        };
      }

      const result = await withTimeout(extractCompetitorInfo(input, aiConfig), 90000);

      if (!result?.success) {
        const msg = result?.message || result?.error || "提取失败，请稍后重试";
        updateCompetitor(idx, { loading: false, success: false, error: msg });
        alert(msg);
        return;
      }

      const dataObj = safeJson(result.data) ?? result.data;
      if (!dataObj || typeof dataObj !== "object") {
        updateCompetitor(idx, { loading: false, success: false, error: "AI 返回格式错误" });
        alert("AI 返回格式错误");
        return;
      }

      const providerUsed = result.provider || result.providerUsed || aiConfig.extract_provider || "unknown";

      updateCompetitor(idx, {
        loading: false,
        success: true,
        error: "",
        data: dataObj,
        providerUsed,
      });
    } catch (e) {
      const msg =
        String(e?.message || e) === "NETWORK_TIMEOUT"
          ? "网络超时：请检查网络或稍后重试"
          : `提取失败：${String(e?.message || "").slice(0, 120) || "请稍后重试"}`;
      updateCompetitor(idx, { loading: false, success: false, error: msg });
      alert(msg);
    }
  }, [competitors, aiConfig, updateCompetitor]);

  return {
    competitors,
    extractedCount,
    updateCompetitor,
    resetCompetitorResult,
    setCompetitorMode,
    handlePickImages,
    clearImages,
    handleExtractOne,
  };
}
