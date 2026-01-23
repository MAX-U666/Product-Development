// src/content/aiSchema.js
export const ContentAIOutputSchema = {
  type: 'object',
  required: ['title', 'copy', 'image_brief'],
  properties: {
    title: { type: 'string', description: '可上架标题（符合平台规则）' },
    copy: { type: 'string', description: '详情文案（可Markdown）' },
    image_brief: { type: 'object', description: '图片需求表（与 defaultImageBrief 同结构）' }
  }
}

// 给 AI 的输入（你将来做“事实层只读”就是这份）
export function buildAIInput({ product, packaging }) {
  return {
    product_facts: {
      product_id: product?.id,
      name: product?.name,
      category: product?.category,
      volume: product?.volume,
      ingredients: product?.ingredients,
      claims_allowed: product?.claims_allowed,
      claims_forbidden: product?.claims_forbidden,
    },
    packaging_facts: {
      bottle: packaging?.bottle,
      label_style: packaging?.label_style,
      colors: packaging?.colors,
      images: packaging?.images,
    },
    output_contract: 'Return JSON with keys: title, copy, image_brief. No extra text.'
  }
}
