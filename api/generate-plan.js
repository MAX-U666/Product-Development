/**
 * /api/generate-plan
 * 
 * 基于竞品分析 + 手动输入生成完整9模块产品方案
 * 
 * 入参:
 * {
 *   brandName, brandPhilosophy,
 *   coreSellingPoint, conceptIngredient, volume, pricing,
 *   category, market, platform,
 *   competitors: [ { name, price, ingredients, benefits, ... }, ... ],
 *   ai_config: { generate_provider: "qwen" }
 * }
 *
 * 出参:
 * {
 *   success: boolean,
 *   provider: "qwen",
 *   data: { competitorAnalysis, productName, positioning, ... }
 * }
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
import { buildGeneratePlanPrompt } from "./prompts/generate-plan-prompt.js";

// 根据 provider 选择调用函数
function pickCaller(provider) {
  if (provider === "claude") return callClaude;
  if (provider === "gpt4") return callOpenAI;
  if (provider === "deepseek") return callDeepSeek;
  if (provider === "qwen") return callQwen;
  if (provider === "ark") return callArk;
  return callGemini;
}

// 安全解析 JSON
function safeParseJson(text) {
  if (!text) return null;
  
  // 清理 markdown 代码块
  let cleaned = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  
  // 尝试提取 JSON 对象
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON解析失败:", e.message);
    console.error("原始文本前500字符:", cleaned.substring(0, 500));
    return null;
  }
}

export default async function handler(req, res) {
  console.log("=== generate-plan 开始 ===");
  
  try {
    if (!requirePost(req, res)) return;

    const body = await readJson(req);
    
    // 提取参数
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
      competitors = [],
      ai_config = {}
    } = body || {};
    
    const provider = normalizeProvider(ai_config?.generate_provider);
    
    console.log("参数:", { 
      brandName, category, market, platform, provider, 
      competitorsCount: competitors.length,
      coreSellingPoint,
      conceptIngredient
    });

    // 验证必填项
    if (!category || !market || !platform) {
      console.log("缺少必要参数");
      sendJson(res, 400, { success: false, error: "MISSING_CATEGORY_MARKET_PLATFORM" });
      return;
    }
    
    if (competitors.length < 1) {
      console.log("缺少竞品数据");
      sendJson(res, 400, { success: false, error: "MISSING_COMPETITORS" });
      return;
    }

    // 格式化竞品数据（最多3个）
    const formattedCompetitors = competitors.slice(0, 3).map((c, idx) => ({
      name: c?.name || c?.title || '',
      price: c?.price || '',
      volume: c?.volume || c?.size || '',
      ingredients: c?.ingredients || '',
      benefits: Array.isArray(c?.benefits) ? c.benefits.slice(0, 8) : [],
      source_url: c?.source_url || c?.url || ''
    }));
    
    console.log("格式化后的竞品:", JSON.stringify(formattedCompetitors).substring(0, 500));

    // 使用新的 prompt 模块构建 prompt
    const prompt = buildGeneratePlanPrompt({
      brandName,
      brandPhilosophy,
      coreSellingPoint,
      conceptIngredient,
      volume,
      pricing,
      category,
      market,
      platform,
      competitors: formattedCompetitors
    });

    console.log("Prompt 长度:", prompt.length);
    console.log("准备调用 AI，provider:", provider);

    // 调用 AI
    const caller = pickCaller(provider);
    
    let raw;
    try {
      raw = await caller(prompt);
      console.log("AI 返回内容长度:", raw?.length || 0);
      console.log("AI 返回前300字符:", raw?.substring(0, 300));
    } catch (aiError) {
      console.error("AI 调用失败:", aiError.message);
      sendJson(res, 502, {
        success: false,
        provider,
        error: `AI_CALL_ERROR: ${aiError.message}`
      });
      return;
    }

    // 检查返回内容
    if (!raw || raw.trim() === "") {
      console.error("AI 返回空内容");
      sendJson(res, 502, {
        success: false,
        provider,
        error: "AI_RETURN_EMPTY"
      });
      return;
    }

    // 解析 JSON
    const parsed = safeParseJson(raw);

    if (!parsed || typeof parsed !== "object") {
      console.error("JSON 解析失败");
      sendJson(res, 502, {
        success: false,
        provider,
        error: "AI_RETURN_FORMAT_ERROR",
        raw: raw.substring(0, 1000)
      });
      return;
    }

    // 验证关键字段
    const hasValidData = parsed.productName || parsed.positioning || parsed.productIntro;
    if (!hasValidData) {
      console.error("返回数据缺少关键字段");
      sendJson(res, 502, {
        success: false,
        provider,
        error: "AI_RETURN_MISSING_FIELDS",
        raw: raw.substring(0, 1000)
      });
      return;
    }

    console.log("解析成功，包含字段:", Object.keys(parsed));
    console.log("=== generate-plan 成功 ===");

    // 返回结果
    sendJson(res, 200, {
      success: true,
      provider,
      data: parsed
    });

  } catch (e) {
    const msg = String(e?.message || e);
    console.error("generate-plan 异常:", msg);
    sendJson(res, 500, { success: false, error: msg });
  }
}
