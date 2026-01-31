/**
 * /api/extract-competitor
 * 
 * V8 版本：使用正确的 Gemini URL Context 工具
 * 
 * 根据 Google 官方文档，需要使用 `url_context` 工具来访问网页
 * https://ai.google.dev/gemini-api/docs/url-context
 */

import { readJson, sendJson, requirePost, normalizeProvider } from "./_utils.js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

function safeParseJson(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ========== Gemini 使用 URL Context 工具 ==========
async function callGeminiWithUrlContext(prompt, url) {
  const key = requireEnv("GEMINI_API_KEY");
  // 使用支持 url_context 的模型
  // gemini-2.0-flash 支持 url_context
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  // 关键：使用 url_context 工具
  const body = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    tools: [
      { url_context: {} }  // ← 这是关键！启用 URL Context 工具
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  };

  console.log(`📡 调用 Gemini with url_context: ${model}`);
  console.log(`📡 请求体:`, JSON.stringify(body, null, 2));

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  
  console.log(`📡 响应状态: ${res.status}`);
  
  if (!res.ok) {
    console.log(`❌ API 错误:`, JSON.stringify(json, null, 2));
    const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
    throw new Error(`GEMINI_ERROR:${msg}`);
  }

  // 检查是否有 url_context_metadata
  const urlMetadata = json?.candidates?.[0]?.url_context_metadata;
  if (urlMetadata) {
    console.log(`✅ URL Context 成功! 访问的 URL:`, urlMetadata);
  }

  const text = json?.candidates?.[0]?.content?.parts?.map(p => p?.text).filter(Boolean).join("") || "";
  return text.trim();
}

// 备用：普通 Gemini 调用（不使用 url_context）
async function callGeminiPlain(prompt) {
  const key = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`GEMINI_ERROR:${json?.error?.message || res.status}`);
  }

  return json?.candidates?.[0]?.content?.parts?.map(p => p?.text).filter(Boolean).join("") || "";
}

// 其他 AI 提供商
async function callQwen(prompt) {
  const key = requireEnv("DASHSCOPE_API_KEY");
  const model = process.env.DASHSCOPE_MODEL || "qwen-max";
  const baseURL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  
  const json = await res.json();
  if (!res.ok) throw new Error(`QWEN_ERROR:${json.error?.message}`);
  return json.choices?.[0]?.message?.content?.trim() || "";
}

async function callClaude(prompt) {
  const key = requireEnv("ANTHROPIC_API_KEY");
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`CLAUDE_ERROR:${json?.error?.message}`);
  return json?.content?.filter(c => c?.type === "text")?.map(c => c?.text)?.join("") || "";
}

// ========== 主处理函数 ==========

export default async function handler(req, res) {
  try {
    if (!requirePost(req, res)) return;

    const body = await readJson(req);
    const provider = normalizeProvider(body?.ai_config?.extract_provider) || "gemini";
    const url = body?.url;

    if (!url || typeof url !== "string") {
      sendJson(res, 400, { success: false, error: "MISSING_URL" });
      return;
    }

    console.log(`📤 提取竞品: ${url}, provider: ${provider}`);

    // 构建 Prompt（包含 URL）
    const prompt = buildAnalysisPrompt(url);

    let raw = "";
    
    if (provider === "gemini") {
      // 使用 url_context 工具
      try {
        raw = await callGeminiWithUrlContext(prompt, url);
      } catch (e) {
        console.log(`⚠️ url_context 失败: ${e.message}，尝试普通模式`);
        raw = await callGeminiPlain(prompt);
      }
    } else if (provider === "qwen") {
      raw = await callQwen(prompt);
    } else if (provider === "claude") {
      raw = await callClaude(prompt);
    } else {
      raw = await callGeminiWithUrlContext(prompt, url);
    }

    console.log(`📥 AI 返回长度: ${raw.length}`);
    console.log(`📥 AI 返回预览: ${raw.slice(0, 500)}...`);

    // 解析结果
    const obj = safeParseJson(raw);
    
    if (obj) {
      const result = normalizeResult(obj, url);
      console.log(`✅ JSON 解析成功: ${result.name}, 价格: ${result.price}`);
      sendJson(res, 200, { success: true, provider, data: result });
    } else {
      // 从文本中提取
      const result = extractStructuredData(raw, url);
      console.log(`✅ 文本提取: ${result.name}, 价格: ${result.price}`);
      sendJson(res, 200, { success: true, provider, data: result, raw_analysis: raw });
    }

  } catch (e) {
    console.error("❌ Extract error:", e.message);
    sendJson(res, 500, { success: false, error: e.message });
  }
}

// ========== Prompt ==========

