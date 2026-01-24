/**
 * /api/ai-drafts
 * 
 * GET 请求：获取所有 AI 草稿列表（Supabase 版本）
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // 使用 service_role key，绕过 RLS
);

export default async function handler(req, res) {
  try {
    // 只允许 GET 请求
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    // 查询所有草稿，按创建时间倒序
    const { data, error } = await supabase
      .from('ai_drafts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/ai-drafts] Supabase error:', error);
      return res.status(500).json({ 
        error: 'DATABASE_ERROR', 
        message: error.message 
      });
    }

    // 返回结果
    return res.status(200).json(data || []);

  } catch (e) {
    console.error('[api/ai-drafts] Error:', e);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
