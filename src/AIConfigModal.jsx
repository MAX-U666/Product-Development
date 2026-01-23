// File: src/AIConfigModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Settings, X } from "lucide-react";

/**
 * AIConfigModal
 * -------------
 * 用途：在管理员/运营后台里配置 AI Provider 组合（竞品提取 & 方案生成）
 *
 * 需求要点：
 * - React 函数组件
 * - localStorage 读写（key: 'ai_config'）
 * - 单选按钮选择 AI 提供商
 * - 两个区块：Extract / Plan
 * - 显示：名称、描述、成本($)
 * - 推荐组合提示
 * - 保存：写 localStorage + onSave + onClose
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onSave: (config) => void
 */

const STORAGE_KEY = "ai_config";

const DEFAULT_CONFIG = {
  extractProvider: "gemini",
  planProvider: "claude",
};

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
    desc: "通用能力强，表现均衡，适合多场景兼容与工程落地。",
    cost: "$$",
  },
};

function safeReadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    // 轻量校验，避免脏数据把 UI 卡死
    const extractProvider =
      parsed?.extractProvider && PROVIDERS[parsed.extractProvider] ? parsed.extractProvider : DEFAULT_CONFIG.extractProvider;
    const planProvider =
      parsed?.planProvider && PROVIDERS[parsed.planProvider] ? parsed.planProvider : DEFAULT_CONFIG.planProvider;

    return { extractProvider, planProvider };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function safeWriteConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage 在隐私模式/权限受限可能失败
  }
}

function ProviderOption({ groupName, value, selected, onChange, disabled = false }) {
  const p = PROVIDERS[value];
  const active = selected === value;

  return (
    <label
      className={[
        "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
        active ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 bg-white hover:bg-zinc-50",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      <input
        type="radio"
        name={groupName}
        value={value}
        checked={active}
        onChange={() => !disabled && onChange(value)}
        className="mt-1 h-4 w-4 accent-indigo-600"
        disabled={disabled}
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
  const [extractProvider, setExtractProvider] = useState(DEFAULT_CONFIG.extractProvider);
  const [planProvider, setPlanProvider] = useState(DEFAULT_CONFIG.planProvider);

  // 打开弹窗时读取 localStorage，保证“管理员改完下次打开还能看到”
  useEffect(() => {
    if (!isOpen) return;
    const cfg = safeReadConfig();
    setExtractProvider(cfg.extractProvider);
    setPlanProvider(cfg.planProvider);
  }, [isOpen]);

  const config = useMemo(
    () => ({ extractProvider, planProvider }),
    [extractProvider, planProvider]
  );

  const recommendations = useMemo(() => {
    return [
      {
        key: "value_best",
        title: "性价比最佳",
        desc: "Gemini（竞品提取） + Claude（方案生成）",
        match: extractProvider === "gemini" && planProvider === "claude",
      },
      {
        key: "quality_first",
        title: "质量优先",
        desc: "Claude（竞品提取） + Claude（方案生成）",
        match: extractProvider === "claude" && planProvider === "claude",
      },
      {
        key: "budget_limited",
        title: "预算有限",
        desc: "Gemini（竞品提取） + Gemini（方案生成）",
        match: extractProvider === "gemini" && planProvider === "gemini",
      },
    ];
  }, [extractProvider, planProvider]);

  const handleSave = () => {
    const cfg = { extractProvider, planProvider };
    safeWriteConfig(cfg);
    if (typeof onSave === "function") onSave(cfg);
    if (typeof onClose === "function") onClose();
  };

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onClose?.()}
      />

      {/* Modal */}
      <div className="relative z-10 w-[92vw] max-w-3xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-zinc-900">AI 配置</div>
              <div className="text-xs text-zinc-500">
                选择不同环节使用的 AI 提供商（仅开放可改部分）
              </div>
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

        {/* Body */}
        <div className="px-5 py-5">
          {/* Recommendations */}
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-zinc-900">推荐配置</div>
            <div className="grid gap-3 md:grid-cols-3">
              {recommendations.map((r) => (
                <RecommendationCard key={r.key} title={r.title} desc={r.desc} isActive={r.match} />
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Extract */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-zinc-900">竞品提取使用</div>
                <div className="text-xs text-zinc-500">Extract Competitor（结构化拆解）</div>
              </div>

              <div className="space-y-3">
                <ProviderOption
                  groupName="extract_provider"
                  value="gemini"
                  selected={extractProvider}
                  onChange={setExtractProvider}
                />
                <ProviderOption
                  groupName="extract_provider"
                  value="claude"
                  selected={extractProvider}
                  onChange={setExtractProvider}
                />
                <ProviderOption
                  groupName="extract_provider"
                  value="gpt4"
                  selected={extractProvider}
                  onChange={setExtractProvider}
                />
              </div>
            </div>

            {/* Plan */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-zinc-900">方案生成使用</div>
                <div className="text-xs text-zinc-500">Generate Plan（可执行作战计划）</div>
              </div>

              <div className="space-y-3">
                {/* 按你要求顺序：Claude / GPT-4 / Gemini */}
                <ProviderOption
                  groupName="plan_provider"
                  value="claude"
                  selected={planProvider}
                  onChange={setPlanProvider}
                />
                <ProviderOption
                  groupName="plan_provider"
                  value="gpt4"
                  selected={planProvider}
                  onChange={setPlanProvider}
                />
                <ProviderOption
                  groupName="plan_provider"
                  value="gemini"
                  selected={planProvider}
                  onChange={setPlanProvider}
                />
              </div>
            </div>
          </div>

          {/* Current */}
          <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">当前选择</div>
            <div className="mt-2 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
              <div className="rounded-xl bg-zinc-50 px-3 py-2">
                <span className="text-zinc-500">竞品提取：</span>
                <span className="font-semibold text-zinc-900">{PROVIDERS[extractProvider].name}</span>
                <span className="ml-2 text-xs text-zinc-500">{PROVIDERS[extractProvider].cost}</span>
              </div>
              <div className="rounded-xl bg-zinc-50 px-3 py-2">
                <span className="text-zinc-500">方案生成：</span>
                <span className="font-semibold text-zinc-900">{PROVIDERS[planProvider].name}</span>
                <span className="ml-2 text-xs text-zinc-500">{PROVIDERS[planProvider].cost}</span>
              </div>
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              提示：保存后会写入 <span className="font-mono">localStorage['ai_config']</span>，并通过回调同步到你的应用状态。
            </div>
          </div>
        </div>

        {/* Footer */}
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
