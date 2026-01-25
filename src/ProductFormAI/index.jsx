// File: src/ProductFormAI/index.jsx

import React, { useState, useEffect, useMemo } from "react";
import { X, Settings } from "lucide-react";
import AIConfigModal from "../AIConfigModal";
import Step1Basic from "./Step1Basic";
import Step2Competitors from "./Step2Competitors";
import Step3Generate from "./Step3Generate";
import Step4Review from "./Step4Review";
import { useCompetitors } from "./hooks/useCompetitors";
import { useAIGenerate } from "./hooks/useAIGenerate";
import { useSaveDraft } from "./hooks/useSaveDraft";
import { readAIConfig, providerLabel, STORAGE_KEY } from "./utils";

export default function ProductFormAI({ onClose, onSuccess, currentUser }) {
  // AI 配置
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAIConfig] = useState(readAIConfig());

  // Step 1 状态
  const [category, setCategory] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("");

  // Form 数据
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

  // AI 解释数据
  const [aiExplain, setAIExplain] = useState({});

  // 步骤完成状态
  const step1Done = useMemo(
    () => !!category && !!targetMarket && !!targetPlatform,
    [category, targetMarket, targetPlatform]
  );

  // 自定义 Hooks
  const competitorsHook = useCompetitors(aiConfig);
  const { extractedCount } = competitorsHook;

  const step2Done = useMemo(
    () => step1Done && extractedCount >= 1,
    [step1Done, extractedCount]
  );

  const generateHook = useAIGenerate(
    category,
    targetMarket,
    targetPlatform,
    competitorsHook.competitors,
    aiConfig,
    step1Done,
    extractedCount,
    setFormData,
    setAIExplain
  );

  const step3Done = useMemo(
    () => step2Done && !!generateHook.planResult,
    [step2Done, generateHook.planResult]
  );

  const saveDraftHook = useSaveDraft(
    currentUser,
    formData,
    competitorsHook.competitors,
    generateHook.planResult,
    aiConfig,
    aiExplain,
    onSuccess,
    onClose
  );

  // 同步基础字段到 formData
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      category: category || prev.category,
      market: targetMarket || prev.market,
      platform: targetPlatform || prev.platform,
    }));
  }, [category, targetMarket, targetPlatform]);

  // AI 配置显示文本
  const currentAIComboText = useMemo(() => {
    return `${providerLabel(aiConfig.extract_provider)} / ${providerLabel(aiConfig.generate_provider)}`;
  }, [aiConfig]);

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
          {/* Step 1: 基本信息 */}
          <Step1Basic
            category={category}
            setCategory={setCategory}
            targetMarket={targetMarket}
            setTargetMarket={setTargetMarket}
            targetPlatform={targetPlatform}
            setTargetPlatform={setTargetPlatform}
            step1Done={step1Done}
          />

          {/* Step 2: 竞品输入 */}
          <Step2Competitors
            step1Done={step1Done}
            step2Done={step2Done}
            competitors={competitorsHook.competitors}
            extractedCount={extractedCount}
            aiConfig={aiConfig}
            updateCompetitor={competitorsHook.updateCompetitor}
            resetCompetitorResult={competitorsHook.resetCompetitorResult}
            setCompetitorMode={competitorsHook.setCompetitorMode}
            handlePickImages={competitorsHook.handlePickImages}
            clearImages={competitorsHook.clearImages}
            handleExtractOne={competitorsHook.handleExtractOne}
          />

          {/* Step 3: AI 生成 */}
          <Step3Generate
            step2Done={step2Done}
            step3Done={step3Done}
            canGeneratePlan={generateHook.canGeneratePlan}
            planLoading={generateHook.planLoading}
            planResult={generateHook.planResult}
            planProviderUsed={generateHook.planProviderUsed}
            handleGeneratePlan={generateHook.handleGeneratePlan}
            handleSaveDraft={saveDraftHook.handleSaveDraft}
            savingDraft={saveDraftHook.savingDraft}
            formData={formData}
            aiConfig={aiConfig}
            aiExplain={aiExplain}
          />

          {/* Step 4: 人工审核 */}
          <Step4Review
            step3Done={step3Done}
            formData={formData}
            setFormData={setFormData}
            aiExplain={aiExplain}
            currentUser={currentUser}
            handleSaveDraft={saveDraftHook.handleSaveDraft}
            savingDraft={saveDraftHook.savingDraft}
          />
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
            } catch {
              // ignore
            }
          }}
        />
      </div>
    </div>
  );
}
