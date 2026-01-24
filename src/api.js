// src/api.js
// ✅ 硬编码配置（简单直接）
const SB_URL = 'https://ppzwadqyqjadfdklkvtw.supabase.co'
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwendhZHF5cWphZGZka2xrdnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODgzOTQsImV4cCI6MjA4NDQ2NDM5NH0.xRfWovMVy55OqFFeS3hi1bn7X3CMji-clm8Hzo0yBok'

function baseHeaders(extra = {}) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    Accept: 'application/json',
    ...extra,
  }
}

// ================= 内容任务 Content Tasks =================

// 1) 获取某产品的内容任务（没有就空）
export async function fetchContentTasksByProduct(productId) {
  const url = `${SB_URL}/rest/v1/content_tasks?product_id=eq.${productId}&order=created_at.desc`
  const res = await fetch(url, { headers: baseHeaders() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// 2) 创建内容任务
export async function createContentTask({ productId, createdBy = null }) {
  const url = `${SB_URL}/rest/v1/content_tasks`
  const body = [{ product_id: productId, status: 'in_progress', created_by: createdBy }]
  const res = await fetch(url, {
    method: 'POST',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0]
}

// ================= 内容版本 Content Versions =================

// 3) 获取任务下版本列表
export async function fetchVersionsByTask(taskId) {
  const url = `${SB_URL}/rest/v1/content_versions?task_id=eq.${taskId}&order=version_no.asc`
  const res = await fetch(url, { headers: baseHeaders() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// 4) 创建新版本
export async function createContentVersion(payload) {
  const url = `${SB_URL}/rest/v1/content_versions`
  const res = await fetch(url, {
    method: 'POST',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify([payload]),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0]
}

// 5) 获取最终版本（如果存在）
export async function fetchFinalVersion(taskId) {
  const url = `${SB_URL}/rest/v1/content_versions?task_id=eq.${taskId}&is_final=eq.true&limit=1`
  const res = await fetch(url, { headers: baseHeaders() })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0] || null
}

// 6) 设为最终版本（先清空，再设置）
export async function setFinalVersion({ taskId, versionId }) {
  // 6.1 清空同任务所有 final
  {
    const url = `${SB_URL}/rest/v1/content_versions?task_id=eq.${taskId}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: baseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({ is_final: false, status: 'archived' }),
    })
    if (!res.ok) throw new Error(await res.text())
  }

  // 6.2 设置目标版本为 final
  {
    const url = `${SB_URL}/rest/v1/content_versions?id=eq.${versionId}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: baseHeaders({
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
      body: JSON.stringify({ is_final: true, status: 'final' }),
    })
    if (!res.ok) throw new Error(await res.text())
    const rows = await res.json()
    return rows[0]
  }
}

// 7) 更新任务状态为 done（当 final 确定后）
export async function markTaskDone(taskId) {
  const url = `${SB_URL}/rest/v1/content_tasks?id=eq.${taskId}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify({ status: 'done' }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0]
}

// ================= 通用查询 =================
export async function fetchData(table, opts = {}) {
  const {
    select = '*',
    orderBy,
    limit,
    filters,
  } = opts || {}

  const url = new URL(`${SB_URL}/rest/v1/${table}`)
  url.searchParams.set('select', select)

  if (orderBy) url.searchParams.set('order', orderBy)
  if (typeof limit === 'number') url.searchParams.set('limit', String(limit))

  if (Array.isArray(filters)) {
    for (const f of filters) {
      if (!f?.key || !f?.op) continue
      url.searchParams.set(f.key, `${f.op}.${f.value}`)
    }
  }

  const response = await fetch(url.toString(), {
    headers: baseHeaders(),
  })

  if (response.ok) return await response.json()

  const text = await response.text().catch(() => '')
  console.error('fetchData failed:', response.status, text)
  return []
}

// ================= 插入数据 =================
export async function insertData(table, data) {
  const response = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(data),
  })

  if (response.ok) return await response.json()

  const text = await response.text().catch(() => '')
  console.error('insertData failed:', response.status, text)
  throw new Error('插入失败')
}

// ================= 更新数据 =================
export async function updateData(table, id, data) {
  const response = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(data),
  })

  if (response.ok) return await response.json()

  const text = await response.text().catch(() => '')
  console.error('updateData failed:', response.status, text)
  throw new Error('更新失败')
}

// ================= 删除数据 =================
export async function deleteData(table, id) {
  const response = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: baseHeaders({
      Prefer: 'return=representation',
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('deleteData failed:', response.status, text)
  }

  return response.ok
}

// ================= 图片上传通用方法 =================
export async function uploadImage(bucket, file) {
  if (!file) return null

  const ext = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  const path = `${fileName}`

  const uploadRes = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '')
    console.error('uploadImage failed:', uploadRes.status, text)
    throw new Error('图片上传失败')
  }

  return `${SB_URL}/storage/v1/object/public/${bucket}/${path}`
}

// ================= 从 URL 提取存储路径 =================
function extractStoragePath(url) {
  if (!url) return null
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  return match ? match[1] : null
}

// ================= 从 URL 提取 bucket 名称 =================
function extractBucketName(url) {
  if (!url) return null
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\//)
  return match ? match[1] : null
}

// ================= 删除 Storage 中的文件 =================
async function deleteStorageFile(bucket, path) {
  try {
    const response = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${path}`, {
      method: 'DELETE',
      headers: baseHeaders(),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      console.warn(`删除文件失败 [${bucket}/${path}]:`, response.status, text)
      return false
    }

    console.log(`成功删除文件: ${bucket}/${path}`)
    return true
  } catch (error) {
    console.error(`删除文件异常 [${bucket}/${path}]:`, error)
    return false
  }
}

// ================= 删除产品（包括所有图片）=================
export async function deleteProduct(productId) {
  try {
    console.log('开始删除产品:', productId)

    const products = await fetchData('products', {
      filters: [{ key: 'id', op: 'eq', value: productId }],
    })

    if (!products || products.length === 0) {
      throw new Error('产品不存在')
    }

    const product = products[0]
    console.log('产品信息:', product)

    const imagesToDelete = []

    if (product.ref_design_img) {
      const path = extractStoragePath(product.ref_design_img)
      const bucket = extractBucketName(product.ref_design_img)
      if (path && bucket) imagesToDelete.push({ bucket, path })
    }

    const competitorImages = [product.competitor_1_img, product.competitor_2_img, product.competitor_3_img]
    competitorImages.forEach(imgUrl => {
      if (!imgUrl) return
      const path = extractStoragePath(imgUrl)
      const bucket = extractBucketName(imgUrl)
      if (path && bucket) imagesToDelete.push({ bucket, path })
    })

    console.log('需要删除的图片:', imagesToDelete)

    if (imagesToDelete.length > 0) {
      await Promise.all(imagesToDelete.map(({ bucket, path }) => deleteStorageFile(bucket, path)))
      console.log('图片删除完成')
    }

    console.log('删除数据库记录...')
    const success = await deleteData('products', productId)
    if (!success) throw new Error('删除数据库记录失败')

    console.log('产品删除成功')
    return { success: true }
  } catch (error) {
    console.error('删除产品失败:', error)
    throw error
  }
}

// ================= 瓶型库 =================
export async function fetchBottles() {
  return await fetchData('bottles')
}

export async function createBottle(data) {
  return await insertData('bottles', data)
}

// ================= AI（Vercel Functions）=================
// ⚠️ 重要：不要在前端直接调用 Gemini/Claude/OpenAI（会暴露 Key + CORS）
// 这里统一走 Vercel Serverless Functions：/api/extract-competitor 与 /api/generate-plan

/**
 * 提取竞品信息（走后端函数）
 * @param {string} url 竞品链接
 * @param {{ extract_provider?: 'gemini'|'claude'|'gpt4', generate_provider?: 'gemini'|'claude'|'gpt4' }} aiConfig
 */
/**
 * input 支持两种形式：
 * 1) string: url
 * 2) object: { url?: string, images?: [{ data: base64, mime_type: string }] }
 */
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

/**
 * 生成产品方案（走后端函数）
 * @param {object} payload
 */
export async function generateProductPlan(payload) {
  const res = await fetch('/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const text = await res.text().catch(() => '')
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || text || `HTTP_${res.status}`
    throw new Error(msg)
  }

  if (!json) throw new Error('AI 返回格式错误')
  return json
}



// ================= AI 草稿 Drafts =================
// 表名建议：ai_drafts
// 字段建议（最小可用）：
// id (uuid) | created_at (timestamptz) | created_by (text/uuid)
// category | market | platform (text)
// competitors (jsonb) | plan (jsonb)
// status (text: 'draft'|'approved'|'rejected'|'needs_revision')
// reviewed_by (text/uuid) | review_comment (text) | reviewed_at (timestamptz)

// 1) 查询所有 AI 草稿（默认按 created_at 倒序）
export async function fetchAIDrafts(opts = {}) {
  const {
    limit = 50,
    status,          // 可选过滤：draft/approved/rejected/needs_revision
    createdBy,       // 可选过滤：某个用户
  } = opts || {}

  const url = new URL(`${SB_URL}/rest/v1/ai_drafts`)
  url.searchParams.set('select', '*')
  url.searchParams.set('order', 'created_at.desc')
  if (typeof limit === 'number') url.searchParams.set('limit', String(limit))

  if (status) url.searchParams.set('status', `eq.${status}`)
  if (createdBy) url.searchParams.set('created_by', `eq.${createdBy}`)

  const res = await fetch(url.toString(), { headers: baseHeaders() })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows
}

// 2) 创建 AI 草稿
// data 里建议传：
// { created_by, category, market, platform, competitors, plan, status='draft', created_at? }
export async function insertAIDraft(data) {
  const res = await fetch(`${SB_URL}/rest/v1/ai_drafts`, {
    method: 'POST',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify([{
      status: 'draft',
      ...data,
    }]),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0]
}

// 3) 更新草稿状态（审核）
// action: 'approved' | 'rejected' | 'needs_revision'
// reviewedBy: 谁审核的（currentUser.id）
// comment: 审核备注
export async function updateAIDraftStatus(id, action, reviewedBy = null, comment = '') {
  if (!id) throw new Error('MISSING_DRAFT_ID')
  if (!action) throw new Error('MISSING_ACTION')

  const patch = {
    status: action,
    reviewed_by: reviewedBy,
    review_comment: comment || '',
    reviewed_at: new Date().toISOString(),
  }

  const res = await fetch(`${SB_URL}/rest/v1/ai_drafts?id=eq.${id}`, {
    method: 'PATCH',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0]
}


// ================= AI Drafts（Supabase REST）=================

export async function fetchAIDrafts() {
  const url = `${SB_URL}/rest/v1/ai_drafts?order=created_at.desc`
  const res = await fetch(url, { headers: baseHeaders() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function insertAIDraft(data) {
  const url = `${SB_URL}/rest/v1/ai_drafts`
  const res = await fetch(url, {
    method: 'POST',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify([data]),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0]
}

export async function updateAIDraftStatus(id, action, reviewedBy = null, comment = '') {
  const url = `${SB_URL}/rest/v1/ai_drafts?id=eq.${id}`
  const patch = {
    status: action, // approved / rejected / draft
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_comment: comment || '',
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: baseHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }),
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = await res.json()
  return rows[0]
}

