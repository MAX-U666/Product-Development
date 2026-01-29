/**
 * /api/ai-drafts-insert
 * 
 * 保存 AI 生成的产品草稿到数据库
 * 支持存储完整的9模块AI方案数据
 */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function baseHeaders() {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    // 解析请求体
    let body;
    if (typeof req.body === "string") {
      body = JSON.parse(req.body);
    } else {
      body = req.body;
    }

    console.log("=== ai-drafts-insert 开始 ===");
    console.log("收到字段:", Object.keys(body || {}));

    // 构建插入数据
    const insertData = {
      // 基础信息
      develop_month: body.develop_month || null,
      category: body.category || null,
      market: body.market || null,
      platform: body.platform || null,

      // 品牌信息
      brand_name: body.brand_name || null,
      brand_philosophy: body.brand_philosophy || null,
      core_selling_point: body.core_selling_point || null,
      concept_ingredient: body.concept_ingredient || null,

      // 三语产品名称
      name_zh: body.name_zh || null,
      name_en: body.name_en || null,
      name_id: body.name_id || null,

      // 9模块简化字段（向后兼容）
      positioning: body.positioning || null,
      selling_point: body.selling_point || null,
      ingredients: body.ingredients || null,
      efficacy: body.efficacy || null,
      volume: body.volume || null,
      scent: body.scent || null,
      texture_color: body.texture_color || null,
      pricing: body.pricing || null,
      title: body.title || null,
      keywords: body.keywords || null,
      packaging_requirements: body.packaging_requirements || null,

      // ⭐ 完整AI生成方案（JSONB）
      ai_generated_plan: body.ai_generated_plan || null,

      // AI元数据
      extract_provider: body.extract_provider || null,
      generate_provider: body.generate_provider || null,
      competitors_data: body.competitors_data || null,
      ai_explanations: body.ai_explanations || null,
      estimated_cost: body.estimated_cost || 0,

      // 状态信息
      status: body.status || "待审核",
      created_by: body.created_by || null,
      created_at: body.created_at || new Date().toISOString(),
    };

    console.log("准备插入数据，ai_generated_plan 存在:", !!insertData.ai_generated_plan);

    // 插入数据库
    const url = `${SB_URL}/rest/v1/ai_drafts`;
    const resp = await fetch(url, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(insertData),
    });

    const text = await resp.text();
    
    if (!resp.ok) {
      console.error("插入失败:", resp.status, text);
      return res.status(resp.status).json({
        success: false,
        error: text || `HTTP ${resp.status}`,
      });
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      result = { raw: text };
    }

    console.log("=== ai-drafts-insert 成功 ===");
    console.log("插入结果:", Array.isArray(result) ? `${result.length} 条记录` : "ok");

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (e) {
    console.error("ai-drafts-insert 异常:", e.message);
    return res.status(500).json({
      success: false,
      error: e.message || "Unknown error",
    });
  }
}
