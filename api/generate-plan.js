/***
 * /api/generate-plan
 *
 * 入参:
 * {
 *   category, market, platform,
 *   competitors: [ { name, price, ingredients, benefits, source_url }, ... ],
 *   ai_config: { generate_provider: "gemini|claude|gpt4|deepseek|qwen|ark", extract_provider: ... }
 * }
 *
 * 出参:
 * {
 *   success: boolean,
 *   provider: "gemini|claude|gpt4|deepseek|qwen|ark",
 *   data: { plan: {...}, explanations: {...} }
 * }
 *
 * 设计目标：
 * - 直接喂给你前端 ProductFormAI 的映射逻辑（plan + explanations）
 * - explanations 支持每个字段：note/confidence/reason
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
    const category = body?.category || "";
    const market = body?.market || "";
    const platform = body?.platform || "";
    const competitors = Array.isArray(body?.competitors) ? body.competitors : [];
    const provider = normalizeProvider(body?.ai_config?.generate_provider);

    if (!category || !market || !platform) {
      sendJson(res, 400, { success: false, error: "MISSING_CATEGORY_MARKET_PLATFORM" });
      return;
    }
    if (competitors.length < 1) {
      sendJson(res, 400, { success: false, error: "MISSING_COMPETITORS" });
      return;
    }

    const compactCompetitors = competitors.slice(0, 3).map((c, idx) => ({
      idx: idx + 1,
      name: c?.name || "",
      price: c?.price || "",
      ingredients: c?.ingredients || "",
      benefits: Array.isArray(c?.benefits) ? c.benefits.slice(0, 8) : [],
      source_url: c?.source_url || c?.url || "",
    }));

    const prompt = `
你是“产品开发方案生成器”（跨境电商快消品）。
请基于【类目/市场/平台】和【3个竞品信息】，生成一个可落地的新品方案。

强规则：
- 只输出 JSON（不要任何解释、不要 markdown）。
- 输出结构固定如下（字段缺失用空字符串或空数组）：

{
  "plan": {
    "positioning": string,
    "sellingPoint": string,
    "ingredients": string,
    "efficacy": string,
    "volume": string,
    "scent": string,
    "color": string,
    "pricing": string,
    "title": string,
    "keywords": string[] ,
    "packaging": string
  },
  "explanations": {
    "positioning": { "note": string, "confidence": number, "reason": string },
    "sellingPoint": { "note": string, "confidence": number, "reason": string },
    "ingredients": { "note": string, "confidence": number, "reason": string },
    "efficacy": { "note": string, "confidence": number, "reason": string },
    "volume": { "note": string, "confidence": number, "reason": string },
    "scent": { "note": string, "confidence": number, "reason": string },
    "color": { "note": string, "confidence": number, "reason": string },
    "pricing": { "note": string, "confidence": number, "reason": string },
    "title": { "note": string, "confidence": number, "reason": string },
    "keywords": { "note": string, "confidence": number, "reason": string },
    "packaging": { "note": string, "confidence": number, "reason": string }
  }
}

注意：
- confidence 范围 0~1
- title 要偏 SEO（平台：${platform}，市场：${market}）

输入：
类目：${category}
市场：${market}
平台：${platform}

竞品信息（结构化）：
${JSON.stringify(compactCompetitors, null, 2)}
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
      data: obj,
    });
  } catch (e) {
    const msg = String(e?.message || e);
    sendJson(res, 500, { success: false, error: msg });
  }
}
