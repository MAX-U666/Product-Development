/**
 * /api/ai-drafts-update
 * 
 * POST 请求：更新草稿状态（审核通过/拒绝）
 * 
 * 入参：
 * {
 *   id: 123,
 *   action: "approve" | "reject",
 *   reviewed_by: 1,
 *   review_comment: "质量不佳，需要重新生成"  // 拒绝时必填
 * }
 * 
 * 出参：
 * {
 *   success: true
 * }
 */

import { query } from './_db.js';
import { readJson, sendJson, requirePost } from './_utils.js';

export default async function handler(req, res) {
  try {
    if (!requirePost(req, res)) return;

    const body = await readJson(req);

    // 校验必填字段
    if (!body.id || !body.action || !body.reviewed_by) {
      return sendJson(res, 400, { 
        error: 'MISSING_FIELD',
        required: ['id', 'action', 'reviewed_by']
      });
    }

    // 校验 action
    if (!['approve', 'reject'].includes(body.action)) {
      return sendJson(res, 400, { 
        error: 'INVALID_ACTION',
        message: 'action must be "approve" or "reject"'
      });
    }

    // 如果是拒绝，必须提供原因
    if (body.action === 'reject' && !body.review_comment) {
      return sendJson(res, 400, { 
        error: 'MISSING_REVIEW_COMMENT',
        message: 'review_comment is required when rejecting'
      });
    }

    // 更新状态
    const newStatus = body.action === 'approve' ? '已通过' : '已拒绝';
    const reviewedAt = new Date().toISOString();

    const sql = `
      UPDATE ai_drafts
      SET 
        status = ?,
        reviewed_by = ?,
        review_comment = ?,
        reviewed_at = ?
      WHERE id = ?
    `;

    const params = [
      newStatus,
      body.reviewed_by,
      body.review_comment || null,
      reviewedAt,
      body.id
    ];

    await query(sql, params);

    return sendJson(res, 200, { success: true });

  } catch (e) {
    console.error('[api/ai-drafts-update] Error:', e);
    return sendJson(res, 500, { 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
