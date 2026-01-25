/**
 * /api/product-design-insert
 * 
 * POST 请求：创建产品设计记录（Supabase 版本）
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
    if (!body.product_id) {
      return res.status(400).json({ error: 'MISSING_PRODUCT_ID' });
    }

    if (!body.package_design_images || !Array.isArray(body.package_design_images) || body.package_design_images.length === 0) {
      return res.status(400).json({ error: 'MISSING_PACKAGE_DESIGN_IMAGES' });
    }

    if (!body.bottle_images || !Array.isArray(body.bottle_images) || body.bottle_images.length === 0) {
      return res.status(400).json({ error: 'MISSING_BOTTLE_IMAGES' });
    }

    // 准备插入数据
    const insertData = {
      product_id: body.product_id,
      package_design_images: body.package_design_images,
      bottle_images: body.bottle_images,
      design_notes: body.design_notes || null,
      status: body.status || '待提交',
      submitted_at: body.submitted_at || null,
      created_at: new Date().toISOString(),
    };

    // 插入数据库
    const { data, error } = await supabase
      .from('product_design')
      .insert([insertData])
      .select();

    if (error) {
      console.error('[api/product-design-insert] Supabase error:', error);
      return res.status(500).json({ 
        error: 'DATABASE_ERROR', 
        message: error.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      id: data[0]?.id,
      data: data[0]
    });

  } catch (e) {
    console.error('[api/product-design-insert] Error:', e);
    return res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: String(e?.message || e) 
    });
  }
}
