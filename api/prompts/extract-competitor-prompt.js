/**
 * 竞品信息提取 Prompt
 * 从 Shopee 商品页面提取结构化数据
 */

export function buildExtractCompetitorPrompt(htmlContent) {
  return `
你是"电商竞品信息提取器"，专门从 Shopee 商品页面提取结构化数据。

## 任务
从给定的商品页面内容中提取关键信息。

## 输出格式（严格 JSON，不要任何解释）
{
  "name": "产品全名",
  "price": "价格（含货币符号，如 IDR 89,000）",
  "originalPrice": "原价（如有划线价）",
  "volume": "容量/规格",
  "sold": "已售数量",
  "rating": "评分",
  "ingredients": "主要成分（从详情页提取，用逗号分隔）",
  "benefits": ["功效1", "功效2", "功效3"],
  "keywords": ["标题中的关键词1", "关键词2"],
  "hasFreeship": true,
  "shopName": "店铺名"
}

## 提取规则
1. 价格优先取促销价，原价放 originalPrice
2. 成分从详情描述中提取，忽略水、防腐剂等基础成分
3. 功效从标题、卖点、详情中综合提取
4. 关键词提取标题中的核心词（品类词、功效词、成分词）
5. 如果某项信息不存在，用空字符串或空数组
6. 只输出 JSON，不要任何解释

## 输入内容
${htmlContent}
`.trim();
}

/**
 * 从图片提取竞品信息的 Prompt
 */
export function buildExtractFromImagePrompt() {
  return `
你是"电商竞品信息提取器"，专门从商品截图中提取结构化数据。

## 任务
从给定的商品截图中提取关键信息。

## 输出格式（严格 JSON，不要任何解释）
{
  "name": "产品全名（从截图中识别）",
  "price": "价格（含货币符号，如 IDR 89,000）",
  "originalPrice": "原价（如有划线价）",
  "volume": "容量/规格",
  "sold": "已售数量（如可见）",
  "rating": "评分（如可见）",
  "ingredients": "主要成分（如截图中可见）",
  "benefits": ["功效1", "功效2", "功效3"],
  "keywords": ["标题中的关键词1", "关键词2"],
  "shopName": "店铺名（如可见）"
}

## 提取规则
1. 仔细识别截图中的所有文字信息
2. 价格优先取促销价/红色价格
3. 成分从详情部分提取
4. 功效从标题和卖点中提取
5. 如果某项信息在截图中不可见，用空字符串或空数组
6. 只输出 JSON，不要任何解释

请分析图片并提取信息：
`.trim();
}
