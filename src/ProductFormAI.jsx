// File: src/ProductFormAI.jsx
import React, { useEffect, useMemo, useState } from "react";
import { X, Loader, CheckCircle, AlertCircle, Settings, Save } from "lucide-react";
import AIConfigModal from "./AIConfigModal";
import { extractCompetitorInfo, generateProductPlan, insertAIDraft } from "./api";
import { getCurrentBeijingISO } from "./timeConfig";

const STORAGE_KEY = "ai_config";

const CATEGORIES = ["洗发水", "沐浴露", "身体乳", "护发素", "弹力素", "护手霜"];
const MARKETS = ["美国", "印尼", "东南亚", "欧洲"];
const PLATFORMS = ["Amazon", "TikTok", "Shopee", "Lazada"];

const PROVIDER_META = {
  gemini: { label: "Gemini" },
  claude: { label: "Claude" },
  gpt4: { label: "GPT-4" },
  qwen: { label: "Qwen(千问)" },
  volcengine: { label: "VolcEngine(火山)" },
  deepseek: { label: "DeepSeek" },
  ark: { label: "Ark(火山)" },
};

const providerLabel = (p) => PROVIDER_META?.[p]?.label || String(p || "Unknown");

const readAIConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { extract_provider: "gemini", generate_provider: "claude" };
    const parsed = JSON.parse(raw);

    const extract_provider =
      parsed.extract_provider ||
      parsed.extractProvider ||
      parsed.extract_provider_name ||
      "gemini";

    const generate_provider =
      parsed.generate_provider ||
      parsed.planProvider ||
      parsed.generateProvider ||
      parsed.generate_provider_name ||
      "claude";

    return { extract_provider, generate_provider };
  } catch {
    return { extract_provider: "gemini", generate_provider: "claude" };
  }
};

const safeJson = (maybe) => {
  if (maybe == null) return null;
  if (typeof maybe === "object") return maybe;
  if (typeof maybe === "string") {
    try {
      return JSON.parse(maybe);
    } catch {
      return null;
    }
  }
  return null;
};

const withTimeout = async (promise, ms = 60000) => {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error("NETWORK_TIMEOUT")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("FILE_READ_FAIL"));
    reader.readAsDataURL(file);
  });

const FieldRow = ({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  aiNote,
  aiConfidence,
  aiReason,
}) => {
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
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
            rows={4}
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
            value={value || ""}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
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
};

function makeEmptyCompetitor() {
  return {
    mode: "url",
    url: "",
    images: [],
    imagePreviews: [],
    hint: "",
    loading: false,
    success: false,
    error: "",
    data: null,
    providerUsed: "",
  };
}

