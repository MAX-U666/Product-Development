/**
 * /api/ai-drafts-update
 * 
 * POST 请求：更新草稿状态（审核通过/拒绝）（Supabase 版本）
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const body = req.body;

    // 校验必填字段
    if (!body.id || !body.action || !body.reviewed_by) {
      return res.status(400).json({ 
        error: 'MISSING_FIELD',
        required: ['id', 'action', 'reviewed_by']
      });
    }

    // 校验 action
    if (!['approve', 'reject'].includes(body.action)) {
      return res.status(400).json({ 
        error: 'INVALID_ACTION',
        message: 'action must be "approve" or "reject"'
      });
    }

    // 如果是拒绝，必须提供原因
    if (body.action === 'reject' && !body.review_comment) {
      return res.status(400).json({ 
        error: 'MISSING_REVIEW_COMMENT',
        message: 'review_comment is required when rejecting'
      });
    }

    // 准备更新数据
    const newStatus = body.action === 'approve' ? '已通过' : '已拒绝';
    const updateData = {
      status: newStatus,
      reviewed_by: body.reviewed_by,
      review_comment: body.review_comment || null,
      reviewed_at: new Date().toISOString()
    };

    // 更新数据库
    const { data, error } = await supabase
      .from('ai_drafts')
      .update(updateData)
      .eq('id', body.id)
      .select();

    if (error) {
      console.error('[api/ai-drafts-update] Supabase error:', error);
      return res.status(500).json({ 
        error: 'DATABASE_ERROR', 
        message: error.message 
      });
    }

    // 检查是否更新成功
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        error: 'NOT_FOUND',
        message: `Draft with id ${body.id} not found`
      });
    }

    return res.status(200).json({ 
      success: true,
      data: data[0]
    });

  } catch (e) {
    console.error('[api/ai-drafts-update] Error:', e);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
