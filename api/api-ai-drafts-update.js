/**
 * /api/ai-drafts-update
 *
 * POST: 更新草稿状态（approve / reject）
 * 兼容 OPTIONS：避免预检导致 405
 * Supabase 懒加载：避免 import 阶段 env 缺失直接崩
 */

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key);
}

export default async function handler(req, res) {
  try {
    // ✅ 放行 OPTIONS（有些场景会出现预检）
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }

    // ✅ 只允许 POST
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "METHOD_NOT_ALLOWED",
        allowed: ["POST", "OPTIONS"],
        got: req.method,
      });
    }

    const supabase = getSupabase();
    const body = req.body || {};

    // 校验必填字段
    if (body.id === undefined || body.id === null || !body.action || body.reviewed_by === undefined || body.reviewed_by === null) {
      return res.status(400).json({
        error: "MISSING_FIELD",
        required: ["id", "action", "reviewed_by"],
      });
    }

    // 校验 action
    if (!["approve", "reject"].includes(body.action)) {
      return res.status(400).json({
        error: "INVALID_ACTION",
        message: 'action must be "approve" or "reject"',
      });
    }

    // 如果是拒绝，必须提供原因
    if (body.action === "reject" && !body.review_comment) {
      return res.status(400).json({
        error: "MISSING_REVIEW_COMMENT",
        message: "review_comment is required when rejecting",
      });
    }

    const newStatus = body.action === "approve" ? "已通过" : "已拒绝";
    const updateData = {
      status: newStatus,
      reviewed_by: body.reviewed_by,
      review_comment: body.review_comment || null,
      reviewed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("ai_drafts")
      .update(updateData)
      .eq("id", body.id)
      .select();

    if (error) {
      console.error("[api/ai-drafts-update] Supabase error:", error);
      return res.status(500).json({
        error: "DATABASE_ERROR",
        message: error.message,
        hint: error.hint || null,
        details: error.details || null,
        code: error.code || null,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: `Draft with id ${body.id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: data[0],
    });
  } catch (e) {
    console.error("[api/ai-drafts-update] Error:", e);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: String(e?.message || e),
    });
  }
}
