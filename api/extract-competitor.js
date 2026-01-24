/**
 * /api/extract-competitor
 *
 * 入参:
 * {
 *   "url": "https://shopee.co.id/...",
 *   "ai_config": { "extract_provider": "gemini|claude|gpt4|deepseek|qwen|ark", "generate_provider": ... }
 * }
 *
 * 出参:
 * {
 *   success: boolean,
 *   provider: "gemini|claude|gpt4|deepseek|qwen|ark",
 *   data: { name, price, ingredients, benefits, source_url }
 * }
 *
 * 说明：
 * - 这是 Node Serverless Function（Vercel）
 * - 你可以先用“粗提取”（抓 HTML + LLM 抽字段），后续再升级到：截图/结构化解析/反爬兜底
 */

import { readJson, sendJson, requirePost, normalizeProvider } from "./_utils.js";
import { 
  callGemini, 
  callClaude, 
  callOpenAI, 
  callDeepSeek, 
  callQwen, 
  callArk 
} from "./_providers.js";

// 根据 provider 选择合适的调用函数
function pickCaller(provider) {
  if (provider === "claude") return callClaude;
  if (provider === "gpt4") return callOpenAI;
  if (provider === "deepseek") return callDeepSeek;  // 新增
  if (provider === "qwen") return callQwen;          // 新增
  if (provider === "ark") return callArk;            // 新增
  return callGemini;
}

function safeParseJson(text) {
  if (!text) return null;
  // 常见情况：模型会包一层 ```json ... ```
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

export default async function handler(req, res) {
  try {
    if (!requirePost(req, res)) return;

    const body = await readJson(req);
    const url = body?.url;
    const provider = normalizeProvider(body?.ai_config?.extract_provider);

    if (!url || typeof url !== "string") {
      sendJson(res, 400, { success: false, error: "MISSING_URL" });
      return;
    }

    // 1) 抓取页面（可能会被 403/重定向；失败也继续，让模型基于 URL 做“弱提取”）
    let html = "";
    try {
      const r = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; CompetitorExtractor/1.0; +https://vercel.com)",
          accept: "text/html,application/xhtml+xml",
        },
      });
      html = await r.text().catch(() => "");
      // 限制长度，避免 token 爆炸
      if (html.length > 50000) html = html.slice(0, 50000);
    } catch {
      html = "";
    }

    const prompt = `
你是“电商竞品信息提取器”。请从给定的网页 HTML（可能不完整）中抽取竞品的关键信息。
要求：
- 只输出 JSON（不要任何解释、不要 markdown）。
- 字段固定如下（缺失用空字符串或空数组）：
{
  "name": string,
  "price": string,
  "ingredients": string,
  "benefits": string[],
  "source_url": string
}

目标链接：
${url}

网页 HTML（可能截断）：
${html}
`.trim();

    const caller = pickCaller(provider);
    const raw = await caller(prompt);

    const obj = safeParseJson(raw);
    if (!obj || typeof obj !== "object") {
      sendJson(res, 502, {
        success: false,
        provider,
        error: "AI_RETURN_FORMAT_ERROR",
        raw,
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      provider,
      data: {
        name: obj.name || "",
        price: obj.price || "",
        ingredients: obj.ingredients || "",
        benefits: Array.isArray(obj.benefits) ? obj.benefits : [],
        source_url: obj.source_url || url,
      },
    });
  } catch (e) {
    const msg = String(e?.message || e);
    sendJson(res, 500, { success: false, error: msg });
  }
}
