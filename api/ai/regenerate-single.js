// api/ai/regenerate-single.js
// POST /api/ai/regenerate-single
// 入参: { design_id }
// 功能: 对单个失败/淘汰的方案重新生成

import {
  generateDesignPrompt,
  submitTextToImage,
  pollUntilDone,
} from "./_dashscope.js";

const SB_URL = "https://ppzwadqyqjadfdklkvtw.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwendhZHF5cWphZGZka2xrdnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODgzOTQsImV4cCI6MjA4NDQ2NDM5NH0.xRfWovMVy55OqFFeS3hi1bn7X3CMji-clm8Hzo0yBok";

function sbHeaders(extra = {}) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    Accept: "application/json",
    ...extra,
  };
}

// 排版风格（与 generate-package.js 保持一致）
const LAYOUT_MAP = {
  A: { name: "居中对称", description: "Title centered at top, bottle centered in middle, selling points below." },
  B: { name: "左右分栏", description: "Bottle on left side, product title and selling points on right side." },
  C: { name: "产品主导", description: "Bottle occupies 80% of the frame, minimal small text accents." },
  D: { name: "元素环绕", description: "Ingredient element icons surround the bottle, title at top." },
  E: { name: "场景沉浸", description: "Product placed in lifestyle usage scene with background environment." },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { design_id } = req.body || {};
    if (!design_id) return res.status(400).json({ error: "Missing design_id" });

    // 获取原方案记录
    const dUrl = `${SB_URL}/rest/v1/package_designs?id=eq.${design_id}&limit=1`;
    const dRes = await fetch(dUrl, { headers: sbHeaders() });
    const designs = await dRes.json();
    const design = designs?.[0];
    if (!design) return res.status(404).json({ error: "Design not found" });

    // 获取产品
    const pUrl = `${SB_URL}/rest/v1/products?id=eq.${design.product_id}&limit=1`;
    const pRes = await fetch(pUrl, { headers: sbHeaders() });
    const products = await pRes.json();
    const product = products?.[0];
    if (!product) return res.status(404).json({ error: "Product not found" });

    // 获取瓶型
    const bUrl = `${SB_URL}/rest/v1/bottles?id=eq.${design.bottle_id}&limit=1`;
    const bRes = await fetch(bUrl, { headers: sbHeaders() });
    const bottles = await bRes.json();
    const bottle = bottles?.[0];

    const layout = LAYOUT_MAP[design.layout_style_id] || LAYOUT_MAP["A"];

    // 标记为重新生成中
    await fetch(`${SB_URL}/rest/v1/package_designs?id=eq.${design_id}`, {
      method: "PATCH",
      headers: sbHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        status: "generating",
        retry_count: (design.retry_count || 0) + 1,
      }),
    });

    // 重新生成
    const prompt = await generateDesignPrompt({
      category: product.category || "shampoo",
      sellingPoint: product.selling_point || "",
      ingredients: product.ingredients || "",
      mainEfficacy: product.main_efficacy || "",
      positioning: product.positioning || "",
      bottleName: bottle?.name || "standard bottle",
      layoutStyle: layout.name,
      layoutDescription: layout.description,
    });

    const taskId = await submitTextToImage(prompt);

    await fetch(`${SB_URL}/rest/v1/package_designs?id=eq.${design_id}`, {
      method: "PATCH",
      headers: sbHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prompt_used: prompt, dashscope_task_id: taskId }),
    });

    const result = await pollUntilDone(taskId);

    await fetch(`${SB_URL}/rest/v1/package_designs?id=eq.${design_id}`, {
      method: "PATCH",
      headers: sbHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ design_url: result.imageUrl, status: "pending" }),
    });

    return res.status(200).json({
      success: true,
      design_id,
      design_url: result.imageUrl,
    });
  } catch (error) {
    console.error("regenerate-single error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
