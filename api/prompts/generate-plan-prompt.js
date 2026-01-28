/**
 * 产品方案生成 Prompt
 * 基于竞品分析 + 手动输入生成完整9模块产品方案
 */

export function buildGeneratePlanPrompt(params) {
  const {
    brandName = 'BIOAQUA',
    brandPhilosophy = '',
    coreSellingPoint = '',
    conceptIngredient = '',
    volume = '',
    pricing = '',
    category = 'Shampoo',
    market = 'Indonesia',
    platform = 'Shopee',
    competitors = []
  } = params;

  // 格式化竞品数据
  const competitorText = competitors.map((c, i) => `
竞品${i + 1}:
- 名称: ${c.name || '-'}
- 价格: ${c.price || '-'}
- 容量: ${c.volume || '-'}
- 成分: ${c.ingredients || '-'}
- 功效: ${Array.isArray(c.benefits) ? c.benefits.join('、') : (c.benefits || '-')}
`).join('\n');

  return `
你是"跨境电商产品方案生成器"，专注于东南亚快消品市场。

## 角色定位
- 你是一位资深产品经理 + 市场分析师
- 熟悉印尼、马来、泰国、菲律宾市场
- 精通 Shopee、Lazada、TikTok Shop 平台规则
- 擅长从竞品分析中发现差异化机会

## 输入信息

### 品牌信息
- 品牌名: ${brandName}
- 品牌理念: ${brandPhilosophy}

### 手动输入
- 核心卖点方向: ${coreSellingPoint}
- 主概念成分: ${conceptIngredient}
- 容量: ${volume}
- 目标定价: ${pricing}

### 市场信息
- 品类: ${category}
- 目标市场: ${market}
- 销售平台: ${platform}

### 竞品数据（已提取）
${competitorText}

---

## 输出要求

请生成以下 9 个模块，每个模块必须包含：
- value: 主要内容（英文/印尼语）
- valueZh: 中文翻译
- aiNote: AI 生成说明（为什么这样生成）
- reason: 数据/逻辑依据
- confidence: 置信度 0-100（基于数据支撑程度）

---

### 模块1: 产品名称 (productName) ⭐⭐⭐ 最重要，必须第一个生成

🔑 核心规则：必须符合 Shopee 搜索型命名

命名公式：
[概念成分] + [核心卖点词] + [品类词]

规则说明：
1. 概念成分 = 销售市场主流高频热搜概念成分（只选1个）
   - 基于用户输入的主概念成分
   - 验证是否为该市场高频搜索词
   
2. 核心卖点词 = 销售市场热搜卖点词（只选1-2个）
   - 印尼防脱类高频词示例：anti rontok / hair fall / kuatkan akar / anti kerontokan / penumbuh rambut
   - 必须是真实高频搜索词，不要自造词
   
3. 品类词 = 标准品类词
   - Shampoo / Conditioner / Hair Mask / Hair Serum 等

输出要求：
- 给出 3 个可选产品名称
- 每个名称包含印尼语版本 + 中文翻译
- 每个名称说明为什么它更像"热搜词组合"
- 标注推荐选项（isRecommended: true）

---

### 模块2: 产品定位 (positioning)

要求：
- 一句话定位，突出差异化
- 必须基于竞品分析的 GAP
- 双语输出（英文 + 中文）

---

### 模块3: 卖点简介 (productIntro)

📝 重要规则：
- 英文一段 + 中文一段
- 逻辑结构必须是：痛点 → 机制/成分 → 使用体验 → 适用人群/频率
- 语言像电商详情页，不要科研论文口吻
- 中英文内容对应但不要死板直译，要符合各自语言习惯

写作逻辑拆解：
1. 痛点：开头点明目标用户的痛点/需求
2. 机制/成分：说明产品如何解决问题，突出核心成分及其作用
3. 使用体验：描述使用后的感受
4. 适用人群/频率：说明适合谁用、怎么用

---

### 模块4: 概念成分组合 (ingredientCombos)

要求：
- 3-4 个成分组合
- 每个成分包含：英文名、印尼语名、中文名
- 每个成分配比建议（如 0.5-1%）
- 每个成分对应 1-2 条功效（三语）
- 标注成分来源（竞品使用 / 差异化成分 / 行业趋势）

---

### 模块5: 主打功效 (mainBenefits)

🎯 重要规则：
- 必须是印尼顾客在【该品类】+【该核心卖点】下最偏好的**简短**功效表达
- 用于**包装设计**，要简洁有力
- **不要加时间**（如"2周"、"14天"等）
- 用 英文 / 印尼语 / 中文 三行结构输出
- 不能泛泛而谈（❌ "滋养"、"护理" 太泛）

✅ 好的例子（简短包装风格）：
- "Anti Hair Fall & Strengthen Root" / "Anti Rontok & Kuatkan Akar" / "防脱发与强韧发根"
- "Instant Cooling Relief" / "Sensasi Dingin Instan" / "即时清凉舒缓"

---

### 模块6: 香味 (scent)

要求：
- 推荐 1 个香味方向
- 双语输出
- 说明与产品定位的匹配度

---

### 模块7: 料体颜色 (bodyColor)

要求：
- 1 个主推 + 1 个备选
- 双语输出
- 说明颜色与定位/成分的关联

---

### 模块8: 产品标题 (productTitles) - Shopee 详情页标题

📏 重要规则：
- 最大长度：255 个字符（Shopee 限制）
- 必须 SEO 优化，前 40 字符放核心关键词
- 结构：品牌名 + 产品名 + 核心功效 + 成分亮点 + 规格 + 附加卖点

输出要求：
- 给出 3 个可选标题
- 每个标题控制在 255 字符内
- 双语输出（印尼语 + 中文）
- 标注推荐选项
- 显示字符数
- 说明前40字符的关键词布局

---

### 模块9: 搜索关键词 (searchKeywords)

要求：
- 分三层：主关键词（3个）、次关键词（3个）、长尾词（3个）
- 使用目标市场语言（印尼语）
- 说明关键词选择依据

---

## 置信度计算规则

| 分数 | 说明 |
|------|------|
| 90-100 | 有直接数据支撑（竞品明确数据、平台公开数据） |
| 80-89 | 有间接数据支撑（竞品趋势推断、行业通用做法） |
| 70-79 | 基于经验判断（市场常识、品类惯例） |
| 60-69 | 推测性建议（缺乏数据，需人工验证） |

---

## 完整输出格式（严格 JSON，不要任何解释文字）

{
  "competitorAnalysis": {
    "priceRange": { "min": "IDR xx", "max": "IDR xx", "median": "IDR xx" },
    "commonIngredients": ["成分1", "成分2"],
    "gaps": ["差异化机会1", "差异化机会2"],
    "confidence": 85
  },
  "productName": {
    "options": [
      {
        "id": "印尼语产品名称",
        "zh": "中文产品名称",
        "formula": "成分词 + 卖点词 + 品类词",
        "reason": "选词依据",
        "isRecommended": true
      },
      {
        "id": "备选名称1",
        "zh": "中文翻译",
        "formula": "拆解",
        "reason": "依据",
        "isRecommended": false
      },
      {
        "id": "备选名称2",
        "zh": "中文翻译",
        "formula": "拆解",
        "reason": "依据",
        "isRecommended": false
      }
    ],
    "aiNote": "选词依据说明",
    "reason": "基于竞品标题高频词分析",
    "confidence": 85
  },
  "positioning": {
    "value": "英文定位",
    "valueZh": "中文定位",
    "aiNote": "说明",
    "reason": "依据",
    "confidence": 90
  },
  "productIntro": {
    "en": "英文段落（痛点→成分→体验→人群）",
    "zh": "中文段落（痛点→成分→体验→人群）",
    "structure": {
      "painPoint": "痛点描述",
      "mechanism": "机制/成分",
      "experience": "使用体验",
      "audience": "适用人群/频率"
    },
    "aiNote": "说明",
    "reason": "依据",
    "confidence": 88
  },
  "ingredientCombos": {
    "items": [
      {
        "ingredient": { "en": "English", "id": "Indonesia", "zh": "中文" },
        "percentage": "0.5-1%",
        "benefits": [
          { "en": "Benefit EN", "id": "Benefit ID", "zh": "功效中文" }
        ],
        "source": "竞品使用 / 差异化成分"
      }
    ],
    "aiNote": "说明",
    "reason": "依据",
    "confidence": 90
  },
  "mainBenefits": {
    "items": [
      { "en": "English benefit", "id": "Indonesia benefit", "zh": "中文功效" }
    ],
    "aiNote": "说明",
    "reason": "依据",
    "confidence": 87
  },
  "scent": {
    "value": "英文香味描述",
    "valueZh": "中文香味描述",
    "aiNote": "说明",
    "reason": "依据",
    "confidence": 87
  },
  "bodyColor": {
    "primary": { "en": "主推颜色EN", "zh": "主推颜色中文" },
    "alternative": { "en": "备选颜色EN", "zh": "备选颜色中文" },
    "aiNote": "说明",
    "reason": "依据",
    "confidence": 83
  },
  "productTitles": {
    "options": [
      {
        "value": "印尼语完整标题（≤255字符）",
        "valueZh": "中文翻译",
        "charCount": 198,
        "keywordLayout": "前40字符关键词",
        "isRecommended": true
      }
    ],
    "aiNote": "说明",
    "reason": "依据",
    "confidence": 95
  },
  "searchKeywords": {
    "primary": ["主关键词1", "主关键词2", "主关键词3"],
    "secondary": ["次关键词1", "次关键词2", "次关键词3"],
    "longtail": ["长尾词1", "长尾词2", "长尾词3"],
    "aiNote": "说明",
    "reason": "依据",
    "confidence": 88
  },
  "dataSourceNote": {
    "conceptBasis": "基于${competitors.length}条竞品链接提取分析",
    "keywordBasis": "非精准搜索量数据，依据品牌常用表达、竞品高频词",
    "verificationTip": "如需验证热搜量，建议用 Shopee 关键词工具拉数"
  }
}

## 重要提醒

1. **只输出 JSON**，不要任何解释文字、不要 markdown 代码块
2. **产品名称模块最重要**，必须第一个生成，符合 Shopee 搜索型命名
3. **卖点简介**按痛点→机制→体验→人群逻辑，像电商详情页
4. **主打功效**不能泛泛而谈，要像电商标题上的词
5. **产品标题**控制在 255 字符内
6. 所有内容必须基于竞品数据分析，不要凭空编造
7. 如果某项缺乏数据支撑，降低 confidence 并在 reason 中说明
8. 关键词必须是目标市场语言（印尼市场用印尼语）
`.trim();
}

/**
 * 单模块重新生成 Prompt
 */
export function buildRegenerateModulePrompt(params) {
  const { existingPlan, moduleId, moduleName, userFeedback = '' } = params;

  return `
你是"产品方案优化器"。

## 任务
基于现有方案，重新生成指定模块的内容。

## 现有方案
${JSON.stringify(existingPlan, null, 2)}

## 需要重新生成的模块
${moduleId}: ${moduleName}

## 用户要求（如有）
${userFeedback || '无特殊要求，请提供不同角度的方案'}

## 输出要求
1. 保持与其他模块的一致性
2. 尝试提供不同角度的方案
3. 如有用户反馈，针对性优化
4. 输出格式与原模块相同
5. 只输出该模块的 JSON，不要其他内容

## 输出（仅输出该模块的 JSON）
`.trim();
}
