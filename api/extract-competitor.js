/**
 * /api/extract-competitor
 *
 * 入参（两种模式）:
 * 
 * 模式A - URL提取:
 * {
 *   "url": "https://shopee.co.id/...",
 *   "ai_config": { "extract_provider": "gemini|claude|gpt4|deepseek|qwen|ark" }
 * }
 * 
 * 模式B - 图片提取:
 * {
 *   "mode": "image",
 *   "images": [
 *     { "name": "screenshot.png", "type": "image/png", "dataUrl": "data:image/png;base64,..." }
 *   ],
 *   "hint": "这是商品详情页",
 *   "ai_config": { "extract_provider": "gemini|claude|gpt4|deepseek|qwen|ark" }
 * }
 *
 * 出参:
 * {
 *   success: boolean,
 *   provider: "gemini|claude|gpt4|deepseek|qwen|ark",
 *   data: { name, price, ingredients, benefits, source_url }
 * }
 */

import { readJson, sendJson, requirePost, normalizeProvider } from "./_utils.js";
import { 
  callGemini, 
  callClaude, 
  callOpenAI, 
  callDeepSeek, 
  callQwen, 
  callArk,
  callGeminiWithImages,
  callClaudeWithImages
} from "./_providers.js";

// 根据 provider 选择合适的调用函数
function pickCaller(provider) {
  if (provider === "claude") return callClaude;
  if (provider === "gpt4") return callOpenAI;
  if (provider === "deepseek") return callDeepSeek;
  if (provider === "qwen") return callQwen;
  if (provider === "ark") return callArk;
  return callGemini;
}

// 选择支持图片的调用函数
function pickImageCaller(provider) {
  if (provider === "claude") return callClaudeWithImages;
  if (provider === "gemini") return callGeminiWithImages;
  // 其他模型如果不支持图片，降级为 gemini
  return callGeminiWithImages;
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
    const provider = normalizeProvider(body?.ai_config?.extract_provider);

    // ✅ 判断模式：URL 还是 Image
    const isImageMode = body?.mode === "image";

    if (isImageMode) {
      // ========== 模式B：图片提取 ==========
      const images = body?.images;
      const hint = body?.hint || "";

      if (!Array.isArray(images) || images.length === 0) {
        sendJson(res, 400, { success: false, error: "MISSING_IMAGES" });
        return;
      }

      // 构建提示词（针对图片）
      const prompt = `
你是"电商竞品信息提取器"。用户上传了 ${images.length} 张竞品截图。

用户提示：${hint || "无"}

请从图片中识别并提取以下信息：
- 产品名称
- 价格（保留货币符号，如 IDR 49,900）
- 主要成分（逗号分隔，如"Niacinamide, PDRN, Hyaluronic Acid"）
- 功效卖点（数组，如 ["美白", "保湿", "修护"]）

要求：
- 只输出 JSON（不要任何解释、不要 markdown）
- 字段固定如下（缺失用空字符串或空数组）：
{
  "name": string,
  "price": string,
  "ingredients": string,
  "benefits": string[]
}
`.trim();

      // 调用支持图片的 AI
      const caller = pickImageCaller(provider);
      const raw = await caller(prompt, images);

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
          source_url: "截图提取",
        },
      });

    } else {
      // ========== 模式A：URL提取 ==========
      const url = body?.url;

      if (!url || typeof url !== "string") {
        sendJson(res, 400, { success: false, error: "MISSING_URL" });
        return;
      }

      // 1) 抓取页面（可能会被 403/重定向；失败也继续，让模型基于 URL 做"弱提取"）
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
你是"电商竞品信息提取器"。请从给定的网页 HTML（可能不完整）中抽取竞品的关键信息。
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
    }
  } catch (e) {
    const msg = String(e?.message || e);
    sendJson(res, 500, { success: false, error: msg });
  }
}
