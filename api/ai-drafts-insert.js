/***
 * /api/ai-drafts-insert
 * 
 * POST 请求：创建新的 AI 草稿（Supabase 版本）
 * 
 * 🔄 更新：添加三语产品名称字段支持
 * - name_zh: 中文名称
 * - name_en: 英文名称
 * - name_id: 印尼语名称
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
    const required = ['category', 'market', 'platform', 'created_by'];
    for (const field of required) {
      if (!body[field]) {
        return res.status(400).json({ 
          error: 'MISSING_FIELD', 
          field 
        });
      }
    }

    // 准备插入数据
    const insertData = {
      develop_month: body.develop_month || null,
      category: body.category,
      market: body.market,
      platform: body.platform,
      
      // 🆕 品牌信息
      brand_name: body.brand_name || null,
      brand_philosophy: body.brand_philosophy || null,
      
      // 🆕 核心输入（手动）
      core_selling_point: body.core_selling_point || null,
      concept_ingredient: body.concept_ingredient || null,
      
      // 🆕 三语产品名称
      name_zh: body.name_zh || null,
      name_en: body.name_en || null,
      name_id: body.name_id || null,
      
      // 原有字段
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
      
      // AI 元数据
      extract_provider: body.extract_provider || null,
      generate_provider: body.generate_provider || null,
      competitors_data: body.competitors_data || null,  // Supabase 自动处理 JSONB
      ai_explanations: body.ai_explanations || null,     // Supabase 自动处理 JSONB
      estimated_cost: body.estimated_cost || 0.0,
      
      // 状态和用户
      status: '待审核',
      created_by: body.created_by,
      created_at: body.created_at || new Date().toISOString()
    };

    // 插入数据库
    const { data, error } = await supabase
      .from('ai_drafts')
      .insert([insertData])
      .select();

    if (error) {
      console.error('[api/ai-drafts-insert] Supabase error:', error);
      return res.status(500).json({ 
        error: 'DATABASE_ERROR', 
        message: error.message 
      });
    }

    // 返回新创建的记录
    return res.status(200).json({ 
      success: true, 
      id: data[0]?.id,
      data: data[0]
    });

  } catch (e) {
    console.error('[api/ai-drafts-insert] Error:', e);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
