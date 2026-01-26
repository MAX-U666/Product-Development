/**
 * /api/product-dev-submit
 *
 * POST: 产品开发资料达到最低门槛后，提交进入 stage=1（待管理员复审）
 * 
 * 最低门槛：
 * - bottle_img: 瓶型图 1 张（必须）
 * - ref_packaging_url_1: 参考包装图 1 张（必须）
 * 
 * 成功后：stage=1, dev_assets_status='待复审', status='待管理员复审'。管理员审核通过后进入 stage=2（待接单）
 */

// 提交产品数据时，判断是AI流程还是传统流程，状态和审核条件不同
const submitProductForReview = async (productId, isAI = false) => {
  const productData = {
    productId,
    stage: isAI ? 'AI_draft_approved' : 'admin_review', // AI流程通过草稿审核后推进到 AI_draft_approved
    status: '待审核', // 统一设置为待审核
    dev_assets_status: isAI ? '待复审' : '待审核', // AI流程为待复审，传统流程为待审核
  };

  try {
    const response = await api.submitForReview(productData);
    if (response.success) {
      alert('产品审核提交成功');
    } else {
      alert('提交失败，请稍后重试');
    }
  } catch (error) {
    console.error('提交产品审核失败', error);
  }
};

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      return res.status(200).json({ ok: true });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ 
        error: "METHOD_NOT_ALLOWED", 
        got: req.method 
      });
    }

    const body = req.body || {};

    // 校验必填参数
    if (!body.product_id) {
      return res.status(400).json({ 
        error: "MISSING_FIELD", 
        required: ["product_id"] 
      });
    }

    // 1. 查询产品，检查是否满足最低门槛
    const { data: product, error: readError } = await supabase
      .from("products")
      .select("id, stage, bottle_img, ref_packaging_url_1")
      .eq("id", body.product_id)
      .single();

    if (readError) {
      console.error('[product-dev-submit] Database error:', readError);
      return res.status(500).json({ 
        error: "DATABASE_ERROR", 
        message: readError.message 
      });
    }

    if (!product) {
      return res.status(404).json({ 
        error: "NOT_FOUND", 
        message: `产品 ${body.product_id} 不存在` 
      });
    }

    // 2. 检查最低门槛：瓶型 + 参考图1
    if (!product.bottle_img || !product.ref_packaging_url_1) {
      return res.status(400).json({
        error: "DEV_ASSETS_INCOMPLETE",
        message: "需要至少：瓶型图 1 张 + 参考包装图 1 张，才能提交进入设计",
        current: {
          bottle_img: !!product.bottle_img,
          ref_packaging_url_1: !!product.ref_packaging_url_1,
        },
      });
    }

    // 3. 根据AI流程或传统流程，更新状态
    const isAI = body.isAI || false;  // 根据请求中的isAI判断流程

    const { data, error: updateError } = await supabase
      .from("products")
      .update({
        stage: isAI ? 'AI_draft_approved' : 'admin_review',  // 如果是AI流程，stage值为AI_draft_approved
        dev_assets_status: isAI ? '待复审' : '待审核',  // 对应AI流程的状态
        status: isAI ? '待审核' : '待管理员复审',  // 根据流程设置正确的status值
        develop_submit_time: new Date().toISOString(),
      })
      .eq("id", body.product_id)
      .select();

    if (updateError) {
      console.error('[product-dev-submit] Update error:', updateError);
      return res.status(500).json({ 
        error: "DATABASE_ERROR", 
        message: updateError.message 
      });
    }

    return res.status(200).json({ 
      success: true, 
      data: data?.[0] || null,
      message: "产品已成功提交管理员复审"
    });

  } catch (e) {
    console.error('[product-dev-submit] Error:', e);
    return res.status(500).json({ 
      error: "INTERNAL_ERROR", 
      message: String(e?.message || e) 
    });
  }
}
