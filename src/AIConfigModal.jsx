// File: src/AIConfigModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Settings, X } from "lucide-react";

const STORAGE_KEY = "ai_config";

const PROVIDERS = {
  gemini: {
    id: "gemini",
    name: "Gemini",
    desc: "速度快、性价比高，适合结构化提取与批量任务。",
    cost: "$",
  },
  claude: {
    id: "claude",
    name: "Claude",
    desc: "文本理解强、输出稳定，适合策略/方案与高质量判断。",
    cost: "$$",
  },
  gpt4: {
    id: "gpt4",
    name: "GPT-4",
    desc: "通用能力强，兼容性高，适合工程落地与兜底。",
    cost: "$$",
  },
  qwen: {
    id: "qwen",
    name: "千问 Qwen",
    desc: "中文友好、成本可控，适合结构化输出与通用文本任务。",
    cost: "$",
  },
  ark: {
    id: "ark",
    name: "火山 Ark（豆包）",
    desc: "国内稳定，适合企业网络环境与中等成本场景。",
    cost: "$$",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    desc: "性价比很高，推理强，适合预算敏感场景。",
    cost: "$",
  },
};

const DEFAULT_CONFIG = {
  extract_provider: "gemini",
  generate_provider: "claude",
};

function safeReadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);

    // 兼容旧字段
    const extract_provider =
      parsed?.extract_provider ||
      parsed?.extractProvider ||
      DEFAULT_CONFIG.extract_provider;

    const generate_provider =
      parsed?.generate_provider ||
      parsed?.planProvider ||
      parsed?.generateProvider ||
      DEFAULT_CONFIG.generate_provider;

    return {
      extract_provider: PROVIDERS[extract_provider] ? extract_provider : DEFAULT_CONFIG.extract_provider,
      generate_provider: PROVIDERS[generate_provider] ? generate_provider : DEFAULT_CONFIG.generate_provider,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function safeWriteConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {}
}

function ProviderOption({ groupName, value, selected, onChange }) {
  const p = PROVIDERS[value];
  const active = selected === value;

  return (
    <label
      className={[
        "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
        active ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 bg-white hover:bg-zinc-50",
      ].join(" ")}
    >
      <input
        type="radio"
        name={groupName}
        value={value}
        checked={active}
        onChange={() => onChange(value)}
        className="mt-1 h-4 w-4 accent-indigo-600"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-zinc-900">{p.name}</div>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {p.cost}
            </span>
          </div>
          {active ? (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
              已选择
            </span>
          ) : (
            <span className="text-xs text-zinc-400">点击选择</span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600">{p.desc}</p>
      </div>
    </label>
  );
}

function RecommendationCard({ title, desc, isActive }) {
  return (
    <div
      className={[
        "rounded-xl border p-3",
        isActive ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        {isActive ? (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            当前配置
          </span>
        ) : (
          <span className="text-xs text-zinc-400">推荐</span>
        )}
      </div>
      <div className="mt-1 text-xs text-zinc-600">{desc}</div>
    </div>
  );
}

export default function AIConfigModal({ isOpen, onClose, onSave }) {
  const [extract_provider, setExtract] = useState(DEFAULT_CONFIG.extract_provider);
  const [generate_provider, setGenerate] = useState(DEFAULT_CONFIG.generate_provider);

  useEffect(() => {
    if (!isOpen) return;
    const cfg = safeReadConfig();
    setExtract(cfg.extract_provider);
    setGenerate(cfg.generate_provider);
  }, [isOpen]);

  const recommendations = useMemo(() => {
    return [
      {
        key: "value_best",
        title: "性价比最佳",
        desc: "Gemini（竞品提取） + Claude（方案生成）",
        match: extract_provider === "gemini" && generate_provider === "claude",
      },
      {
        key: "quality_first",
        title: "质量优先",
        desc: "Claude（竞品提取） + Claude（方案生成）",
        match: extract_provider === "claude" && generate_provider === "claude",
      },
      {
        key: "budget_limited",
        title: "预算有限",
        desc: "Gemini（竞品提取） + Gemini（方案生成）",
        match: extract_provider === "gemini" && generate_provider === "gemini",
      },
      {
        key: "cn_stable",
        title: "国内更稳",
        desc: "Ark（竞品提取） + Ark（方案生成）",
        match: extract_provider === "ark" && generate_provider === "ark",
      },
    ];
  }, [extract_provider, generate_provider]);

  const handleSave = () => {
    const cfg = { extract_provider, generate_provider };
    safeWriteConfig(cfg);
    onSave?.(cfg);
    onClose?.();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onClose?.()} />

      <div className="relative z-10 w-[92vw] max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-zinc-900">AI 配置</div>
              <div className="text-xs text-zinc-500">选择不同环节使用的 AI 提供商（仅开放可改部分）</div>
            </div>
          </div>

          <button
            onClick={() => onClose?.()}
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-zinc-900">推荐配置</div>
            <div className="grid gap-3 md:grid-cols-4">
              {recommendations.map((r) => (
                <RecommendationCard key={r.key} title={r.title} desc={r.desc} isActive={r.match} />
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-zinc-900">竞品提取使用</div>
                <div className="text-xs text-zinc-500">Extract Competitor（结构化拆解）</div>
              </div>

              <div className="space-y-3">
                {["gemini", "deepseek", "qwen", "ark", "claude", "gpt4"].map((p) => (
                  <ProviderOption
                    key={p}
                    groupName="extract_provider"
                    value={p}
                    selected={extract_provider}
                    onChange={setExtract}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-zinc-900">方案生成使用</div>
                <div className="text-xs text-zinc-500">Generate Plan（可执行作战计划）</div>
              </div>

              <div className="space-y-3">
                {["claude", "gpt4", "gemini", "deepseek", "qwen", "ark"].map((p) => (
                  <ProviderOption
                    key={p}
                    groupName="generate_provider"
                    value={p}
                    selected={generate_provider}
                    onChange={setGenerate}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">当前选择</div>
            <div className="mt-2 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 px-3 py-2">
                <span className="text-zinc-500">竞品提取：</span>
                <span className="font-semibold text-zinc-900">{PROVIDERS[extract_provider].name}</span>
                <span className="ml-2 text-xs text-zinc-500">{PROVIDERS[extract_provider].cost}</span>
              </div>
              <div className="rounded-xl bg-zinc-50 px-3 py-2">
                <span className="text-zinc-500">方案生成：</span>
                <span className="font-semibold text-zinc-900">{PROVIDERS[generate_provider].name}</span>
                <span className="ml-2 text-xs text-zinc-500">{PROVIDERS[generate_provider].cost}</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              提示：保存后会写入 <span className="font-mono">localStorage['ai_config']</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
          <button
            onClick={() => onClose?.()}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
