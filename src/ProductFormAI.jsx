// File: src/ProductFormAI.jsx
// 🔄 重构版本 - 9模块AI草稿系统
// 特性：
// - 9个产品模块（含三语产品名称）
// - 只使用千问(Qwen)模型
// - 双模式竞品提取（链接+截图）
// - 最多3个竞品

import React, { useState, useMemo } from "react";
import { 
  X, Loader, CheckCircle, AlertCircle, Save, 
  Link, Image, Trash2, Plus, ChevronDown, ChevronUp,
  Sparkles, FileText, Beaker, Target, Palette, DollarSign, Tag
} from "lucide-react";
import { extractCompetitorInfo, generateProductPlan, insertAIDraft } from "./api";
import { getCurrentBeijingISO } from "./timeConfig";

// ==================== 常量配置 ====================

const CATEGORIES = ["洗发水", "沐浴露", "身体乳", "护发素", "弹力素", "护手霜"];
const MARKETS = ["美国", "印尼", "东南亚", "欧洲"];
const PLATFORMS = ["Amazon", "TikTok", "Shopee", "Lazada"];

// 固定使用千问
const AI_CONFIG = {
  extract_provider: "qwen",
  generate_provider: "qwen"
};

// ==================== 工具函数 ====================

const withTimeout = async (promise, ms = 90000) => {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error("请求超时，请重试")), ms);
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
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });

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

// ==================== 子组件 ====================

// 步骤头部
const StepHeader = ({ step, title, subtitle, done, active }) => (
  <div className="flex items-start gap-3">
    <div className={`
      flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold
      ${done ? "bg-emerald-500 text-white" : active ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-500"}
    `}>
      {done ? <CheckCircle className="h-4 w-4" /> : step}
    </div>
    <div>
      <div className={`font-semibold ${done ? "text-emerald-700" : active ? "text-zinc-900" : "text-zinc-500"}`}>
        {title}
      </div>
      {subtitle && <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>}
    </div>
  </div>
);