function buildAnalysisPrompt(url) {
  return `
请访问并分析以下电商商品链接：

${url}

## 分析任务

1. **产品核心信息**：
   - 产品名称（简洁版本）
   - 品牌名
   - 当前售价（保留货币符号，如 Rp 27,600）
   - 原价（如有划线价）
   - 规格/容量（如 30ml, 120g）
   - 销量
   - 评分
   - 评论数

2. **关键词**：从标题中提取 SEO 关键词

3. **核心卖点**：产品主打的功效和卖点（至少3条）

4. **主要成分**：核心成分及其功效

5. **差评痛点**：用户可能的不满（至少3条）

6. **差异化机会**：如何做得更好（至少3条建议）

## 价格注意事项
- 印尼盾价格通常是5-6位数
- 价格中的 "." 是千位分隔符，不是小数点
- 例如：Rp 18.500 = Rp 18,500（一万八千五百）
- 请输出完整价格

## 输出格式

只输出 JSON，不要任何解释文字：

{
  "name": "产品名称",
  "brand": "品牌",
  "price": "售价（如 Rp 27,600）",
  "original_price": "原价",
  "volume": "规格",
  "sales": "销量",
  "rating": "评分",
  "review_count": "评论数",
  
  "title": "完整标题",
  "title_keywords": ["关键词1", "关键词2", "关键词3"],
  
  "selling_points": [
    "卖点1",
    "卖点2",
    "卖点3"
  ],
  
  "ingredients": [
    {"name": "成分", "benefit": "功效"}
  ],
  
  "pain_points": [
    {"category": "分类", "description": "描述", "frequency": "频率"}
  ],
  
  "opportunities": [
    {"dimension": "维度", "suggestion": "建议"}
  ],
  
  "price_positioning": "价格定位",
  "target_audience": "目标人群"
}
`.trim();
}

// ========== 从文本提取结构化数据 ==========

