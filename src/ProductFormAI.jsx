import React, { useEffect, useMemo, useState } from "react";
import { X, Loader, CheckCircle, AlertCircle, Settings } from "lucide-react";
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
    return {
      extract_provider: parsed.extract_provider || "gemini",
      generate_provider: parsed.generate_provider || "claude",
    };
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
    mode: "url", // 'url' | 'image'
    url: "",
    images: [], // File[]
    imagePreviews: [], // string[]
    hint: "",
    loading: false,
    success: false,
    error: "",
    data: null,
    providerUsed: "",
  };
}

export default function ProductFormAI({ onClose, onSuccess, currentUser }) {
  // AI Config
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAIConfig] = useState(readAIConfig());

  // Steps State
  const [category, setCategory] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("");

  // ✅ 保留 3 个竞品输入框
  const [competitors, setCompetitors] = useState([
    makeEmptyCompetitor(),
    makeEmptyCompetitor(),
    makeEmptyCompetitor(),
  ]);

  // Plan generation
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planProviderUsed, setPlanProviderUsed] = useState("");

  // Manual review/edit form
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

  // AI explanations per field (note/confidence/reason)
  const [aiExplain, setAIExplain] = useState({});

  // Step completion checks
  const step1Done = useMemo(() => !!category && !!targetMarket && !!targetPlatform, [
    category,
    targetMarket,
    targetPlatform,
  ]);

  const extractedCount = useMemo(() => competitors.filter((c) => c.success).length, [competitors]);

  // ✅ 关键：只要 >=1 个竞品提取成功，就算 Step2 Done
  const step2Done = useMemo(() => step1Done && extractedCount >= 1, [step1Done, extractedCount]);
  const step3Done = useMemo(() => step2Done && !!planResult, [step2Done, planResult]);

  const updateCompetitor = (idx, patch) => {
    setCompetitors((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
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

  // ✅ 关键：生成方案只要求 >=1 个竞品成功
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
          ingredients: d?.ingredients || d?.main_ingredients || d?.mainIngredients || "",
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

      // ✅ 生成成功后：自动保存 AI 草稿（ai_drafts）
      try {
        await insertAIDraft({
          created_by: currentUser?.id || null,
          category,
          market: targetMarket,
          platform: targetPlatform,
          competitors: validCompetitors,
          plan: dataObj,
          status: "draft",
          created_at: getCurrentBeijingISO(),
        });
      } catch (e) {
        console.warn("save ai_draft failed:", e);
      }

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

  const handleSubmit = async () => {
    if (!currentUser?.id) {
      alert("当前用户信息缺失，请重新登录");
      return;
    }

    if (!formData.category || !formData.market || !formData.platform) {
      alert("请先完成：类目/市场/平台");
      return;
    }
    if (!formData.title) {
      alert("请填写产品标题（可先用 AI 方案生成再微调）");
      return;
    }

    try {
      const draftPayload = {
        developMonth: formData.developMonth,
        category: formData.category,
        market: formData.market,
        platform: formData.platform,

        positioning: formData.positioning,
        sellingPoint: formData.sellingPoint,
        ingredients: formData.ingredients,
        efficacy: formData.efficacy,
        volume: formData.volume,
        scent: formData.scent,
        color: formData.color,
        pricing: formData.pricing,
        title: formData.title,
        keywords: formData.keywords,
        packaging: formData.packaging,

        competitors: competitors
          .filter((c) => c.success && c.data)
          .map((c) => ({
            mode: c.mode,
            url: c.url || "",
            data: c.data || null,
            providerUsed: c.providerUsed || "",
          })),

        ai_config: aiConfig,
        ai_explain: aiExplain,
        plan_provider_used: planProviderUsed,
      };

      await withTimeout(
        insertAIDraft({
          status: "draft",
          category: formData.category,
          market: formData.market,
          platform: formData.platform,
          payload: draftPayload,                // ✅ 全量 JSON 一把梭
          created_by: currentUser?.id || null,  // ✅ 没有也行
        }),
        60000
      );

      alert("✅ 草稿已保存，可在「AI 草稿」里查看");
      onSuccess?.();  // 让外层刷新（如果你想）
      onClose?.();    // 保存后自动关闭（你不想关也可以删掉这一行）
    } catch (e) {
      const msg =
        String(e?.message || e) === "NETWORK_TIMEOUT"
          ? "网络超时：保存草稿失败，请稍后重试"
          : `保存草稿失败：${String(e?.message || "").slice(0, 200) || "请稍后重试"}`;
      alert(msg);
    }
  };
}
