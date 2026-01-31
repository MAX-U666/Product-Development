// src/components/ai-create/constants.js
// AI 创建产品 - 常量配置

export const CATEGORIES = [
  { value: 'Shampoo', label: '洗发水 Shampoo' },
  { value: 'Conditioner', label: '护发素 Conditioner' },
  { value: 'BodyWash', label: '沐浴露 Body Wash' },
  { value: 'BodyLotion', label: '身体乳 Body Lotion' },
  { value: 'HairMask', label: '发膜 Hair Mask' },
  { value: 'HairSerum', label: '护发精油 Hair Serum' },
];

export const MARKETS = [
  { value: 'Indonesia', label: '🇮🇩 印尼 Indonesia' },
  { value: 'Malaysia', label: '🇲🇾 马来西亚 Malaysia' },
  { value: 'Thailand', label: '🇹🇭 泰国 Thailand' },
  { value: 'Philippines', label: '🇵🇭 菲律宾 Philippines' },
  { value: 'Vietnam', label: '🇻🇳 越南 Vietnam' },
];

export const PLATFORMS = [
  { value: 'Shopee', label: 'Shopee' },
  { value: 'Lazada', label: 'Lazada' },
  { value: 'TikTok', label: 'TikTok Shop' },
  { value: 'Tokopedia', label: 'Tokopedia' },
];

export const AI_PROVIDERS = [
  { value: 'qwen', label: '🔮 通义千问 Qwen', desc: '阿里云，中文优化' },
  { value: 'deepseek', label: '🔬 DeepSeek', desc: '性价比高，推理强' },
  { value: 'gemini', label: '✨ Gemini', desc: 'Google，多模态' },
  { value: 'claude', label: '🧠 Claude', desc: 'Anthropic，逻辑强' },
];

// 获取类目中文名
export const getCategoryZh = (cat) => {
  const map = {
    'Shampoo': '洗发水',
    'Conditioner': '护发素',
    'BodyWash': '沐浴露',
    'BodyLotion': '身体乳',
    'HairMask': '发膜',
    'HairSerum': '护发精油'
  };
  return map[cat] || cat;
};
