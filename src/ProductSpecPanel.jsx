import React from 'react'

function show(v) {
  if (v === undefined || v === null) return '-'
  const s = String(v).trim()
  return s === '' ? '-' : s
}

export default function ProductSpecPanel({ product }) {
  const sourceText = product?.is_ai_generated ? '来源：AI 创建（已审核）' : '来源：人工创建'

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">产品规格</h3>
        <span className="text-xs text-gray-400">{sourceText}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Block title="产品定位（positioning）" value={show(product.positioning)} />
        <Block title="主打功效（main_efficacy）" value={show(product.main_efficacy)} />
        <Block title="核心卖点（primary_benefit）" value={show(product.primary_benefit)} />
        <Block title="定价建议（pricing）" value={show(product.pricing ?? product.price)} />
      </div>

      <Block title="完整成分（ingredients）" value={show(product.ingredients)} />
      <Block title="包装需求（packaging_requirements）" value={show(product.packaging_requirements ?? product.packaging_design)} />

      <Block
        title="竞品分析（competitor_analysis）"
        value={show(product.competitor_analysis)}
      />
    </div>
  )
}

function Block({ title, value }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-2">{title}</div>
      <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{value}</div>
    </div>
  )
}
