// File: src/ProductFormAI.jsx
import React, { useEffect, useMemo, useState } from "react";
import { X, Loader, CheckCircle, AlertCircle, Settings, Save } from "lucide-react";
import AIConfigModal from "./AIConfigModal";
import { extractCompetitorInfo, generateProductPlan, insertData, insertAIDraft } from "./api";
import { getCurrentBeijingISO } from "./timeConfig";

/**
 * ProductFormAI
 * -------------
 * 一个全新的 AI 辅助创建产品表单（分步垂直堆叠）
 *
 * ✅ 本版升级点：
 * 1) Provider 扩展：Gemini / Claude / GPT-4 + Qwen(千问) / VolcEngine(火山) / DeepSeek
 * 2) 竞品提取支持两种方式：
 *    - 方式A：粘贴链接 → AI 提取
 *    - 方式B：上传截图（最多3张）→ AI 识图提取
 *
 * 重要说明（给后端对齐）：
 * - 这里仍然调用同一个 API：extractCompetitorInfo(input, aiConfig)
 * - input 可能是：
 *   - string URL
 *   - { mode:'image', images:[{name,type,dataUrl}], hint?:string }
 * 后端只需要根据 input 类型分支处理即可。
 */

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
};

const providerLabel = (p) => PROVIDER_META?.[p]?.label || String(p || "Unknown");

const readAIConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { extract_provider: "gemini", generate_provider: "claude" };
    const parsed = JSON.parse(raw);

    // 兼容 AIConfigModal 的字段
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