export default function ProductFormAI({ onClose, onSuccess, currentUser }) {
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAIConfig] = useState(readAIConfig());

  const [category, setCategory] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("");

  const [competitors, setCompetitors] = useState([
    makeEmptyCompetitor(),
    makeEmptyCompetitor(),
    makeEmptyCompetitor(),
  ]);

  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planProviderUsed, setPlanProviderUsed] = useState("");

  // ✅ 新增：保存草稿状态
  const [savingDraft, setSavingDraft] = useState(false);

  const [formData, setFormData] = useState({
    developMonth: new Date().toISOString().slice(0, 7),
    category: "",
    market: "",
    platform: "",
    positioning: "",
    sellingPoint: "",
    ingredients: "",
    efficacy: "",
    volume: "",
    scent: "",
    color: "",
    pricing: "",
    title: "",
    keywords: "",
    packaging: "",
  });

  const [aiExplain, setAIExplain] = useState({});

  const step1Done = useMemo(() => !!category && !!targetMarket && !!targetPlatform, [
    category,
    targetMarket,
    targetPlatform,
  ]);

  const extractedCount = useMemo(() => competitors.filter((c) => c.success).length, [competitors]);
  const step2Done = useMemo(() => step1Done && extractedCount >= 1, [step1Done, extractedCount]);
  const step3Done = useMemo(() => step2Done && !!planResult, [step2Done, planResult]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      category: category || prev.category,
      market: targetMarket || prev.market,
      platform: targetPlatform || prev.platform,
    }));
  }, [category, targetMarket, targetPlatform]);

  useEffect(() => {
    return () => {
      try {
        competitors.forEach((c) => (c.imagePreviews || []).forEach((u) => URL.revokeObjectURL(u)));
      } catch {}
    };
  }, []);

  const currentAIComboText = useMemo(() => {
    return `${providerLabel(aiConfig.extract_provider)} / ${providerLabel(aiConfig.generate_provider)}`;
  }, [aiConfig]);

  const updateCompetitor = (idx, patch) => {
    setCompetitors((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const resetCompetitorResult = (idx) => {
    updateCompetitor(idx, { success: false, error: "", data: null, providerUsed: "" });
  };

  const setCompetitorMode = (idx, mode) => {
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
  };

  const handlePickImages = async (idx, filesLike) => {
    const files = Array.from(filesLike || []).filter((f) => f && String(f.type || "").startsWith("image/"));
    if (files.length === 0) return;

    const sliced = files.slice(0, 3);
    const previews = sliced.map((f) => URL.createObjectURL(f));

    try {
      (competitors[idx]?.imagePreviews || []).forEach((u) => URL.revokeObjectURL(u));
    } catch {}

    updateCompetitor(idx, { images: sliced, imagePreviews: previews });
    resetCompetitorResult(idx);
  };

  const clearImages = (idx) => {
    try {
      (competitors[idx]?.imagePreviews || []).forEach((u) => URL.revokeObjectURL(u));
    } catch {}
    updateCompetitor(idx, { images: [], imagePreviews: [] });
    resetCompetitorResult(idx);
  };

  const handleExtractOne = async (idx) => {
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
  };

  const canGeneratePlan = useMemo(() => {
    if (!step1Done) return false;
    if (extractedCount < 1) return false;
    if (planLoading) return false;
    return true;
  }, [step1Done, extractedCount, planLoading]);

  const handleGeneratePlan = async () => {
    if (!canGeneratePlan) return;

    const validCompetitors = competitors
      .filter((c) => c.success && c.data)
      .slice(0, 3)
      .map((c) => {
        const d = c.data || {};
        return {
          name: d?.name || d?.product_name || d?.productName || d?.listing?.title || "",
          price: d?.price || d?.current_price || d?.currentPrice || d?.listing?.price?.current || "",
          ingredients: d?.ingredients || d?.main_ingredients || d?.mainIngredients || d?.content?.keyIngredients || "",
          benefits: Array.isArray(d?.benefits)
            ? d.benefits
            : Array.isArray(d?.claims)
            ? d.claims
            : Array.isArray(d?.positioning?.coreClaims)
            ? d.positioning.coreClaims
            : [],
          source_url: d?.source_url || (c.mode === "url" ? (c.url || "") : ""),
        };
      })
      .filter((x) => x.name || x.price || x.ingredients || (x.benefits || []).length);

    if (validCompetitors.length < 1) {
      alert("需要至少 1 个提取成功且有内容的竞品");
      return;
    }

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
        const msg = result?.message || result?.error || "生成失败，请稍后重试";
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
          : `生成失败：${String(e?.message || "").slice(0, 160) || "请稍后重试"}`;
      alert(msg);
      setPlanLoading(false);
    }
  };

  // ✅ 新增：保存草稿函数
  const handleSaveDraft = async () => {
    if (!currentUser?.id) {
      alert("当前用户信息缺失，请重新登录");
      return;
    }

    if (!formData.title) {
      alert("请至少填写产品标题后再保存草稿");
      return;
    }

    setSavingDraft(true);
    try {
      // ✅ 估算成本
      let estimatedCost = 0;
      competitors.forEach(c => {
        if (c.success) {
          estimatedCost += c.mode === 'image' ? 0.002 : 0.0005;
        }
      });
      if (planResult) {
        if (aiConfig.generate_provider === 'claude') estimatedCost += 0.015;
        else if (aiConfig.generate_provider === 'gpt4') estimatedCost += 0.02;
        else estimatedCost += 0.001;
      }

      // ✅ 对齐后端表结构：平铺字段
      await insertAIDraft({
        develop_month: formData.developMonth,
        category: formData.category,
        market: formData.market,
        platform: formData.platform,
        
        positioning: formData.positioning || null,
        selling_point: formData.sellingPoint || null,
        ingredients: formData.ingredients || null,
        efficacy: formData.efficacy || null,
        volume: formData.volume || null,
        scent: formData.scent || null,
        texture_color: formData.color || null,
        pricing: formData.pricing || null,
        title: formData.title || null,
        keywords: formData.keywords || null,
        packaging_requirements: formData.packaging || null,
        
        extract_provider: aiConfig.extract_provider,
        generate_provider: aiConfig.generate_provider,
        competitors_data: competitors
          .filter((c) => c.success && c.data)
          .map((c) => ({
            mode: c.mode,
            url: c.url || "",
            data: c.data || null,
            providerUsed: c.providerUsed || "",
          })),
        ai_explanations: aiExplain,
        estimated_cost: estimatedCost,
        
        status: '待审核',
        created_by: currentUser.id,
        created_at: getCurrentBeijingISO(),
      });

      alert('✅ AI 草稿已保存！\n\n请前往「🤖 AI 草稿」Tab 进行审核');
      onSuccess?.();
      onClose?.();
    } catch (e) {
      const msg = String(e?.message || e) === "NETWORK_TIMEOUT"
        ? "网络超时：保存草稿失败，请稍后重试"
        : `保存草稿失败：${String(e?.message || "").slice(0, 200) || "请稍后重试"}`;
      alert(msg);
    } finally {
      setSavingDraft(false);
    }
  };

  const StepHeader = ({ step, title, done, subtitle }) => (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            {step}
          </div>
          <div className="text-base font-semibold text-zinc-900">{title}</div>
          {done ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : null}
        </div>
        {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
      </div>
    </div>
  );

  const CompetitorCard = ({ item }) => {
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
            ✅ {providerLabel(item.providerUsed || aiConfig.extract_provider)}
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-zinc-50 shadow-2xl">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-zinc-900">AI 辅助创建产品</div>
            <div className="mt-1 text-xs text-zinc-500">
              Step-by-step：先定类目/市场/平台 → 提取至少 1 个竞品（最多 3 个）→ 生成方案 → 保存草稿
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAIConfig(true)}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              title="AI 配置"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">AI 配置</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                {currentAIComboText}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[82vh] overflow-y-auto px-5 py-5">
          {/* Step 1 */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-5">
            <StepHeader
              step={1}
              title="基本信息"
              done={step1Done}
              subtitle="选择：类目 / 市场 / 平台（完成后才会出现 Step 2）"
            />

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
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

          {/* Step 2 */}
          {step1Done ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5">
              <StepHeader
                step={2}
                title="竞品输入（至少 1 个，支持链接 / 截图）"
                done={step2Done}
                subtitle="最多可提取 3 个竞品，但只需要提取成功 ≥ 1 个，就可以生成产品方案。"
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
                          placeholder="可选提示：例如"这是商品详情页/成分表/评价页""
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

                    {c.success && c.data ? (
                      <div className="mt-4">
                        <CompetitorCard item={c} />
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
                  需要至少提取 1 个竞品后才能生成方案（当前已提取 {extractedCount} 个）
                </div>
              )}
            </div>
          ) : null}

          {/* Step 3 */}
          {step2Done ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5">
              <StepHeader
                step={3}
                title="AI 生成产品方案"
                done={step3Done}
                subtitle="生成后可直接保存草稿，等待管理员审核"
              />

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-zinc-700">
                  使用：<span className="font-semibold">{providerLabel(aiConfig.generate_provider)}</span> 生成方案
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

              {/* ✅ 关键修改：生成成功后显示保存草稿按钮 */}
              {planResult ? (
                <div className="mt-5 rounded-3xl border border-emerald-200 bg-gradient-to-r from-green-50 to-blue-50 p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-semibold text-zinc-900">✅ AI 生成成功</div>
                        <div className="mt-1 text-xs font-semibold text-emerald-700">
                          使用 {providerLabel(planProviderUsed || aiConfig.generate_provider)}
                        </div>
                      </div>

                      {/* ✅ 保存草稿按钮 */}
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft}
                        className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingDraft ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {savingDraft ? '保存中...' : '保存草稿'}
                      </button>
                    </div>

                    {/* 简要预览 */}
                    <div className="grid gap-2 text-sm">
                      <div className="rounded-xl bg-white/70 px-3 py-2">
                        <span className="font-semibold">标题：</span>
                        {formData.title || '—'}
                      </div>
                      <div className="rounded-xl bg-white/70 px-3 py-2">
                        <span className="font-semibold">定位：</span>
                        {formData.positioning || '—'}
                      </div>
                      <div className="rounded-xl bg-white/70 px-3 py-2">
                        <span className="font-semibold">卖点：</span>
                        {formData.sellingPoint?.slice(0, 100) || '—'}
                        {formData.sellingPoint?.length > 100 ? '...' : ''}
                      </div>
                    </div>

                    <div className="text-xs text-zinc-600 bg-white/70 rounded-xl px-3 py-2">
                      💡 提示：保存后草稿会进入「🤖 AI 草稿」Tab，状态为"待审核"，管理员审核通过后将自动创建正式产品
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* AI Config Modal */}
        <AIConfigModal
          isOpen={showAIConfig}
          onClose={() => setShowAIConfig(false)}
          onSave={(cfg) => {
            const mapped = {
              extract_provider: cfg.extractProvider || cfg.extract_provider || "gemini",
              generate_provider: cfg.planProvider || cfg.generate_provider || "claude",
            };
            setAIConfig(mapped);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            } catch {}
          }}
        />
      </div>
    </div>
  );
}
