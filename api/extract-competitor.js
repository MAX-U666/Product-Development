/**
 * /api/extract-competitor
 * 
 * 优化版 V3：
 * - 改进价格提取 Prompt
 * - 增强对印尼盾价格格式的处理
 * - 先抓取 HTML 再让 AI 分析
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

// ========== AI 调用函数 ==========

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
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };

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

async function callQwen(prompt) {
  const key = requireEnv("DASHSCOPE_API_KEY");
  const model = process.env.DASHSCOPE_MODEL || "qwen-max";
  const baseURL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const url = `${baseURL}/chat/completions`;

  const res = await fetch(url, {
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

    // 1. 先抓取 HTML
    const html = await fetchHtml(url);
    console.log(`📥 HTML 长度: ${html.length}`);

    // 2. 构建 Prompt
    const prompt = buildAnalysisPrompt(url, html);

    // 3. 调用 AI
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

    // 4. 解析 JSON
    const obj = safeParseJson(raw);
    
    if (!obj || typeof obj !== "object") {
      // 如果不是 JSON，尝试从文本中提取
      console.log("⚠️ AI 返回非 JSON，尝试文本提取");
      sendJson(res, 200, {
        success: true,
        provider,
        data: {
          name: extractField(raw, "产品名称") || extractField(raw, "name") || "",
          price: extractField(raw, "价格") || extractField(raw, "price") || "",
          raw_analysis: raw,
          source_url: url
        },
        raw_response: raw
      });
      return;
    }

    // 5. 标准化并返回
    const result = normalizeResult(obj, url);
    console.log(`✅ 提取成功: ${result.name}, 价格: ${result.price}`);
    
    sendJson(res, 200, {
      success: true,
      provider,
      data: result,
    });

  } catch (e) {
    const msg = String(e?.message || e);
    console.error("❌ Extract error:", msg);
    sendJson(res, 500, { success: false, error: msg });
  }
}

// ========== 抓取 HTML ==========

async function fetchHtml(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,id;q=0.8,zh-CN;q=0.7,zh;q=0.6",
        "accept-encoding": "gzip, deflate, br",
        "cache-control": "no-cache",
        "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
    });

    clearTimeout(timeout);

    let html = await r.text().catch(() => "");
    
    // 限制长度但保留关键部分
    if (html.length > 120000) {
      // 尝试保留价格和产品信息相关的部分
      const priceSection = html.match(/<script[^>]*>[\s\S]*?price[\s\S]*?<\/script>/gi)?.join('\n') || '';
      const productSection = html.match(/<script[^>]*>[\s\S]*?product[\s\S]*?<\/script>/gi)?.join('\n') || '';
      html = html.slice(0, 80000) + '\n---SCRIPTS---\n' + priceSection.slice(0, 20000) + productSection.slice(0, 20000);
    }
    
    return html;
  } catch (e) {
    console.error("Fetch HTML error:", e.message);
    return "";
  }
}

// ========== 从文本中提取字段 ==========

function extractField(text, fieldName) {
  const patterns = [
    new RegExp(`"${fieldName}"\\s*:\\s*"([^"]+)"`, 'i'),
    new RegExp(`${fieldName}[：:：]\\s*([^\\n]+)`, 'i'),
    new RegExp(`\\*\\*${fieldName}\\*\\*[：:：]?\\s*([^\\n]+)`, 'i'),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return "";
}

// ========== 深度分析 Prompt ==========

function buildAnalysisPrompt(url, html) {
  // 从 HTML 中提取一些有用的信息
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  const jsonLdData = jsonLdMatch ? jsonLdMatch[1] : '';
  
  // 尝试找价格相关的数据
  const pricePatterns = [
    /\"price\"\s*:\s*(\d[\d.,]*)/gi,
    /\"salePrice\"\s*:\s*(\d[\d.,]*)/gi,
    /\"discountedPrice\"\s*:\s*(\d[\d.,]*)/gi,
    /Rp\s*([\d.,]+)/gi,
    /IDR\s*([\d.,]+)/gi,
  ];
  
  const foundPrices = [];
  for (const pattern of pricePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      foundPrices.push(match[1]);
    }
  }
  
  // 去重并取前5个
  const uniquePrices = [...new Set(foundPrices)].slice(0, 5);

  return `
你是专业的"电商竞品深度分析师"。请分析以下商品页面数据。

## 商品链接
${url}

## 页面中发现的价格数据
${uniquePrices.length > 0 ? uniquePrices.join(', ') : '未找到明确价格数据'}

## JSON-LD 结构化数据
${jsonLdData ? jsonLdData.slice(0, 3000) : '无'}

## 页面 HTML（部分）
${html.slice(0, 60000)}

---

## 你的任务

从上述数据中提取商品信息。**特别注意价格**：
- 印尼盾价格通常是 5-6 位数，如 Rp 27.600 表示 27,600 印尼盾
- 价格中的 "." 是千位分隔符，不是小数点
- 例如：Rp 18.500 = Rp 18,500（一万八千五百）
- 例如：Rp 127.000 = Rp 127,000（十二万七千）

## 输出要求

只输出 JSON，不要任何解释：

{
  "name": "产品名称（简洁版本，不超过50字）",
  "brand": "品牌名",
  "price": "当前售价（完整格式，如 Rp 27,600 或 Rp 127,000）",
  "original_price": "原价（如有划线价）",
  "volume": "规格/容量（如 100ml, 500g）",
  "sales": "销量（如 1.2rb terjual, 500+ sold）",
  "rating": "评分（如 4.8）",
  "review_count": "评论数",
  
  "title": "完整标题原文",
  "title_keywords": ["关键词1", "关键词2", "关键词3"],
  
  "selling_points": [
    "卖点1",
    "卖点2",
    "卖点3"
  ],
  
  "ingredients": [
    {"name": "成分名", "benefit": "功效"}
  ],
  
  "pain_points": [
    {"category": "痛点分类", "description": "描述", "frequency": "频率"}
  ],
  
  "opportunities": [
    {"dimension": "维度", "suggestion": "建议"}
  ],
  
  "price_positioning": "价格定位（高端/中端/性价比）",
  "target_audience": "目标人群"
}

**重要提醒**：
1. 价格必须保留完整的数字，如 Rp 27,600 不要写成 Rp 27 或 Rp 28
2. 如果价格显示为 "18.500" 或 "18500"，应该输出 "Rp 18,500"
3. 如果页面中有多个价格，取当前销售价（折后价）
`.trim();
}

// ========== 标准化结果 ==========

function normalizeResult(obj, sourceUrl) {
  // 修正价格格式
  let price = obj.price || "";
  let originalPrice = obj.original_price || "";
  
  // 如果价格看起来太小（比如小于100），可能是解析错误
  const priceNum = parseFloat(String(price).replace(/[^0-9.]/g, ''));
  if (priceNum > 0 && priceNum < 100) {
    // 可能是千位被当成小数了，尝试修正
    // 比如 "27.6" 应该是 "27,600"
    const correctedPrice = Math.round(priceNum * 1000);
    if (correctedPrice > 1000) {
      price = `Rp ${correctedPrice.toLocaleString('id-ID')}`;
    }
  }
  
  // 确保价格有货币符号
  if (price && !price.toLowerCase().includes('rp') && !price.toLowerCase().includes('idr')) {
    const num = parseFloat(String(price).replace(/[^0-9.]/g, ''));
    if (num > 0) {
      price = `Rp ${num.toLocaleString('id-ID')}`;
    }
  }

  return {
    name: obj.name || "",
    brand: obj.brand || "",
    price: price,
    original_price: originalPrice,
    volume: obj.volume || "",
    sales: obj.sales || "",
    rating: obj.rating || "",
    review_count: obj.review_count || "",
    
    title: obj.title || obj.name || "",
    title_keywords: Array.isArray(obj.title_keywords) ? obj.title_keywords : [],
    title_analysis: obj.title_analysis || "",
    
    selling_points: Array.isArray(obj.selling_points) ? obj.selling_points : 
                    Array.isArray(obj.benefits) ? obj.benefits : [],
    ingredients: Array.isArray(obj.ingredients) ? obj.ingredients : [],
    
    pain_points: Array.isArray(obj.pain_points) ? obj.pain_points : [],
    opportunities: Array.isArray(obj.opportunities) ? obj.opportunities : [],
    
    price_positioning: obj.price_positioning || "",
    target_audience: obj.target_audience || "",
    
    source_url: obj.source_url || sourceUrl,
    
    // 兼容旧字段
    benefits: Array.isArray(obj.selling_points) ? obj.selling_points : [],
  };
}
