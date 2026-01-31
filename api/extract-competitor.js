/**
 * /api/extract-competitor
 * 
 * 优化版：让 Gemini 直接访问 URL，而不是我们抓取 HTML
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

// ========== Gemini 直接访问 URL 的调用方式 ==========
async function callGeminiWithUrl(prompt, url) {
  const key = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  // 构建请求：文本 prompt + URL 作为 fileData
  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { 
          fileData: {
            fileUri: url,
            mimeType: "text/html"
          }
        }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
    },
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  
  if (!res.ok) {
    // 如果 fileData 方式不支持，降级到纯文本方式
    console.log("fileData 方式失败，尝试纯文本方式...");
    return await callGeminiTextOnly(prompt + `\n\n请访问并分析这个链接：${url}`, key, model);
  }

  const text = json?.candidates?.[0]?.content?.parts?.map(p => p?.text).filter(Boolean).join("") || "";
  return text.trim();
}

// 纯文本方式调用 Gemini（让它自己去访问URL）
async function callGeminiTextOnly(prompt, key, model) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.2,
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

// 其他 AI 提供商（保持原有方式）
async function callQwen(prompt) {
  const key = requireEnv("DASHSCOPE_API_KEY");
  const model = process.env.DASHSCOPE_MODEL || "qwen-turbo";
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

    // 构建深度分析 Prompt
    const prompt = buildAnalysisPrompt(url);

    let raw = "";
    
    if (provider === "gemini") {
      // Gemini: 直接让它访问 URL
      raw = await callGeminiWithUrl(prompt, url);
    } else if (provider === "qwen") {
      // 千问: 需要我们先抓取 HTML
      const html = await fetchHtml(url);
      raw = await callQwen(prompt + `\n\n网页内容：\n${html}`);
    } else if (provider === "deepseek") {
      const html = await fetchHtml(url);
      raw = await callDeepSeek(prompt + `\n\n网页内容：\n${html}`);
    } else if (provider === "claude") {
      const html = await fetchHtml(url);
      raw = await callClaude(prompt + `\n\n网页内容：\n${html}`);
    } else {
      // 默认用 Gemini
      raw = await callGeminiWithUrl(prompt, url);
    }

    // 尝试解析 JSON
    const obj = safeParseJson(raw);
    
    if (!obj || typeof obj !== "object") {
      // 如果不是 JSON，可能是纯文本分析，也返回
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

    sendJson(res, 200, {
      success: true,
      provider,
      data: normalizeResult(obj, url),
    });

  } catch (e) {
    const msg = String(e?.message || e);
    console.error("Extract error:", msg);
    sendJson(res, 500, { success: false, error: msg });
  }
}

// 抓取 HTML（给不支持直接访问URL的模型用）
async function fetchHtml(url) {
  try {
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.5",
      },
    });
    let html = await r.text().catch(() => "");
    if (html.length > 100000) html = html.slice(0, 100000);
    return html;
  } catch {
    return "";
  }
}

// 从文本中提取字段（备用）
function extractField(text, fieldName) {
  const patterns = [
    new RegExp(`${fieldName}[：:](.*?)(?:\\n|$)`, 'i'),
    new RegExp(`\\*\\*${fieldName}\\*\\*[：:]?(.*?)(?:\\n|$)`, 'i'),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return "";
}

// 深度分析 Prompt
function buildAnalysisPrompt(url) {
  return `
你是专业的"电商竞品深度分析师"。请访问并分析以下商品链接：

${url}

## 分析任务

1. **产品核心信息**：名称、品牌、价格（折后价/原价）、规格、销量、评分、评论数
2. **标题关键词分析**：完整标题、SEO关键词拆解、标题结构
3. **核心卖点提炼**：产品主打的功效和卖点（至少3条）
4. **主要成分识别**：核心成分及其功效
5. **差评痛点提炼**：用户的不满和抱怨（至少3条，基于评论或合理推断）
6. **差异化机会**：如果要做更好的竞品，应该如何切入（至少3条建议）

## 输出格式

请只输出 JSON 格式，不要任何解释文字：

{
  "name": "产品名称（简洁）",
  "brand": "品牌名",
  "price": "当前售价（保留货币符号）",
  "original_price": "原价",
  "volume": "规格/容量",
  "sales": "销量",
  "rating": "评分",
  "review_count": "评论数",
  
  "title": "完整标题原文",
  "title_keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "title_analysis": "标题结构分析",
  
  "selling_points": [
    "核心卖点1",
    "核心卖点2", 
    "核心卖点3"
  ],
  
  "ingredients": [
    {"name": "成分名", "benefit": "功效"},
    {"name": "成分名", "benefit": "功效"}
  ],
  
  "pain_points": [
    {"category": "痛点分类", "description": "具体描述", "frequency": "高频/中频/低频"},
    {"category": "痛点分类", "description": "具体描述", "frequency": "频率"},
    {"category": "痛点分类", "description": "具体描述", "frequency": "频率"}
  ],
  
  "opportunities": [
    {"dimension": "切入维度", "suggestion": "具体建议"},
    {"dimension": "切入维度", "suggestion": "具体建议"},
    {"dimension": "切入维度", "suggestion": "具体建议"}
  ],
  
  "price_positioning": "价格定位分析（高端/中高端/中端/性价比）",
  "target_audience": "目标人群",
  "source_url": "${url}"
}
`.trim();
}

// 标准化结果
function normalizeResult(obj, sourceUrl) {
  return {
    name: obj.name || "",
    brand: obj.brand || "",
    price: obj.price || "",
    original_price: obj.original_price || "",
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
