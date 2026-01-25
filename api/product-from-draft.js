/***
 * /api/product-from-draft
 * 
 * POST 请求：从 AI 草稿创建产品
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }

    const body = req.body;

    // 校验必填字段
    const required = ['category', 'market', 'platform', 'developer_id'];
    for (const field of required) {
      if (body[field] === null || body[field] === undefined) {
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
      positioning: body.positioning || null,
      selling_point: body.selling_point || null,
      ingredients: body.ingredients || null,
      main_efficacy: body.main_efficacy || null,
      volume: body.volume || null,
      scent: body.scent || null,
      texture_color: body.texture_color || null,
      pricing: body.pricing || null,
      product_title: body.product_title || null,
      seo_keywords: body.seo_keywords || null,
      packaging_design: body.packaging_design || null,
      stage: body.stage || 1,
      status: body.status || '进行中',
      developer_id: body.developer_id,
      is_ai_generated: body.is_ai_generated !== undefined ? body.is_ai_generated : true,
      created_from_draft_id: body.created_from_draft_id || null,
      has_design: body.has_design !== undefined ? body.has_design : false,
      created_at: body.created_at || new Date().toISOString(),
    };

    // 插入数据库
    const { data, error } = await supabase
      .from('products')
      .insert([insertData])
      .select();

    if (error) {
      console.error('[api/product-from-draft] Supabase error:', error);
      return res.status(500).json({ 
        error: 'DATABASE_ERROR', 
        message: error.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      product_id: data[0]?.id,
      data: data[0]
    });

  } catch (e) {
    console.error('[api/product-from-draft] Error:', e);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
