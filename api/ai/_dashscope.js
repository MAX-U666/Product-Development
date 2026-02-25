// api/ai/_dashscope.js
// DashScope API 封装：文生图 + Prompt生成 + 异步轮询

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/api/v1";

/**
 * 用 qwen-plus 生成英文包装设计 Prompt
 */
export async function generateDesignPrompt({
  category,
  sellingPoint,
  ingredients,
  mainEfficacy,
  positioning,
  bottleName,
  layoutStyle,
  layoutDescription,
  refImageDescription,
}) {
  const key = requireEnv("DASHSCOPE_API_KEY");

  const systemPrompt = `You are a professional packaging designer specializing in Southeast Asian beauty & personal care products.
Your job is to generate a detailed English prompt for an AI image generation model to create a product packaging design.
Output ONLY the prompt text, no explanation, no quotes.`;

  const userPrompt = `Generate a detailed image generation prompt for this product packaging:

Product Category: ${category}
Product Positioning: ${positioning || "N/A"}
Selling Points: ${sellingPoint || "N/A"}
Key Ingredients: ${ingredients || "N/A"}
Main Efficacy: ${mainEfficacy || "N/A"}
Bottle Type: ${bottleName}
Layout Style: ${layoutStyle} - ${layoutDescription}
${refImageDescription ? `Reference Style: ${refImageDescription}` : ""}

Requirements:
- Professional product packaging mockup
- Clean white or gradient background
- The bottle should be prominently displayed
- Include product name text placeholder area
- Modern Southeast Asian beauty market aesthetic
- High-end cosmetic product photography style
- 1024x1024 resolution, commercial quality
- Color palette should match the product category (fresh/natural tones for shampoo)`;

  const res = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    }
  );

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`QWEN_PROMPT_ERROR: ${json.error?.message || JSON.stringify(json)}`);
  }

  return json.choices?.[0]?.message?.content?.trim() || "";
}

/**
 * 提交 wan2.5 文生图异步任务
 * 返回 task_id
 */
export async function submitTextToImage(prompt, negativePrompt = "") {
  const key = requireEnv("DASHSCOPE_API_KEY");

  const body = {
    model: "wanx2.1-t2i-turbo",
    input: {
      prompt: prompt,
      negative_prompt:
        negativePrompt ||
        "blurry, low quality, distorted text, watermark, logo, bad anatomy, deformed, ugly, duplicate, error",
    },
    parameters: {
      size: "1024*1024",
      n: 1,
    },
  };

  const res = await fetch(`${DASHSCOPE_BASE}/services/aigc/text2image/image-synthesis`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.code) {
    throw new Error(
      `DASHSCOPE_T2I_ERROR: ${json.code || ""} ${json.message || JSON.stringify(json)}`
    );
  }

  const taskId = json.output?.task_id;
  if (!taskId) {
    throw new Error(`DASHSCOPE_T2I_NO_TASK_ID: ${JSON.stringify(json)}`);
  }

  return taskId;
}

/**
 * 查询异步任务状态
 * 返回 { status, imageUrl, error }
 */
export async function queryTaskStatus(taskId) {
  const key = requireEnv("DASHSCOPE_API_KEY");

  const res = await fetch(`${DASHSCOPE_BASE}/tasks/${taskId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${key}`,
    },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`DASHSCOPE_QUERY_ERROR: ${json.message || JSON.stringify(json)}`);
  }

  const status = json.output?.task_status;

  if (status === "SUCCEEDED") {
    const results = json.output?.results || [];
    const imageUrl = results[0]?.url || results[0]?.b64_image || null;
    return { status: "SUCCEEDED", imageUrl, taskId };
  }

  if (status === "FAILED") {
    return {
      status: "FAILED",
      error: json.output?.message || "Task failed",
      taskId,
    };
  }

  // PENDING / RUNNING
  return { status: status || "RUNNING", taskId };
}

/**
 * 轮询等待任务完成
 * @param {string} taskId
 * @param {number} maxWaitMs - 最大等待时间(ms)，默认180秒
 * @param {number} intervalMs - 轮询间隔(ms)，默认8秒
 */
export async function pollUntilDone(taskId, maxWaitMs = 180000, intervalMs = 8000) {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const result = await queryTaskStatus(taskId);

    if (result.status === "SUCCEEDED") return result;
    if (result.status === "FAILED") throw new Error(`Task failed: ${result.error}`);

    // Wait before next poll
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Task ${taskId} timed out after ${maxWaitMs / 1000}s`);
}
