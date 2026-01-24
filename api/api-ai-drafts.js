/**
 * /api/ai-drafts
 * 
 * GET 请求：获取所有 AI 草稿列表
 * 
 * 出参：
 * [
 *   {
 *     id: 1,
 *     category: "沐浴露",
 *     market: "印尼",
 *     platform: "Shopee",
 *     title: "...",
 *     status: "待审核",
 *     extract_provider: "gemini",
 *     generate_provider: "claude",
 *     estimated_cost: 0.0175,
 *     created_by: 1,
 *     created_at: "2026-01-24T10:30:00Z",
 *     ...
 *   }
 * ]
 */

import { query } from './_db.js';
import { sendJson } from './_utils.js';

export default async function handler(req, res) {
  try {
    // 只允许 GET 请求
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    }

    // 查询所有草稿，按创建时间倒序
    const sql = `
      SELECT 
        id,
        develop_month,
        category,
        market,
        platform,
        positioning,
        selling_point,
        ingredients,
        efficacy,
        volume,
        scent,
        texture_color,
        pricing,
        title,
        keywords,
        packaging_requirements,
        extract_provider,
        generate_provider,
        competitors_data,
        ai_explanations,
        estimated_cost,
        status,
        created_by,
        reviewed_by,
        review_comment,
        created_at,
        reviewed_at
      FROM ai_drafts
      ORDER BY created_at DESC
    `;

    const rows = await query(sql);

    // 返回结果
    return sendJson(res, 200, rows || []);

  } catch (e) {
    console.error('[api/ai-drafts] Error:', e);
    return sendJson(res, 500, { 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