// 单个竞品卡片
const CompetitorCard = ({ 
  index, 
  competitor, 
  onUpdate, 
  onExtract, 
  onRemove,
  extracting 
}) => {
  const { mode, url, images, imagePreviews, hint, loading, success, error, data } = competitor;

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (files.length === 0) return;

    const previews = [];
    const imageData = [];

    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      previews.push(dataUrl);
      imageData.push(file);
    }

    onUpdate(index, {
      images: imageData,
      imagePreviews: previews
    });
  };

  const removeImage = (imgIndex) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    newImages.splice(imgIndex, 1);
    newPreviews.splice(imgIndex, 1);
    onUpdate(index, { images: newImages, imagePreviews: newPreviews });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">竞品 {index + 1}</span>
          {success && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">已提取</span>}
          {error && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">失败</span>}
        </div>
        {index > 0 && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-zinc-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 模式切换 */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => onUpdate(index, { mode: "url" })}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${
            mode === "url" 
              ? "bg-indigo-100 text-indigo-700 border border-indigo-200" 
              : "bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
          }`}
        >
          <Link className="h-4 w-4" />
          粘贴链接
        </button>
        <button
          type="button"
          onClick={() => onUpdate(index, { mode: "image" })}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors ${
            mode === "image" 
              ? "bg-indigo-100 text-indigo-700 border border-indigo-200" 
              : "bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
          }`}
        >
          <Image className="h-4 w-4" />
          上传截图
        </button>
      </div>

      {/* 链接模式 */}
      {mode === "url" && (
        <input
          type="text"
          value={url}
          onChange={(e) => onUpdate(index, { url: e.target.value })}
          placeholder="粘贴竞品商品链接（Shopee/Lazada/Amazon等）"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2"
        />
      )}

      {/* 截图模式 */}
      {mode === "image" && (
        <div className="space-y-3">
          {/* 图片预览 */}
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {imagePreviews.map((preview, imgIdx) => (
                <div key={imgIdx} className="relative group">
                  <img 
                    src={preview} 
                    alt={`截图${imgIdx + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border border-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(imgIdx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 上传按钮 */}
          {imagePreviews.length < 3 && (
            <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
              <Plus className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-zinc-600">添加截图（最多3张）</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}

          {/* 补充说明 */}
          <input
            type="text"
            value={hint}
            onChange={(e) => onUpdate(index, { hint: e.target.value })}
            placeholder="补充说明（可选）：如产品名称、价格等"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          />
        </div>
      )}

      {/* 提取按钮 */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onExtract(index)}
          disabled={loading || extracting || (mode === "url" ? !url : images.length === 0)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              提取中...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              AI提取
            </>
          )}
        </button>

        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>

      {/* 提取结果预览 */}
      {data && (
        <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="text-xs font-semibold text-emerald-800 mb-1">✅ 已提取</div>
          <div className="text-xs text-emerald-700">
            {data.listing?.title || data.name || "竞品信息"}
          </div>
          {data.listing?.price && (
            <div className="text-xs text-emerald-600 mt-1">价格: {data.listing.price}</div>
          )}
        </div>
      )}
    </div>
  );
};

// 模块字段编辑组件
const ModuleField = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  aiNote,
  aiConfidence,
  aiReason,
  required = false,
  disabled = false,
  maxLength
}) => {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
          <span className="text-sm font-semibold text-zinc-900">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
        </div>
        {typeof aiConfidence === "number" && (
          <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            置信度 {Math.round(aiConfidence * 100)}%
          </span>
        )}
      </div>

      {aiNote && (
        <div className="mb-3 text-xs text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">
          <span className="font-semibold">💭 AI说明：</span>{aiNote}
        </div>
      )}

      {multiline ? (
        <textarea
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2 resize-none disabled:bg-zinc-50 disabled:text-zinc-500"
          rows={rows}
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
        />
      ) : (
        <input
          type="text"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2 disabled:bg-zinc-50 disabled:text-zinc-500"
          value={value || ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
        />
      )}

      {maxLength && (
        <div className="mt-1 text-xs text-zinc-400 text-right">
          {(value || "").length} / {maxLength}
        </div>
      )}

      {aiReason && (
        <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">📝 依据：</span>{aiReason}
        </div>
      )}
    </div>
  );
};

// 三语名称组件
const TrilingualNameField = ({ 
  nameZh, nameEn, nameId, 
  onChangeZh, onChangeEn, onChangeId,
  aiNote, aiConfidence 
}) => {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold text-zinc-900">
            产品名称（三语）<span className="text-red-500 ml-0.5">*</span>
          </span>
        </div>
        {typeof aiConfidence === "number" && (
          <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            置信度 {Math.round(aiConfidence * 100)}%
          </span>
        )}
      </div>

      {aiNote && (
        <div className="mb-3 text-xs text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">
          <span className="font-semibold">💭 AI说明：</span>{aiNote}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">中文名称</label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
            value={nameZh || ""}
            placeholder="如：迷迭香防脱洗发水"
            onChange={(e) => onChangeZh(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">英文名称</label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
            value={nameEn || ""}
            placeholder="如：Rosemary Anti Hair Fall Shampoo"
            onChange={(e) => onChangeEn(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">印尼语名称</label>
          <input
            type="text"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500 focus:ring-2"
            value={nameId || ""}
            placeholder="如：Shampo Anti Rontok Rosemary"
            onChange={(e) => onChangeId(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

// ==================== 主组件 ====================

export default function ProductFormAI({ onClose, onSuccess, currentUser }) {
  // ========== 基础信息 ==========
  const [category, setCategory] = useState("");
  const [market, setMarket] = useState("");
  const [platform, setPlatform] = useState("");

  // ========== 竞品数据 ==========
  const [competitors, setCompetitors] = useState([
    {
      mode: "url",
      url: "",
      images: [],
      imagePreviews: [],
      hint: "",
      loading: false,
      success: false,
      error: "",
      data: null
    }
  ]);
  const [extractingAny, setExtractingAny] = useState(false);

  // ========== 生成状态 ==========
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // ========== 9模块数据 ==========
  const [formData, setFormData] = useState({
    // 模块1: 产品名称（三语）
    name_zh: "",
    name_en: "",
    name_id: "",
    // 模块2: 产品定位
    positioning: "",
    // 模块3: 卖点简介
    selling_point: "",
    // 模块4: 主要成分
    ingredients: "",
    // 模块5: 主打功效
    efficacy: "",
    // 模块6: 香味
    scent: "",
    // 模块7: 质地颜色
    texture_color: "",
    // 模块8: 定价策略
    pricing: "",
    // 模块9: 产品标题 + 关键词
    title: "",
    keywords: "",
    // 隐藏字段
    volume: "",
    packaging_requirements: ""
  });

  // ========== AI说明数据 ==========
  const [aiExplain, setAiExplain] = useState({});

  // ========== 保存状态 ==========
  const [savingDraft, setSavingDraft] = useState(false);

  // ========== 展开/收起状态 ==========
  const [showCompetitorDetails, setShowCompetitorDetails] = useState(false);

  // ========== 计算步骤完成状态 ==========
  const step1Done = Boolean(category && market && platform);
  
  const successfulExtracts = competitors.filter(c => c.success && c.data).length;
  const step2Done = successfulExtracts >= 1;
  
  const step3Done = Boolean(
    formData.name_zh || formData.name_en || formData.name_id ||
    formData.positioning || formData.selling_point
  );

  // ========== 竞品操作 ==========
  const updateCompetitor = (index, updates) => {
    setCompetitors(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], ...updates };
      return newList;
    });
  };

  const addCompetitor = () => {
    if (competitors.length >= 3) return;
    setCompetitors(prev => [
      ...prev,
      {
        mode: "url",
        url: "",
        images: [],
        imagePreviews: [],
        hint: "",
        loading: false,
        success: false,
        error: "",
        data: null
      }
    ]);
  };

  const removeCompetitor = (index) => {
    if (competitors.length <= 1) return;
    setCompetitors(prev => prev.filter((_, i) => i !== index));
  };

  // ========== 提取单个竞品 ==========
  const handleExtractOne = async (index) => {
    const comp = competitors[index];
    
    // 构建输入
    let input;
    if (comp.mode === "url") {
      if (!comp.url) return;
      input = comp.url;
    } else {
      if (comp.images.length === 0) return;
      // 转换图片为base64
      const imageData = [];
      for (const file of comp.images) {
        const dataUrl = await fileToDataUrl(file);
        const base64 = dataUrl.split(",")[1];
        imageData.push({
          data: base64,
          mime_type: file.type
        });
      }
      input = {
        mode: "image",
        images: imageData,
        hint: comp.hint || ""
      };
    }

    updateCompetitor(index, { loading: true, error: "", success: false });
    setExtractingAny(true);

    try {
      const result = await withTimeout(
        extractCompetitorInfo(input, AI_CONFIG),
        90000
      );
      
      updateCompetitor(index, {
        loading: false,
        success: true,
        data: result,
        error: ""
      });
    } catch (err) {
      updateCompetitor(index, {
        loading: false,
        success: false,
        error: err.message || "提取失败"
      });
    } finally {
      setExtractingAny(false);
    }
  };

  // ========== 生成产品方案 ==========
  const handleGenerate = async () => {
    if (!step1Done || !step2Done) {
      alert("请先完成基础信息填写和至少一个竞品提取");
      return;
    }

    setIsGenerating(true);
    setGenerateError("");

    try {
      // 收集竞品数据
      const competitorsData = competitors
        .filter(c => c.success && c.data)
        .map(c => ({
          mode: c.mode,
          url: c.url || null,
          data: c.data
        }));

      const payload = {
        category,
        market,
        platform,
        competitors: competitorsData,
        ai_config: AI_CONFIG
      };

      const result = await withTimeout(
        generateProductPlan(payload),
        120000
      );

      // 解析结果并填充表单
      if (result) {
        const plan = safeJson(result.plan) || result.plan || result;
        
        setFormData(prev => ({
          ...prev,
          // 模块1: 产品名称
          name_zh: plan.productName?.zh || plan.name_zh || "",
          name_en: plan.productName?.en || plan.name_en || "",
          name_id: plan.productName?.id || plan.name_id || "",
          // 模块2: 产品定位
          positioning: plan.positioning?.value || plan.positioning || "",
          // 模块3: 卖点简介
          selling_point: plan.productIntro?.zh || plan.selling_point || plan.sellingPoint || "",
          // 模块4: 主要成分
          ingredients: formatIngredients(plan.ingredientCombos || plan.ingredients),
          // 模块5: 主打功效
          efficacy: formatBenefits(plan.mainBenefits || plan.efficacy),
          // 模块6: 香味
          scent: plan.scent?.valueZh || plan.scent?.value || plan.scent || "",
          // 模块7: 质地颜色
          texture_color: plan.texture?.valueZh || plan.texture?.value || plan.texture_color || plan.color || "",
          // 模块8: 定价策略
          pricing: plan.pricing?.recommended || plan.pricing?.value || plan.pricing || "",
          // 模块9: 产品标题
          title: plan.productTitle?.value || plan.title || "",
          keywords: plan.keywords?.value || plan.keywords || "",
          // 隐藏字段
          volume: plan.volume || "",
          packaging_requirements: plan.packaging?.requirements || plan.packaging_requirements || ""
        }));

        // 设置AI说明
        setAiExplain({
          productName: {
            note: plan.productName?.aiNote || plan.productName?.reason,
            confidence: plan.productName?.confidence
          },
          positioning: {
            note: plan.positioning?.aiNote,
            reason: plan.positioning?.reason,
            confidence: plan.positioning?.confidence
          },
          selling_point: {
            note: plan.productIntro?.aiNote,
            reason: plan.productIntro?.reason,
            confidence: plan.productIntro?.confidence
          },
          ingredients: {
            note: plan.ingredientCombos?.aiNote,
            reason: plan.ingredientCombos?.reason,
            confidence: plan.ingredientCombos?.confidence
          },
          efficacy: {
            note: plan.mainBenefits?.aiNote,
            reason: plan.mainBenefits?.reason,
            confidence: plan.mainBenefits?.confidence
          },
          scent: {
            note: plan.scent?.aiNote,
            reason: plan.scent?.reason,
            confidence: plan.scent?.confidence
          },
          texture_color: {
            note: plan.texture?.aiNote,
            reason: plan.texture?.reason,
            confidence: plan.texture?.confidence
          },
          pricing: {
            note: plan.pricing?.aiNote,
            reason: plan.pricing?.reason,
            confidence: plan.pricing?.confidence
          },
          title: {
            note: plan.productTitle?.aiNote,
            reason: plan.productTitle?.reason,
            confidence: plan.productTitle?.confidence
          }
        });
      }
    } catch (err) {
      setGenerateError(err.message || "生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // 格式化成分列表
  const formatIngredients = (data) => {
    if (!data) return "";
    if (typeof data === "string") return data;
    if (Array.isArray(data.items)) {
      return data.items.map(item => {
        const name = item.ingredient?.zh || item.ingredient?.en || item.name || item;
        return typeof name === "string" ? name : JSON.stringify(name);
      }).join(", ");
    }
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === "string") return item;
        return item.ingredient?.zh || item.ingredient?.en || item.name || "";
      }).join(", ");
    }
    return "";
  };

  // 格式化功效列表
  const formatBenefits = (data) => {
    if (!data) return "";
    if (typeof data === "string") return data;
    if (Array.isArray(data.items)) {
      return data.items.map(item => item.zh || item.en || item).join("\n");
    }
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === "string") return item;
        return item.zh || item.en || "";
      }).join("\n");
    }
    return "";
  };

  // ========== 保存草稿 ==========
  const handleSaveDraft = async () => {
    // 验证必填
    if (!category || !market || !platform) {
      alert("请先完成基础信息填写");
      return;
    }
    if (!formData.name_zh && !formData.name_en && !formData.name_id) {
      alert("请至少填写一个产品名称");
      return;
    }

    setSavingDraft(true);

    try {
      // 收集竞品数据
      const competitorsData = competitors
        .filter(c => c.success && c.data)
        .map(c => ({
          mode: c.mode,
          url: c.url || null,
          data: c.data
        }));

      // 当前年月
      const now = new Date();
      const developMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const draftData = {
        develop_month: developMonth,
        category,
        market,
        platform,
        // 9模块数据
        name_zh: formData.name_zh || null,
        name_en: formData.name_en || null,
        name_id: formData.name_id || null,
        positioning: formData.positioning || null,
        selling_point: formData.selling_point || null,
        ingredients: formData.ingredients || null,
        efficacy: formData.efficacy || null,
        scent: formData.scent || null,
        texture_color: formData.texture_color || null,
        pricing: formData.pricing || null,
        title: formData.title || null,
        keywords: formData.keywords || null,
        volume: formData.volume || null,
        packaging_requirements: formData.packaging_requirements || null,
        // AI元数据
        extract_provider: AI_CONFIG.extract_provider,
        generate_provider: AI_CONFIG.generate_provider,
        competitors_data: competitorsData,
        ai_explanations: aiExplain,
        estimated_cost: 0,
        // 用户信息
        created_by: currentUser?.id || 1,
        created_at: getCurrentBeijingISO()
      };

      await insertAIDraft(draftData);

      alert("✅ 草稿保存成功！\n\n请前往「AI 草稿」Tab 查看，管理员审核通过后将自动创建产品。");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      alert(`保存失败：${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

  // ==================== 渲染 ====================
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-8">
      <div className="relative w-[95vw] max-w-5xl rounded-3xl bg-gradient-to-b from-zinc-50 to-white shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-3xl border-b border-zinc-200 bg-white/95 backdrop-blur px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-900">AI 智能创建产品</div>
              <div className="text-xs text-zinc-500">9模块产品方案生成 · 千问AI驱动</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 主体内容 */}
        <div className="p-6 space-y-6">
          {/* ========== Step 1: 基础信息 ========== */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <StepHeader
              step={1}
              title="基础信息"
              subtitle="选择产品类目、目标市场和销售平台"
              done={step1Done}
              active={!step1Done}
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-zinc-700 mb-1.5 block">产品类目</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2"
                >
                  <option value="">请选择</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700 mb-1.5 block">目标市场</label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2"
                >
                  <option value="">请选择</option>
                  {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700 mb-1.5 block">销售平台</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2"
                >
                  <option value="">请选择</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ========== Step 2: 竞品提取 ========== */}
          {step1Done && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <StepHeader
                step={2}
                title="竞品提取"
                subtitle={`支持链接或截图方式提取竞品信息（最多3个，已提取 ${successfulExtracts} 个）`}
                done={step2Done}
                active={step1Done && !step2Done}
              />

              <div className="mt-5 space-y-4">
                {competitors.map((comp, index) => (
                  <CompetitorCard
                    key={index}
                    index={index}
                    competitor={comp}
                    onUpdate={updateCompetitor}
                    onExtract={handleExtractOne}
                    onRemove={removeCompetitor}
                    extracting={extractingAny}
                  />
                ))}

                {competitors.length < 3 && (
                  <button
                    type="button"
                    onClick={addCompetitor}
                    className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-sm text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    添加竞品（{competitors.length}/3）
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========== Step 3: AI生成 ========== */}
          {step2Done && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <StepHeader
                step={3}
                title="AI 生成产品方案"
                subtitle="基于竞品分析，智能生成9模块产品方案"
                done={step3Done}
                active={step2Done && !step3Done}
              />

              <div className="mt-5">
                {/* 竞品摘要 */}
                <div className="mb-4 p-4 bg-zinc-50 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setShowCompetitorDetails(!showCompetitorDetails)}
                    className="w-full flex items-center justify-between text-sm"
                  >
                    <span className="font-medium text-zinc-700">
                      已提取 {successfulExtracts} 个竞品数据
                    </span>
                    {showCompetitorDetails ? (
                      <ChevronUp className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>

                  {showCompetitorDetails && (
                    <div className="mt-3 space-y-2">
                      {competitors.filter(c => c.success && c.data).map((comp, idx) => (
                        <div key={idx} className="text-xs text-zinc-600 p-2 bg-white rounded-lg">
                          <div className="font-medium">{comp.data?.listing?.title || comp.data?.name || `竞品${idx + 1}`}</div>
                          {comp.data?.listing?.price && (
                            <div className="text-zinc-500 mt-0.5">价格: {comp.data.listing.price}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 生成按钮 */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      AI 正在分析生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      生成 9 模块产品方案
                    </>
                  )}
                </button>

                {generateError && (
                  <div className="mt-3 p-3 bg-red-50 rounded-xl text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {generateError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== Step 4: 9模块编辑 ========== */}
          {step3Done && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <StepHeader
                step={4}
                title="产品方案编辑"
                subtitle="审核并编辑 AI 生成的 9 模块内容"
                done={false}
                active={true}
              />

              <div className="mt-5 space-y-4">
                {/* 基础信息回显 */}
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <div className="text-xs font-medium text-zinc-500 mb-2">基础信息</div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="px-3 py-1 bg-white rounded-lg border border-zinc-200">{category}</span>
                    <span className="px-3 py-1 bg-white rounded-lg border border-zinc-200">{market}</span>
                    <span className="px-3 py-1 bg-white rounded-lg border border-zinc-200">{platform}</span>
                  </div>
                </div>

                {/* 模块1: 产品名称（三语） */}
                <TrilingualNameField
                  nameZh={formData.name_zh}
                  nameEn={formData.name_en}
                  nameId={formData.name_id}
                  onChangeZh={(v) => setFormData(prev => ({ ...prev, name_zh: v }))}
                  onChangeEn={(v) => setFormData(prev => ({ ...prev, name_en: v }))}
                  onChangeId={(v) => setFormData(prev => ({ ...prev, name_id: v }))}
                  aiNote={aiExplain.productName?.note}
                  aiConfidence={aiExplain.productName?.confidence}
                />

                {/* 模块2: 产品定位 */}
                <ModuleField
                  label="产品定位"
                  icon={Target}
                  value={formData.positioning}
                  onChange={(v) => setFormData(prev => ({ ...prev, positioning: v }))}
                  placeholder="如：热带湿热气候防脱清凉洗发水"
                  multiline
                  rows={2}
                  aiNote={aiExplain.positioning?.note}
                  aiReason={aiExplain.positioning?.reason}
                  aiConfidence={aiExplain.positioning?.confidence}
                />

                {/* 模块3: 卖点简介 */}
                <ModuleField
                  label="卖点简介"
                  icon={FileText}
                  value={formData.selling_point}
                  onChange={(v) => setFormData(prev => ({ ...prev, selling_point: v }))}
                  placeholder="产品卖点段落描述..."
                  multiline
                  rows={4}
                  aiNote={aiExplain.selling_point?.note}
                  aiReason={aiExplain.selling_point?.reason}
                  aiConfidence={aiExplain.selling_point?.confidence}
                />

                {/* 模块4: 主要成分 */}
                <ModuleField
                  label="主要成分"
                  icon={Beaker}
                  value={formData.ingredients}
                  onChange={(v) => setFormData(prev => ({ ...prev, ingredients: v }))}
                  placeholder="如：迷迭香叶提取物, 薄荷油, 咖啡因..."
                  multiline
                  rows={2}
                  aiNote={aiExplain.ingredients?.note}
                  aiReason={aiExplain.ingredients?.reason}
                  aiConfidence={aiExplain.ingredients?.confidence}
                />

                {/* 模块5: 主打功效 */}
                <ModuleField
                  label="主打功效"
                  icon={Sparkles}
                  value={formData.efficacy}
                  onChange={(v) => setFormData(prev => ({ ...prev, efficacy: v }))}
                  placeholder="如：防脱发与强韧发根\n即时清凉舒缓\n舒缓头皮瘙痒..."
                  multiline
                  rows={3}
                  aiNote={aiExplain.efficacy?.note}
                  aiReason={aiExplain.efficacy?.reason}
                  aiConfidence={aiExplain.efficacy?.confidence}
                />

                {/* 模块6: 香味 */}
                <ModuleField
                  label="香味"
                  icon={Palette}
                  value={formData.scent}
                  onChange={(v) => setFormData(prev => ({ ...prev, scent: v }))}
                  placeholder="如：清新薄荷迷迭香草本香"
                  aiNote={aiExplain.scent?.note}
                  aiReason={aiExplain.scent?.reason}
                  aiConfidence={aiExplain.scent?.confidence}
                />

                {/* 模块7: 质地颜色 */}
                <ModuleField
                  label="质地颜色"
                  icon={Palette}
                  value={formData.texture_color}
                  onChange={(v) => setFormData(prev => ({ ...prev, texture_color: v }))}
                  placeholder="如：淡绿色清透凝露质地"
                  aiNote={aiExplain.texture_color?.note}
                  aiReason={aiExplain.texture_color?.reason}
                  aiConfidence={aiExplain.texture_color?.confidence}
                />

                {/* 模块8: 定价策略 */}
                <ModuleField
                  label="定价策略"
                  icon={DollarSign}
                  value={formData.pricing}
                  onChange={(v) => setFormData(prev => ({ ...prev, pricing: v }))}
                  placeholder="如：IDR 49,900 / 59,900"
                  aiNote={aiExplain.pricing?.note}
                  aiReason={aiExplain.pricing?.reason}
                  aiConfidence={aiExplain.pricing?.confidence}
                />

                {/* 模块9: 产品标题 */}
                <ModuleField
                  label="产品标题"
                  icon={Tag}
                  value={formData.title}
                  onChange={(v) => setFormData(prev => ({ ...prev, title: v }))}
                  placeholder="电商平台展示标题..."
                  multiline
                  rows={2}
                  maxLength={255}
                  aiNote={aiExplain.title?.note}
                  aiReason={aiExplain.title?.reason}
                  aiConfidence={aiExplain.title?.confidence}
                />

                {/* 搜索关键词 */}
                <ModuleField
                  label="搜索关键词"
                  icon={Tag}
                  value={formData.keywords}
                  onChange={(v) => setFormData(prev => ({ ...prev, keywords: v }))}
                  placeholder="用逗号分隔关键词..."
                  multiline
                  rows={2}
                />

                {/* 保存草稿 */}
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-sm text-zinc-600">
                      💡 保存后草稿会进入「AI 草稿」Tab，管理员审核通过后将自动创建正式产品
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
                    >
                      {savingDraft ? (
                        <>
                          <Loader className="h-4 w-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          保存草稿
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
