/**
 * /api/extract-competitor
 * 
 * V6 版本：
 * - 使用与 Gemini 聊天相同的提示词格式
 * - 简化 Prompt，让 AI 更自然地分析
 * - 后处理：从 AI 返回的文本中提取结构化数据
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

// ========== Gemini 调用 ==========
async function callGemini(prompt) {
  const key = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  };

  console.log(`📡 调用 Gemini: ${model}`);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  
  if (!res.ok) {
    const msg = json?.error?.message || JSON.stringify(json) || `HTTP_${res.status}`;
    throw new Error(`GEMINI_ERROR:${msg}`);
  }

  const text = json?.candidates?.[0]?.content?.parts?.map(p => p?.text).filter(Boolean).join("") || "";
  return text.trim();
}

// 其他 AI 提供商
async function callQwen(prompt) {
  const key = requireEnv("DASHSCOPE_API_KEY");
  const model = process.env.DASHSCOPE_MODEL || "qwen-max";
  const baseURL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`QWEN_ERROR:${json.error?.message || JSON.stringify(json)}`);
  return json.choices?.[0]?.message?.content?.trim() || "";
}

async function callDeepSeek(prompt) {
  const key = requireEnv("DEEPSEEK_API_KEY");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`DEEPSEEK_ERROR:${json.error?.message || JSON.stringify(json)}`);
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
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`CLAUDE_ERROR:${json?.error?.message || JSON.stringify(json)}`);
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

    // 使用与 Gemini 聊天相同的简单提示词
    const prompt = buildSimplePrompt(url);

    let raw = "";
    
    if (provider === "gemini") {
      raw = await callGemini(prompt);
    } else if (provider === "qwen") {
      raw = await callQwen(prompt);
    } else if (provider === "deepseek") {
      raw = await callDeepSeek(prompt);
    } else if (provider === "claude") {
      raw = await callClaude(prompt);
    } else {
      raw = await callGemini(prompt);
    }

    console.log(`📥 AI 返回长度: ${raw.length}`);
    console.log(`📥 AI 返回预览: ${raw.slice(0, 500)}...`);

    // 从 AI 返回的文本中提取结构化数据
    const structuredData = extractStructuredData(raw, url);
    
    console.log(`✅ 提取成功: ${structuredData.name}, 价格: ${structuredData.price}`);

    sendJson(res, 200, {
      success: true,
      provider,
      data: structuredData,
      raw_analysis: raw, // 保留原始分析文本
    });

  } catch (e) {
    const msg = String(e?.message || e);
    console.error("❌ Extract error:", msg);
    sendJson(res, 500, { success: false, error: msg });
  }
}

// ========== 简单提示词（模仿聊天格式）==========

function buildSimplePrompt(url) {
  return `${url}

看一下这个产品的卖点、价格、关键词分别是什么？提炼他的评论区差评，我如果做一款产品能怎么比他更好。

请按以下格式输出：

### 1. 产品核心信息分析
* **产品名称**：
* **价格 (Price)**：
  * **折后价**：
  * **原价**：
  * **定位**：
* **规格**：
* **销量**：
* **评分**：
* **评论数**：

* **关键词 (Keywords)**：

* **核心卖点 (Selling Points)**：
1. 
2. 
3. 

* **主要成分**：

### 2. 评论区差评/痛点提炼 (Pain Points)
* 
* 
* 

### 3. 如何做一个更好的产品（竞争策略）
#### A. 
#### B. 
#### C. 
`;
}

// ========== 从 AI 返回文本中提取结构化数据 ==========

function extractStructuredData(text, sourceUrl) {
  // 提取产品名称
  const nameMatch = text.match(/\*\*产品名称\*\*[：:]\s*(.+?)(?:\n|$)/i) 
    || text.match(/产品名称[：:]\s*(.+?)(?:\n|$)/i)
    || text.match(/这款产品是\s*\*\*(.+?)\*\*/i);
  const name = nameMatch ? nameMatch[1].replace(/\*\*/g, '').trim() : extractFromUrl(sourceUrl);

  // 提取品牌
  const brandMatch = text.match(/\*\*品牌\*\*[：:]\s*(.+?)(?:\n|$)/i)
    || text.match(/品牌[：:]\s*(.+?)(?:\n|$)/i);
  const brand = brandMatch ? brandMatch[1].replace(/\*\*/g, '').trim() : extractBrandFromName(name);

  // 提取价格 - 多种格式匹配
  let price = '';
  let originalPrice = '';
  
  // 匹配 "折后价：约 Rp 55,900 - Rp 59,900"
  const priceMatch1 = text.match(/折后价[：:]\s*约?\s*(Rp\s*[\d.,]+(?:\s*[-–]\s*Rp\s*[\d.,]+)?)/i);
  if (priceMatch1) price = priceMatch1[1].trim();
  
  // 匹配 "价格：Rp 27,600"
  if (!price) {
    const priceMatch2 = text.match(/价格[^：:]*[：:]\s*(Rp\s*[\d.,]+)/i);
    if (priceMatch2) price = priceMatch2[1].trim();
  }
  
  // 匹配任意 Rp 价格
  if (!price) {
    const priceMatch3 = text.match(/Rp\s*[\d.,]+/i);
    if (priceMatch3) price = priceMatch3[0].trim();
  }
  
  // 提取原价
  const originalPriceMatch = text.match(/原价[：:]\s*(Rp\s*[\d.,]+)/i);
  if (originalPriceMatch) originalPrice = originalPriceMatch[1].trim();

  // 提取规格/容量
  const volumeMatch = text.match(/规格[：:]\s*(.+?)(?:\n|$)/i)
    || text.match(/容量[：:]\s*(.+?)(?:\n|$)/i)
    || text.match(/\((\d+\s*(?:ml|g|gr|oz|pcs))\)/i);
  const volume = volumeMatch ? volumeMatch[1].replace(/\*\*/g, '').trim() : '';

  // 提取销量
  const salesMatch = text.match(/销量[：:]\s*(.+?)(?:\n|$)/i)
    || text.match(/([\d.,]+\s*(?:rb|k|万|千)?\s*(?:terjual|sold|已售))/i);
  const sales = salesMatch ? salesMatch[1].replace(/\*\*/g, '').trim() : '';

  // 提取评分
  const ratingMatch = text.match(/评分[：:]\s*([\d.]+)/i)
    || text.match(/(\d\.\d)\s*分/i);
  const rating = ratingMatch ? ratingMatch[1].trim() : '';

  // 提取评论数
  const reviewMatch = text.match(/评论数[：:]\s*([\d.,]+)/i)
    || text.match(/([\d.,]+)\s*(?:条)?评[论价]/i);
  const reviewCount = reviewMatch ? reviewMatch[1].trim() : '';

  // 提取关键词
  const keywordsSection = text.match(/关键词[^：:]*[：:]([^*#]+?)(?:\n\n|\n\*|###)/is);
  let titleKeywords = [];
  if (keywordsSection) {
    const kwText = keywordsSection[1];
    // 匹配括号内的内容或逗号分隔的词
    const kwMatches = kwText.match(/[（(]([^）)]+)[）)]/g) || kwText.match(/[\u4e00-\u9fa5a-zA-Z\-]+/g);
    if (kwMatches) {
      titleKeywords = kwMatches.map(k => k.replace(/[（()）]/g, '').trim()).filter(k => k.length > 1).slice(0, 10);
    }
  }

  // 提取卖点
  const sellingPointsSection = text.match(/核心卖点[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is)
    || text.match(/Selling Points[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is);
  let sellingPoints = [];
  if (sellingPointsSection) {
    const spText = sellingPointsSection[1];
    // 匹配 1. xxx 或 * xxx 或 - xxx 格式
    const spMatches = spText.match(/(?:^\s*[\d\*\-•]+\.?\s*)(.+?)(?=\n|$)/gm);
    if (spMatches) {
      sellingPoints = spMatches.map(s => s.replace(/^[\s\d\*\-•.]+/, '').replace(/\*\*/g, '').trim()).filter(s => s.length > 5).slice(0, 6);
    }
  }

  // 提取成分
  const ingredientsSection = text.match(/主要成分[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is)
    || text.match(/成分[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is);
  let ingredients = [];
  if (ingredientsSection) {
    const ingText = ingredientsSection[1];
    const ingMatches = ingText.match(/[A-Za-z\u4e00-\u9fa5]+(?:\s*(?:Acid|Extract|Oil))?/g);
    if (ingMatches) {
      ingredients = ingMatches.filter(i => i.length > 2).slice(0, 8).map(name => ({ name, benefit: '' }));
    }
  }

  // 提取痛点
  const painPointsSection = text.match(/痛点[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is)
    || text.match(/差评[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is)
    || text.match(/Pain Points[^：:]*[：:]([^#]+?)(?:###|---|\n\n\n)/is);
  let painPoints = [];
  if (painPointsSection) {
    const ppText = painPointsSection[1];
    const ppMatches = ppText.match(/\*\*([^*]+)\*\*[：:]([^*\n]+)/g)
      || ppText.match(/\*\s+\*\*([^*]+)\*\*[：:]?([^*\n]*)/g)
      || ppText.match(/\*\s+([^：:\n]+)[：:]([^\n]+)/g);
    if (ppMatches) {
      painPoints = ppMatches.map(p => {
        const parts = p.replace(/\*/g, '').split(/[：:]/);
        return {
          category: parts[0]?.trim() || '其他',
          description: parts[1]?.trim() || p.replace(/\*/g, '').trim(),
          frequency: '中频'
        };
      }).filter(p => p.description.length > 5).slice(0, 5);
    }
  }

  // 提取差异化机会
  const opportunitiesSection = text.match(/如何做一个更好的产品([^]+?)(?:总结建议|$)/is)
    || text.match(/竞争策略([^]+?)(?:总结|$)/is);
  let opportunities = [];
  if (opportunitiesSection) {
    const oppText = opportunitiesSection[1];
    const oppMatches = oppText.match(/####\s*([A-Z])\.\s*([^\n]+)/g);
    if (oppMatches) {
      opportunities = oppMatches.map(o => {
        const match = o.match(/####\s*[A-Z]\.\s*(.+)/);
        return {
          dimension: match ? match[1].replace(/[（(].+[)）]/g, '').trim() : o,
          suggestion: ''
        };
      }).slice(0, 5);
    }
    
    // 如果没匹配到，尝试其他格式
    if (opportunities.length === 0) {
      const oppMatches2 = oppText.match(/\*\*([^*]+)\*\*/g);
      if (oppMatches2) {
        opportunities = oppMatches2.map(o => ({
          dimension: o.replace(/\*/g, '').trim(),
          suggestion: ''
        })).slice(0, 5);
      }
    }
  }

  // 提取定位
  const positioningMatch = text.match(/定位[：:]\s*([^*\n]+)/i);
  const pricePositioning = positioningMatch ? positioningMatch[1].replace(/\*\*/g, '').trim() : '';

  // 提取目标人群
  const audienceMatch = text.match(/目标人群[：:]\s*([^*\n]+)/i)
    || text.match(/针对([^，。\n]+)人群/i);
  const targetAudience = audienceMatch ? audienceMatch[1].replace(/\*\*/g, '').trim() : '';

  return {
    name: name || '',
    brand: brand || '',
    price: price || '',
    original_price: originalPrice || '',
    volume: volume || '',
    sales: sales || '',
    rating: rating || '',
    review_count: reviewCount || '',
    
    title: name || '',
    title_keywords: titleKeywords,
    title_analysis: '',
    
    selling_points: sellingPoints,
    ingredients: ingredients,
    
    pain_points: painPoints,
    opportunities: opportunities,
    
    price_positioning: pricePositioning,
    target_audience: targetAudience,
    
    source_url: sourceUrl,
    benefits: sellingPoints,
  };
}

// 从 URL 提取产品名
function extractFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/([^\/]+)-i\.\d+\.\d+/);
    if (match) {
      return decodeURIComponent(match[1]).replace(/-/g, ' ');
    }
    return '';
  } catch {
    return '';
  }
}

// 从产品名提取品牌
function extractBrandFromName(name) {
  const brands = ['BIOAQUA', 'LAIKOU', 'IMAGES', 'SOME BY MI', 'COSRX', 'SKINTIFIC',
                  'WARDAH', 'EMINA', 'GARNIER', 'POND\'S', 'NIVEA', 'VASELINE',
                  'LOREAL', 'MAYBELLINE', 'INNISFREE', 'NATURE REPUBLIC', 'ETUDE',
                  'THE ORDINARY', 'CERAVE', 'LOLA ROSE', 'ZADA', 'SCARLETT'];
  
  const nameLower = (name || '').toLowerCase();
  for (const brand of brands) {
    if (nameLower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return '';
}
