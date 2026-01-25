// File: src/ProductFormAI/Step4Review.jsx

import React from "react";
import { Save, Loader } from "lucide-react";
import StepHeader from "./components/StepHeader";
import FieldRow from "./components/FieldRow";

export default function Step4Review({
  step3Done,
  formData,
  setFormData,
  aiExplain,
  currentUser,
  handleSaveDraft,
  savingDraft,
}) {
  if (!step3Done) return null;

  return (
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
            <div className="font-semibold text-zinc-900">{currentUser?.id ?? "—"}</div>
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
          {savingDraft ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {savingDraft ? '保存中...' : '💾 保存草稿'}
        </button>
      </div>
    </div>
  );
}