export default function ProductFormAI({ onClose, onSuccess, currentUser }) {
  // AI Config
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAIConfig] = useState(readAIConfig());

  // Steps State
  const [category, setCategory] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("");

  // 3 competitors
  const [competitors, setCompetitors] = useState([
    {
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
    },
    {
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
    },
    {
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
    },
  ]);

  // Plan generation
  const [planLoading, setPlanLoading] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planProviderUsed, setPlanProviderUsed] = useState("")

  // ✅ 新增：保存草稿状态
  const [savingDraft, setSavingDraft] = useState(false);

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
  const step2Done = useMemo(() => step1Done && extractedCount >= 1, [step1Done, extractedCount]);
  const step3Done = useMemo(() => step2Done && !!planResult, [step2Done, planResult]);

  // Keep formData in sync for base fields
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      category: category || prev.category,
      market: targetMarket || prev.market,
      platform: targetPlatform || prev.platform,
    }));
  }, [category, targetMarket, targetPlatform]);

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
    updateCompetitor(idx, {
      mode,
      url: mode === "url" ? competitors[idx]?.url || "" : "",
      images: mode === "image" ? competitors[idx]?.images || [] : [],
      imagePreviews: mode === "image" ? competitors[idx]?.imagePreviews || [] : [],
      hint: competitors[idx]?.hint || "",
      loading: false,
      success: false,
      error: "",
      data: null,
      providerUsed: "",
    });
  };

  const handlePickImages = async (idx, filesLike) => {
    const files = Array.from(filesLike || []).filter((f) => f && String(f.type || "").startsWith("image/"));
    if (files.length === 0) return;

    const sliced = files.slice(0, 3); // 每个竞品最多3张
    const previews = sliced.map((f) => URL.createObjectURL(f));

    // 清理旧预览
    try {
      (competitors[idx]?.imagePreviews || []).forEach((u) => URL.revokeObjectURL(u));
    } catch {
      // ignore
    }

    updateCompetitor(idx, { images: sliced, imagePreviews: previews });
    resetCompetitorResult(idx);
  };

  const clearImages = (idx) => {
    try {
      (competitors[idx]?.imagePreviews || []).forEach((u) => URL.revokeObjectURL(u));
    } catch {
      // ignore
    }
    updateCompetitor(idx, { images: [], imagePreviews: [] });
    resetCompetitorResult(idx);
  };

  const handleExtractOne = async (idx) => {
    const item = competitors[idx];

    // 校验输入
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
          hint: (item.hint || "").trim(), // 可选：你可让用户写'这是商品详情页/成分表/评价页'
        };
      }

      // 统一调用：后端根据 input 类型分支处理
      const result = await withTimeout(extractCompetitorInfo(input, aiConfig), 90000);

      if (!result?.success) {
        const msg = result?.message || "提取失败，请稍后重试";
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
          : "提取失败：请稍后重试";
      updateCompetitor(idx, { loading: false, success: false, error: msg });
      alert(msg);
    }
  };

  const canGeneratePlan = useMemo(() => {
    if (!step1Done) return false;
    if (extractedCount < 1) return false;  // ✅ 改为：至少 1 个
    if (planLoading) return false;
    return true;
  }, [step1Done, extractedCount, planLoading]);

  const handleGeneratePlan = async () => {
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

      const draft = dataObj.plan || dataObj; // 兼容 plan 包裹
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
  };

  // ✅ 新增：保存草稿函数
  const handleSaveDraft = async () => {
    // ✅ 兼容多种用户对象结构
    const userId = currentUser?.id || currentUser?.user_id || currentUser?.userId;
    
    if (!userId) {
      console.error("=== 用户信息调试 ===");
      console.error("currentUser:", currentUser);
      console.error("currentUser?.id:", currentUser?.id);
      console.error("localStorage currentUser:", localStorage.getItem('currentUser'));
      
      alert("当前用户信息缺失，请重新登录\n\n详细信息请查看浏览器控制台");
      return;
    }

    if (!formData.title) {
      alert("请至少填写产品标题后再保存草稿");
      return;
    }

    console.log("=== 准备保存草稿 ===");
    console.log("用户ID:", userId);
    console.log("标题:", formData.title);

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

      // ✅ 保存到 ai_drafts 表（扁平字段）
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
        created_by: userId,
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
      await withTimeout(
        insertData("products", {
          develop_month: formData.developMonth,
          category: formData.category,
          market: formData.market,
          platform: formData.platform,

          positioning: formData.positioning,
          selling_point: formData.sellingPoint,
          ingredients: formData.ingredients,
          efficacy: formData.efficacy,
          volume: formData.volume,
          scent: formData.scent,
          texture_color: formData.color,
          pricing: formData.pricing,
          title: formData.title,
          keywords: formData.keywords,
          packaging_requirements: formData.packaging,

          developer_id: currentUser.id,
          stage: 1,
          status: "进行中",
          created_at: getCurrentBeijingISO(),
        }),
        60000
      );

      onSuccess?.();
    } catch (e) {
      const msg =
        String(e?.message || e) === "NETWORK_TIMEOUT"
          ? "网络超时：创建产品失败，请稍后重试"
          : "创建产品失败：请检查网络或稍后重试";
      alert(msg);
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
              Step-by-step：先定类目/市场/平台 → 提取 3 个竞品（链接或截图）→ 生成方案 → 人工审核 → 创建产品
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Config */}
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

            {/* Close */}
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

          {/* Step 2 */}
          {step1Done ? (
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
                        <CompetitorCard item={c} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                当前进度：已提取 <span className="font-bold">{extractedCount}</span> / 3
              </div>

              {step2Done ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  ✅ Step 2 完成：3 个竞品已提取
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  <AlertCircle className="mr-2 inline h-4 w-4" />
                  需要提取完 3 个竞品后才能生成方案
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
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Step 4 */}
          {step3Done ? (
            <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5">
              <StepHeader
                step={4}
                title="人工审核编辑"
                done={false}
                subtitle="逐字段确认与修改（每个字段保留 AI 说明 / 置信度 / 理由）"
              />

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-sm font-semibold text-zinc-900">基础信息（自动带入）</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-zinc-500">开发月份</div>
                      <div className="font-semibold text-zinc-900">{formData.developMonth}</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-zinc-500">类目</div>
                      <div className="font-semibold text-zinc-900">{formData.category}</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-zinc-500">市场</div>
                      <div className="font-semibold text-zinc-900">{formData.market}</div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                      <div className="text-xs text-zinc-500">平台</div>
                      <div className="font-semibold text-zinc-900">{formData.platform}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-sm font-semibold text-zinc-900">创建人</div>
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <div className="text-xs text-zinc-500">developer_id</div>
                    <div className="font-semibold text-zinc-900">{currentUser?.id || "—"}</div>
                  </div>
                  <div className="mt-3 text-xs text-zinc-500">创建后：stage=1，status=进行中，created_at=北京时间 ISO</div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <FieldRow
                  label="产品定位"
                  value={formData.positioning}
                  onChange={(v) => setFormData((p) => ({ ...p, positioning: v }))}
                  placeholder="例如：高保湿修护、敏感肌可用、日常沐浴护理..."
                  aiNote={aiExplain?.positioning?.note}
                  aiConfidence={aiExplain?.positioning?.confidence}
                  aiReason={aiExplain?.positioning?.reason}
                />

                <FieldRow
                  label="核心卖点"
                  multiline
                  value={formData.sellingPoint}
                  onChange={(v) => setFormData((p) => ({ ...p, sellingPoint: v }))}
                  placeholder="用要点列出：功效+成分+体验+人群..."
                  aiNote={aiExplain?.sellingPoint?.note}
                  aiConfidence={aiExplain?.sellingPoint?.confidence}
                  aiReason={aiExplain?.sellingPoint?.reason}
                />

                <FieldRow
                  label="主要成分"
                  value={formData.ingredients}
                  onChange={(v) => setFormData((p) => ({ ...p, ingredients: v }))}
                  placeholder="例如：Niacinamide, PDRN, Hyaluronic Acid..."
                  aiNote={aiExplain?.ingredients?.note}
                  aiConfidence={aiExplain?.ingredients?.confidence}
                  aiReason={aiExplain?.ingredients?.reason}
                />

                <FieldRow
                  label="主打功效"
                  value={formData.efficacy}
                  onChange={(v) => setFormData((p) => ({ ...p, efficacy: v }))}
                  placeholder="例如：美白、保湿、修护、去屑..."
                  aiNote={aiExplain?.efficacy?.note}
                  aiConfidence={aiExplain?.efficacy?.confidence}
                  aiReason={aiExplain?.efficacy?.reason}
                />

                <FieldRow
                  label="容量"
                  value={formData.volume}
                  onChange={(v) => setFormData((p) => ({ ...p, volume: v }))}
                  placeholder="例如：400ml / 500ml"
                  aiNote={aiExplain?.volume?.note}
                  aiConfidence={aiExplain?.volume?.confidence}
                  aiReason={aiExplain?.volume?.reason}
                />

                <FieldRow
                  label="香味"
                  value={formData.scent}
                  onChange={(v) => setFormData((p) => ({ ...p, scent: v }))}
                  placeholder="例如：花香/果香/木质香..."
                  aiNote={aiExplain?.scent?.note}
                  aiConfidence={aiExplain?.scent?.confidence}
                  aiReason={aiExplain?.scent?.reason}
                />

                <FieldRow
                  label="料体颜色"
                  value={formData.color}
                  onChange={(v) => setFormData((p) => ({ ...p, color: v }))}
                  placeholder="例如：乳白/透明/淡粉..."
                  aiNote={aiExplain?.color?.note}
                  aiConfidence={aiExplain?.color?.confidence}
                  aiReason={aiExplain?.color?.reason}
                />

                <FieldRow
                  label="定价"
                  value={formData.pricing}
                  onChange={(v) => setFormData((p) => ({ ...p, pricing: v }))}
                  placeholder="例如：IDR 49,900 / 59,900"
                  aiNote={aiExplain?.pricing?.note}
                  aiConfidence={aiExplain?.pricing?.confidence}
                  aiReason={aiExplain?.pricing?.reason}
                />

                <FieldRow
                  label="产品标题"
                  multiline
                  value={formData.title}
                  onChange={(v) => setFormData((p) => ({ ...p, title: v }))}
                  placeholder="建议：关键词堆叠 + 主要卖点 + 容量"
                  aiNote={aiExplain?.title?.note}
                  aiConfidence={aiExplain?.title?.confidence}
                  aiReason={aiExplain?.title?.reason}
                />

                <FieldRow
                  label="搜索关键词"
                  multiline
                  value={formData.keywords}
                  onChange={(v) => setFormData((p) => ({ ...p, keywords: v }))}
                  placeholder="用逗号分隔：keyword1, keyword2..."
                  aiNote={aiExplain?.keywords?.note}
                  aiConfidence={aiExplain?.keywords?.confidence}
                  aiReason={aiExplain?.keywords?.reason}
                />

                <FieldRow
                  label="包装设计需求"
                  multiline
                  value={formData.packaging}
                  onChange={(v) => setFormData((p) => ({ ...p, packaging: v }))}
                  placeholder="例如：主图风格、信息层级、元素、色调、字体..."
                  aiNote={aiExplain?.packaging?.note}
                  aiConfidence={aiExplain?.packaging?.confidence}
                  aiReason={aiExplain?.packaging?.reason}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-zinc-500">
                  💡 提示：保存后草稿会进入「AI 草稿」Tab，状态为"待审核"，管理员审核通过后将自动创建正式产品
                </div>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingDraft ? '保存中...' : '保存草稿'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* AI Config Modal */}
        <AIConfigModal
          isOpen={showAIConfig}
          onClose={() => setShowAIConfig(false)}
          onSave={(cfg) => {
            // AIConfigModal 返回：extractProvider / planProvider
            const mapped = {
              extract_provider: cfg.extractProvider || cfg.extract_provider || "gemini",
              generate_provider: cfg.planProvider || cfg.generate_provider || "claude",
            };
            setAIConfig(mapped);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
            } catch {
              // ignore
            }
          }}
        />
      </div>
    </div>
  );
}
