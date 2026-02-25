// api/ai/generate-package.js
// POST /api/ai/generate-package
// 入参: { product_id, bottle_ids: [1,2,3], ref_image_urls: ["url1","url2"] }
// 功能: 为每个瓶型 × 5种排版风格 生成包装方案，写入 package_designs 表

import {
  generateDesignPrompt,
  submitTextToImage,
  pollUntilDone,
} from "./_dashscope.js";

// Supabase 配置
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

// 预设5种排版风格（内联，Phase 3 再做数据库管理）
const LAYOUT_STYLES = [
  {
    id: "A",
    name: "居中对称",
    description: "Title centered at top, bottle centered in middle, selling points below. Clean symmetrical layout.",
    scene: "通用型",
  },
  {
    id: "B",
    name: "左右分栏",
    description: "Bottle on left side, product title and selling points vertically arranged on right side. Information-rich layout.",
    scene: "信息量大",
  },
  {
    id: "C",
    name: "产品主导",
    description: "Bottle occupies 80% of the frame, minimal small text accents. Hero product shot with premium feel.",
    scene: "高端简约",
  },
  {
    id: "D",
    name: "元素环绕",
    description: "Ingredient element icons surround the bottle, title at top. Highlights key ingredients and natural elements.",
    scene: "主打成分",
  },
  {
    id: "E",
    name: "场景沉浸",
    description: "Product placed in lifestyle usage scene with background environment. Immersive lifestyle photography style.",
    scene: "生活方式",
  },
];

// ========== Supabase helpers ==========

async function fetchProduct(productId) {
  const url = `${SB_URL}/rest/v1/products?id=eq.${productId}&limit=1`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`Fetch product failed: ${await res.text()}`);
  const rows = await res.json();
  return rows?.[0] || null;
}

async function fetchBottle(bottleId) {
  const url = `${SB_URL}/rest/v1/bottles?id=eq.${bottleId}&limit=1`;
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) throw new Error(`Fetch bottle failed: ${await res.text()}`);
  const rows = await res.json();
  return rows?.[0] || null;
}

async function insertPackageDesign(data) {
  const url = `${SB_URL}/rest/v1/package_designs`;
  const res = await fetch(url, {
    method: "POST",
    headers: sbHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify([data]),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert package_design failed: ${text}`);
  }
  const rows = await res.json();
  return rows?.[0];
}

async function updatePackageDesign(id, data) {
  const url = `${SB_URL}/rest/v1/package_designs?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: sbHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update package_design failed: ${text}`);
  }
  const rows = await res.json();
  return rows?.[0];
}

// ========== 单个方案生成流程 ==========

async function generateSingleDesign({
  product,
  bottle,
  layoutStyle,
  refImageUrls,
}) {
  // 1. 先在数据库创建 pending 记录
  const designRecord = await insertPackageDesign({
    product_id: product.id,
    bottle_id: bottle.id,
    bottle_name: bottle.name,
    layout_style_id: layoutStyle.id,
    layout_style_name: layoutStyle.name,
    ref_image_urls: refImageUrls || [],
    status: "generating",
    retry_count: 0,
    created_at: new Date().toISOString(),
  });

  try {
    // 2. 用 qwen-plus 生成设计 Prompt
    const prompt = await generateDesignPrompt({
      category: product.category || "shampoo",
      sellingPoint: product.selling_point || "",
      ingredients: product.ingredients || "",
      mainEfficacy: product.main_efficacy || "",
      positioning: product.positioning || "",
      bottleName: bottle.name || "standard bottle",
      layoutStyle: layoutStyle.name,
      layoutDescription: layoutStyle.description,
      refImageDescription: refImageUrls?.length
        ? `The design should reference the style of the provided reference images.`
        : "",
    });

    // 3. 提交文生图任务
    const taskId = await submitTextToImage(prompt);

    // 更新记录：记录 prompt 和 task_id
    await updatePackageDesign(designRecord.id, {
      prompt_used: prompt,
      dashscope_task_id: taskId,
      status: "generating",
    });

    // 4. 轮询等待结果（最多3分钟）
    const result = await pollUntilDone(taskId, 180000, 8000);

    // 5. 成功：更新记录
    await updatePackageDesign(designRecord.id, {
      design_url: result.imageUrl,
      status: "pending",
    });

    return {
      id: designRecord.id,
      status: "success",
      design_url: result.imageUrl,
      layout_style: layoutStyle.name,
      bottle_name: bottle.name,
    };
  } catch (error) {
    // 失败：更新记录
    await updatePackageDesign(designRecord.id, {
      status: "failed",
      prompt_used: error.message,
    });

    return {
      id: designRecord.id,
      status: "failed",
      error: error.message,
      layout_style: layoutStyle.name,
      bottle_name: bottle.name,
    };
  }
}

// ========== API Handler ==========

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { product_id, bottle_ids, ref_image_urls } = req.body || {};

    // 校验
    if (!product_id) {
      return res.status(400).json({ error: "Missing product_id" });
    }
    if (!bottle_ids || !Array.isArray(bottle_ids) || bottle_ids.length === 0) {
      return res.status(400).json({ error: "Need at least 1 bottle_id" });
    }
    if (bottle_ids.length > 3) {
      return res.status(400).json({ error: "Maximum 3 bottles" });
    }

    // 获取产品数据
    const product = await fetchProduct(product_id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 获取瓶型数据
    const bottles = [];
    for (const bid of bottle_ids) {
      const bottle = await fetchBottle(bid);
      if (!bottle) {
        return res.status(404).json({ error: `Bottle ${bid} not found` });
      }
      bottles.push(bottle);
    }

    // 更新产品状态
    await fetch(`${SB_URL}/rest/v1/products?id=eq.${product_id}`, {
      method: "PATCH",
      headers: sbHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status: "AI包装生成中", stage: 1 }),
    });

    // 构建生成任务矩阵：瓶型 × 排版风格
    const totalDesigns = bottles.length * LAYOUT_STYLES.length;
    console.log(
      `📦 开始生成 ${bottles.length} 瓶型 × ${LAYOUT_STYLES.length} 风格 = ${totalDesigns} 套方案`
    );

    // 并行生成所有方案（每3个一批，避免API限流）
    const results = [];
    const tasks = [];

    for (const bottle of bottles) {
      for (const style of LAYOUT_STYLES) {
        tasks.push({ bottle, style });
      }
    }

    // 分批执行（每批3个并行）
    const BATCH_SIZE = 3;
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((task) =>
          generateSingleDesign({
            product,
            bottle: task.bottle,
            layoutStyle: task.style,
            refImageUrls: ref_image_urls || [],
          })
        )
      );

      for (const r of batchResults) {
        if (r.status === "fulfilled") {
          results.push(r.value);
        } else {
          results.push({ status: "failed", error: r.reason?.message || "Unknown error" });
        }
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const failCount = results.filter((r) => r.status === "failed").length;

    // 更新产品状态
    await fetch(`${SB_URL}/rest/v1/products?id=eq.${product_id}`, {
      method: "PATCH",
      headers: sbHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        status: failCount === totalDesigns ? "AI生成失败" : "待设计师审核",
        stage: 2,
        dev_assets_status: "已提交",
      }),
    });

    return res.status(200).json({
      success: true,
      message: `已生成 ${successCount}/${totalDesigns} 套方案${
        failCount > 0 ? `，${failCount} 套失败` : ""
      }`,
      total: totalDesigns,
      success_count: successCount,
      fail_count: failCount,
      results,
    });
  } catch (error) {
    console.error("generate-package error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
}
