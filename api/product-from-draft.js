/**
 * /api/product-from-draft
 *
 * POST: 从 AI 草稿创建产品
 *
 * 关键增强：
 * 1) Supabase client 懒加载：避免 import 阶段因 env 缺失直接崩溃
 * 2) 任何异常都返回 JSON：前端不会再 JSON.parse 失败
 * 3) 更清晰的错误信息与字段校验
 */

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    const err = new Error("Supabase env missing");
    err.detail = {
      hasSUPABASE_URL: !!url,
      hasSUPABASE_SERVICE_KEY: !!key,
    };
    throw err;
  }

  return createClient(url, key);
}

export default async function handler(req, res) {
  try {
    // 只允许 POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    }

    const supabase = getSupabase();
    const body = req.body || {};

    // 校验必填字段
    const required = ["category", "market", "platform", "developer_id"];
    for (const field of required) {
      if (body[field] === null || body[field] === undefined || body[field] === "") {
        return res.status(400).json({
          error: "MISSING_FIELD",
          field,
        });
      }
    }

    // developer_id 做一次强制数字化（避免前端传字符串导致类型问题）
    // 若你希望允许 0，则保留；否则可以额外校验 > 0
    const developerIdNum = Number(body.developer_id);
    if (Number.isNaN(developerIdNum)) {
      return res.status(400).json({
        error: "INVALID_FIELD",
        field: "developer_id",
        message: "developer_id must be a number",
      });
    }

    // 准备插入数据（字段与你原版保持一致）
    const insertData = {
      develop_month: body.develop_month ?? null,
      category: body.category,
      market: body.market,
      platform: body.platform,
      positioning: body.positioning ?? null,
      selling_point: body.selling_point ?? null,
      ingredients: body.ingredients ?? null,
      main_efficacy: body.main_efficacy ?? null,
      volume: body.volume ?? null,
      scent: body.scent ?? null,
      texture_color: body.texture_color ?? null,
      pricing: body.pricing ?? null,
      product_title: body.product_title ?? null,
      seo_keywords: body.seo_keywords ?? null,
      packaging_design: body.packaging_design ?? null,
      stage: body.stage ?? 1,
      status: body.status ?? "进行中",
      developer_id: developerIdNum,
      is_ai_generated: body.is_ai_generated !== undefined ? body.is_ai_generated : true,
      created_from_draft_id: body.created_from_draft_id ?? null,
      has_design: body.has_design !== undefined ? body.has_design : false,
      created_at: body.created_at ?? new Date().toISOString(),
    };

    // 插入数据库
    const { data, error } = await supabase.from("products").insert([insertData]).select();

    if (error) {
      console.error("[api/product-from-draft] Supabase error:", error);
      return res.status(500).json({
        error: "DATABASE_ERROR",
        message: error.message,
        // 可选：调试时更直观（生产也可以保留，问题不大）
        hint: error.hint || null,
        details: error.details || null,
        code: error.code || null,
      });
    }

    return res.status(200).json({
      success: true,
      product_id: data?.[0]?.id ?? null,
      data: data?.[0] ?? null,
    });
  } catch (e) {
    console.error("[api/product-from-draft] Error:", e?.detail || e);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: String(e?.message || e),
      detail: e?.detail || null,
      stack: e?.stack || null,
    });
  }
}
