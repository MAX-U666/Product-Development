// File: src/api.js
// ✅ 统一版：Storage bucket 固定为 bottle-library
// ✅ 修复：updateDraftStatus 导出缺失
// ✅ 修复：上传两条路径 bucket 不一致导致 Bucket not found

// ================= Supabase（前端直连 REST / Storage）=================
const SB_URL = "https://ppzwadqyqjadfdklkvtw.supabase.co";
const SB_KEY = "__REPLACE_ME_WITH_YOUR_ANON_KEY__"; // ← 换成你自己的 anon key（可公开的那个）

// ✅ 统一 Storage Bucket
const STORAGE_BUCKET = "bottle-library";

function baseHeaders(extra = {}) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    Accept: "application/json",
    ...extra,
  };
}

// ================= 内容任务 Content Tasks =================

// 1) 获取某产品的内容任务（没有就空）
export async function fetchContentTasksByProduct(productId) {
  const url = `${SB_URL}/rest/v1/content_tasks?product_id=eq.${productId}&order=created_at.desc`;
  const res = await fetch(url, { headers: baseHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// 2) 创建内容任务
export async function createContentTask({ productId, createdBy = null }) {
  const url = `${SB_URL}/rest/v1/content_tasks`;
  const body = [{ product_id: productId, status: "in_progress", created_by: createdBy }];
  const res = await fetch(url, {
    method: "POST",
    headers: baseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0];
}

// ================= 内容版本 Content Versions =================

// 3) 获取任务下版本列表
export async function fetchVersionsByTask(taskId) {
  const url = `${SB_URL}/rest/v1/content_versions?task_id=eq.${taskId}&order=version_no.asc`;
  const res = await fetch(url, { headers: baseHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// 4) 创建新版本
export async function createContentVersion(payload) {
  const url = `${SB_URL}/rest/v1/content_versions`;
  const res = await fetch(url, {
    method: "POST",
    headers: baseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify([payload]),
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0];
}

// 5) 获取最终版本（如果存在）
export async function fetchFinalVersion(taskId) {
  const url = `${SB_URL}/rest/v1/content_versions?task_id=eq.${taskId}&is_final=eq.true&limit=1`;
  const res = await fetch(url, { headers: baseHeaders() });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0] || null;
}

// 6) 设为最终版本（先清空，再设置）
export async function setFinalVersion({ taskId, versionId }) {
  // 6.1 清空同任务所有 final
  {
    const url = `${SB_URL}/rest/v1/content_versions?task_id=eq.${taskId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: baseHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify({ is_final: false, status: "archived" }),
    });
    if (!res.ok) throw new Error(await res.text());
  }

  // 6.2 设置目标版本为 final
  {
    const url = `${SB_URL}/rest/v1/content_versions?id=eq.${versionId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: baseHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify({ is_final: true, status: "final" }),
    });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return rows[0];
  }
}

// 7) 更新任务状态为 done（当 final 确定后）
export async function markTaskDone(taskId) {
  const url = `${SB_URL}/rest/v1/content_tasks?id=eq.${taskId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: baseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({ status: "done" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0];
}

// ================= 通用查询 =================
export async function fetchData(table, opts = {}) {
  const { select = "*", orderBy, limit, filters } = opts || {};

  const url = new URL(`${SB_URL}/rest/v1/${table}`);
  url.searchParams.set("select", select);

  if (orderBy) url.searchParams.set("order", orderBy);
  if (typeof limit === "number") url.searchParams.set("limit", String(limit));

  if (Array.isArray(filters)) {
    for (const f of filters) {
      if (!f?.key || !f?.op) continue;
      url.searchParams.set(f.key, `${f.op}.${f.value}`);
    }
  }

  const response = await fetch(url.toString(), { headers: baseHeaders() });
  if (response.ok) return await response.json();

  const text = await response.text().catch(() => "");
  console.error("fetchData failed:", response.status, text);
  return [];
}

// ================= 插入数据 =================
export async function insertData(table, data) {
  const response = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: baseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify(data),
  });

  if (response.ok) return await response.json();

  const text = await response.text().catch(() => "");
  console.error("insertData failed:", response.status, text);
  throw new Error(text || "插入失败");
}

// ================= 更新数据 =================
export async function updateData(table, id, data) {
  const response = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: baseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify(data),
  });

  if (response.ok) return await response.json();

  const text = await response.text().catch(() => "");
  console.error("updateData failed:", response.status, text);
  throw new Error(text || "更新失败");
}

// ================= 删除数据 =================
export async function deleteData(table, id) {
  const response = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: baseHeaders({ Prefer: "return=representation" }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error("deleteData failed:", response.status, text);
  }

  return response.ok;
}

// ================= ✅ 图片上传（老直传：强制统一 bucket） =================
export async function uploadImage(bucket, file) {
  if (!file) return null;

  // ✅ 强制统一到真实存在的 bucket
  const REAL_BUCKET = STORAGE_BUCKET;

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const path = `${fileName}`;

  const uploadRes = await fetch(`${SB_URL}/storage/v1/object/${REAL_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      ...baseHeaders(),
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  const text = await uploadRes.text().catch(() => "");
  if (!uploadRes.ok) {
    console.error("uploadImage failed:", uploadRes.status, text);
    throw new Error(text || "图片上传失败");
  }

  // public bucket 才能这么拼 URL
  return `${SB_URL}/storage/v1/object/public/${REAL_BUCKET}/${path}`;
}

// ================= 从 URL 提取存储路径 =================
function extractStoragePath(url) {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

// ================= 从 URL 提取 bucket 名称 =================
function extractBucketName(url) {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\//);
  return match ? match[1] : null;
}

// ================= 删除 Storage 中的文件 =================
async function deleteStorageFile(bucket, path) {
  try {
    const response = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "DELETE",
      headers: baseHeaders(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`删除文件失败 [${bucket}/${path}]:`, response.status, text);
      return false;
    }

    console.log(`成功删除文件: ${bucket}/${path}`);
    return true;
  } catch (error) {
    console.error(`删除文件异常 [${bucket}/${path}]:`, error);
    return false;
  }
}

// ================= 删除产品（包括所有图片）=================
export async function deleteProduct(productId) {
  try {
    console.log("开始删除产品:", productId);

    const products = await fetchData("products", {
      filters: [{ key: "id", op: "eq", value: productId }],
    });

    if (!products || products.length === 0) throw new Error("产品不存在");

    const product = products[0];
    const imagesToDelete = [];

    if (product.ref_design_img) {
      const path = extractStoragePath(product.ref_design_img);
      const bucket = extractBucketName(product.ref_design_img);
      if (path && bucket) imagesToDelete.push({ bucket, path });
    }

    const competitorImages = [product.competitor_1_img, product.competitor_2_img, product.competitor_3_img];
    competitorImages.forEach((imgUrl) => {
      if (!imgUrl) return;
      const path = extractStoragePath(imgUrl);
      const bucket = extractBucketName(imgUrl);
      if (path && bucket) imagesToDelete.push({ bucket, path });
    });

    if (imagesToDelete.length > 0) {
      await Promise.all(imagesToDelete.map(({ bucket, path }) => deleteStorageFile(bucket, path)));
    }

    const success = await deleteData("products", productId);
    if (!success) throw new Error("删除数据库记录失败");

    return { success: true };
  } catch (error) {
    console.error("删除产品失败:", error);
    throw error;
  }
}

// ================= 瓶型库 =================
export async function fetchBottles() {
  return await fetchData("bottles");
}

export async function createBottle(data) {
  return await insertData("bottles", data);
}

// ================= AI（Vercel Functions）=================
export async function extractCompetitorInfo(input, aiConfig = {}) {
  const payload =
    typeof input === "string"
      ? { url: input, ai_config: aiConfig }
      : { ...input, ai_config: aiConfig };

  const res = await fetch("/api/extract-competitor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || text || `HTTP_${res.status}`;
    throw new Error(msg);
  }
  if (!json) throw new Error("AI 返回格式错误");
  return json;
}

export async function generateProductPlan(payload) {
  const res = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || text || `HTTP_${res.status}`;
    throw new Error(msg);
  }
  if (!json) throw new Error("AI 返回格式错误");
  return json;
}

// ================= AI 草稿（ai_drafts）=================
export async function fetchAIDrafts(opts = {}) {
  const { limit = 50, status, createdBy } = opts || {};

  const url = new URL(`${SB_URL}/rest/v1/ai_drafts`);
  url.searchParams.set("select", "*");
  url.searchParams.set("order", "created_at.desc");
  if (typeof limit === "number") url.searchParams.set("limit", String(limit));
  if (status) url.searchParams.set("status", `eq.${status}`);
  if (createdBy != null) url.searchParams.set("created_by", `eq.${createdBy}`);

  const res = await fetch(url.toString(), { headers: baseHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function insertAIDraft(data) {
  const res = await fetch(`${SB_URL}/rest/v1/ai_drafts`, {
    method: "POST",
    headers: baseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify([data]),
  });

  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0];
}

// 你原来直连 REST 的审核（保留）
export async function updateAIDraftStatus(id, status, reviewedBy, comment = "") {
  if (!id) throw new Error("MISSING_DRAFT_ID");

  const patch = {
    status,
    reviewed_by: reviewedBy ?? null,
    reviewed_at: new Date().toISOString(),
    review_comment: comment || "",
  };

  const res = await fetch(`${SB_URL}/rest/v1/ai_drafts?id=eq.${id}`, {
    method: "PATCH",
    headers: baseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify(patch),
  });

  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0];
}

// ================= ✅ 新增：草稿审核 + 包装设计（走你后端 API）=================

/**
 * 1) 上传图片到 Supabase Storage（走 /api/upload-image）
 * ✅ bucket 参数不再传，后端也应该强制用 bottle-library
 */
export async function uploadToSupabaseStorage(file, folder = "") {
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: base64,
        // bucket: STORAGE_BUCKET, // ✅ 建议后端强制固定，这里不传也行
        folder,
      }),
    });

    const text = await response.text().catch(() => "");
    let result = null;
    try {
      result = text ? JSON.parse(text) : null;
    } catch {}

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || text || "Upload failed");
    }

    return { success: true, url: result.url, path: result.path };
  } catch (error) {
    console.error("uploadToSupabaseStorage error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 2) 创建产品设计记录
 */
export async function insertProductDesign(designData) {
  const response = await fetch("/api/product-design-insert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(designData),
  });

  const text = await response.text().catch(() => "");
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || text || "Insert failed");
  }

  return result;
}

/**
 * 3) 从草稿创建产品
 */
export async function createProductFromDraft(productData) {
  const response = await fetch("/api/product-from-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productData),
  });

  const text = await response.text().catch(() => "");
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || result?.error || text || `HTTP ${response.status}`);
  }

  return result;
}

/**
 * 4) ✅ 草稿审核状态更新（你前端用的就是这个）
 * 重要：确保你的后端文件路径是 api/ai-drafts-update.js
 * 否则路由会不对导致 405
 */
export async function updateDraftStatus(draftId, action, reviewComment, reviewedBy) {
  const response = await fetch("/api/ai-drafts-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: draftId,
      action, // 'approve' | 'reject'
      review_comment: reviewComment,
      reviewed_by: reviewedBy,
    }),
  });

  const text = await response.text().catch(() => "");
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || text || "Update draft failed");
  }

  return result;
}

/**
 * 5) 更新产品信息
 */
export async function updateProduct(productId, updateData) {
  const response = await fetch("/api/products-update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: productId,
      ...updateData,
    }),
  });

  const text = await response.text().catch(() => "");
  let result = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || text || "Update product failed");
  }

  return result;
}
