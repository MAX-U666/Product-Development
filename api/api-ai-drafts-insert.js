/**
 * /api/ai-drafts-insert
 * 
 * POST 请求：创建新的 AI 草稿
 * 
 * 入参：
 * {
 *   develop_month: "2026-01",
 *   category: "沐浴露",
 *   market: "印尼",
 *   platform: "Shopee",
 *   positioning: "...",
 *   selling_point: "...",
 *   // ... 其他字段
 *   extract_provider: "gemini",
 *   generate_provider: "claude",
 *   competitors_data: [{...}, {...}],  // 数组，会被 JSON.stringify
 *   ai_explanations: {...},            // 对象，会被 JSON.stringify
 *   estimated_cost: 0.0175,
 *   created_by: 1
 * }
 * 
 * 出参：
 * {
 *   success: true,
 *   id: 123
 * }
 */

import { query } from './_db.js';
import { readJson, sendJson, requirePost } from './_utils.js';

export default async function handler(req, res) {
  try {
    if (!requirePost(req, res)) return;

    const body = await readJson(req);

    // 校验必填字段
    const required = ['category', 'market', 'platform', 'created_by'];
    for (const field of required) {
      if (!body[field]) {
        return sendJson(res, 400, { 
          error: 'MISSING_FIELD', 
          field 
        });
      }
    }

    // 准备 JSON 字段
    const competitorsJson = body.competitors_data 
      ? JSON.stringify(body.competitors_data) 
      : null;

    const explanationsJson = body.ai_explanations
      ? JSON.stringify(body.ai_explanations)
      : null;

    // 插入数据库
    const sql = `
      INSERT INTO ai_drafts (
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
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      body.develop_month || null,
      body.category,
      body.market,
      body.platform,
      body.positioning || null,
      body.selling_point || null,
      body.ingredients || null,
      body.efficacy || null,
      body.volume || null,
      body.scent || null,
      body.texture_color || null,
      body.pricing || null,
      body.title || null,
      body.keywords || null,
      body.packaging_requirements || null,
      body.extract_provider || null,
      body.generate_provider || null,
      competitorsJson,
      explanationsJson,
      body.estimated_cost || 0.0,
      '待审核',
      body.created_by,
      body.created_at || new Date().toISOString()
    ];

    const result = await query(sql, params);

    // 返回新创建的 ID
    return sendJson(res, 200, { 
      success: true, 
      id: result.insertId 
    });

  } catch (e) {
    console.error('[api/ai-drafts-insert] Error:', e);
    return sendJson(res, 500, { 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