function extractStructuredData(text, sourceUrl) {
  // 提取产品名称
  const nameMatch = text.match(/\*\*产品名称\*\*[：:]\s*(.+?)(?:\n|$)/i) 
    || text.match(/产品名称[：:]\s*(.+?)(?:\n|$)/i)
    || text.match(/这款[^是]*是\s*\*\*(.+?)\*\*/i);
  const name = nameMatch ? nameMatch[1].replace(/\*\*/g, '').trim() : '';

  // 提取品牌
  const brandMatch = text.match(/品牌[：:]\s*(.+?)(?:\n|$)/i);
  const brand = brandMatch ? brandMatch[1].replace(/\*\*/g, '').trim() : '';

  // 提取价格
  let price = '';
  const priceMatch = text.match(/折后价[：:]\s*约?\s*(Rp\s*[\d.,]+(?:\s*[-–]\s*Rp\s*[\d.,]+)?)/i)
    || text.match(/价格[^：:]*[：:][^R]*?(Rp\s*[\d.,]+)/i)
    || text.match(/Rp\s*[\d.,]+/i);
  if (priceMatch) price = (priceMatch[1] || priceMatch[0]).trim();

  // 提取原价
  let originalPrice = '';
  const originalPriceMatch = text.match(/原价[：:]\s*(Rp\s*[\d.,]+)/i);
  if (originalPriceMatch) originalPrice = originalPriceMatch[1].trim();

  // 提取规格
  const volumeMatch = text.match(/规格[：:]\s*(.+?)(?:\n|$)/i)
    || text.match(/\((\d+\s*(?:ml|g|gr|oz|pcs))\)/i);
  const volume = volumeMatch ? (volumeMatch[1] || volumeMatch[0]).replace(/\*\*/g, '').trim() : '';

  // 提取销量
  const salesMatch = text.match(/销量[：:]\s*(.+?)(?:\n|$)/i);
  const sales = salesMatch ? salesMatch[1].replace(/\*\*/g, '').trim() : '';

  // 提取评分
  const ratingMatch = text.match(/评分[：:]\s*([\d.]+)/i);
  const rating = ratingMatch ? ratingMatch[1].trim() : '';

  // 提取评论数
  const reviewMatch = text.match(/评论数[：:]\s*([\d.,]+)/i);
  const reviewCount = reviewMatch ? reviewMatch[1].trim() : '';

  // 提取关键词
  let titleKeywords = [];
  const keywordsSection = text.match(/关键词[^：:]*[：:]([^#]+?)(?:\n\n|\*\*核心|###)/is);
  if (keywordsSection) {
    const kwMatches = keywordsSection[1].match(/[（(]([^）)]+)[）)]/g) 
      || keywordsSection[1].match(/[\u4e00-\u9fa5a-zA-Z\-]+/g);
    if (kwMatches) {
      titleKeywords = kwMatches.map(k => k.replace(/[（()）]/g, '').trim()).filter(k => k.length > 1).slice(0, 10);
    }
  }

  // 提取卖点
  let sellingPoints = [];
  const spSection = text.match(/核心卖点[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n|主要成分)/is)
    || text.match(/卖点[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is);
  if (spSection) {
    const spMatches = spSection[1].match(/\d+\.\s*\*\*([^*]+)\*\*/g);
    if (spMatches) {
      sellingPoints = spMatches.map(s => s.replace(/[\d.*]/g, '').trim()).slice(0, 6);
    }
  }

  // 提取成分
  let ingredients = [];
  const ingSection = text.match(/主[要打]成分[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n|差评)/is);
  if (ingSection) {
    const ingMatches = ingSection[1].match(/\d+\.\s*\*\*([^*]+)\*\*/g);
    if (ingMatches) {
      ingredients = ingMatches.map(i => ({ name: i.replace(/[\d.*]/g, '').trim(), benefit: '' })).slice(0, 6);
    }
  }

  // 提取痛点
  let painPoints = [];
  const ppSection = text.match(/痛点[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n|如何做)/is)
    || text.match(/差评[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is);
  if (ppSection) {
    const ppMatches = ppSection[1].match(/\d+\.\s*\*\*([^*]+)\*\*[^：:]*[：:]([^\n]+)/g);
    if (ppMatches) {
      painPoints = ppMatches.map(p => {
        const m = p.match(/\*\*([^*]+)\*\*[^：:]*[：:](.+)/);
        return {
          category: m ? m[1].trim() : '其他',
          description: m ? m[2].trim() : p.replace(/[\d.*]/g, '').trim(),
          frequency: '中频'
        };
      }).slice(0, 5);
    }
  }

  // 提取机会
  let opportunities = [];
  const oppSection = text.match(/如何做一个更好的产品([^]+?)(?:总结|💡|$)/is);
  if (oppSection) {
    const oppMatches = oppSection[1].match(/####\s*[A-Z]\.\s*([^\n]+)/g);
    if (oppMatches) {
      opportunities = oppMatches.map(o => {
        const m = o.match(/####\s*[A-Z]\.\s*(.+)/);
        return { dimension: m ? m[1].trim() : o, suggestion: '' };
      }).slice(0, 5);
    }
  }

  // 定位和人群
  const positioningMatch = text.match(/定位[：:]\s*([^*\n]+)/i);
  const pricePositioning = positioningMatch ? positioningMatch[1].trim() : '';

  const audienceMatch = text.match(/目标人群[：:]\s*([^*\n]+)/i);
  const targetAudience = audienceMatch ? audienceMatch[1].trim() : '';

  return {
    name, brand, price, original_price: originalPrice, volume, sales, rating, review_count: reviewCount,
    title: name, title_keywords: titleKeywords, title_analysis: '',
    selling_points: sellingPoints, ingredients, pain_points: painPoints, opportunities,
    price_positioning: pricePositioning, target_audience: targetAudience,
    source_url: sourceUrl, benefits: sellingPoints,
  };
}

// ========== 标准化结果 ==========

function normalizeResult(obj, url) {
  let price = obj.price || "";
  
  // 修正过小的价格
  const priceNum = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  if (priceNum > 0 && priceNum < 1000) {
    price = `Rp ${Math.round(priceNum * 1000).toLocaleString('id-ID')}`;
  }
  
  if (price && !/rp|idr/i.test(price)) {
    const num = parseFloat(String(price).replace(/[^0-9.]/g, ''));
    if (num > 0) price = `Rp ${num.toLocaleString('id-ID')}`;
  }

  return {
    name: obj.name || "",
    brand: obj.brand || "",
    price,
    original_price: obj.original_price || "",
    volume: obj.volume || "",
    sales: obj.sales || "",
    rating: obj.rating || "",
    review_count: obj.review_count || "",
    title: obj.title || obj.name || "",
    title_keywords: Array.isArray(obj.title_keywords) ? obj.title_keywords : [],
    selling_points: Array.isArray(obj.selling_points) ? obj.selling_points : [],
    ingredients: Array.isArray(obj.ingredients) ? obj.ingredients : [],
    pain_points: Array.isArray(obj.pain_points) ? obj.pain_points : [],
    opportunities: Array.isArray(obj.opportunities) ? obj.opportunities : [],
    price_positioning: obj.price_positioning || "",
    target_audience: obj.target_audience || "",
    source_url: url,
    benefits: Array.isArray(obj.selling_points) ? obj.selling_points : [],
  };
}
