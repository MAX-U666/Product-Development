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
  const { select = '*', orderBy, limit, filters } = opts || {}

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
 * input 支持两种形式：
 * 1) string: url
 * 2) object: { url?: string, images?: [{ data: base64, mime_type: string }] }
 */
export async function extractCompetitorInfo(input, aiConfig = {}) {
  const payload =
    typeof input === "string"
      ? { url: input, ai_config: aiConfig }
      : { ...input, ai_config: aiConfig }

  const res = await fetch("/api/extract-competitor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const text = await res.text().catch(() => "")
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {}

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || text || `HTTP_${res.status}`
    throw new Error(msg)
  }
  if (!json) throw new Error("AI 返回格式错误")
  return json
}

/**
 * 生成产品方案（走后端函数）
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
  } catch {}

  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || text || `HTTP_${res.status}`
    throw new Error(msg)
  }

  if (!json) throw new Error('AI 返回格式错误')
  return json
}

// ================= AI 草稿（按你当前表结构：ai_drafts）=================

/**
 * 查询所有 AI 草稿
 * opts 可选：limit, status, createdBy
 * 说明：你现在表结构 created_by 是 BIGINT
 */
export async function fetchAIDrafts(opts = {}) {
  const { limit = 50, status, createdBy } = opts || {}

  const url = new URL(`${SB_URL}/rest/v1/ai_drafts`)
  url.searchParams.set('select', '*')
  url.searchParams.set('order', 'created_at.desc')
  if (typeof limit === 'number') url.searchParams.set('limit', String(limit))
  if (status) url.searchParams.set('status', `eq.${status}`)
  if (createdBy != null) url.searchParams.set('created_by', `eq.${createdBy}`)

  const res = await fetch(url.toString(), { headers: baseHeaders() })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/**
 * 创建 AI 草稿
 * 你表字段：
 * competitors_data JSONB
 * ai_explanations JSONB
 * estimated_cost DECIMAL(10,4) DEFAULT 0
 * status draft_status DEFAULT '待审核'
 * created_by BIGINT NOT NULL
 */
export async function insertAIDraft(data) {
  const res = await fetch(`${SB_URL}/rest/v1/ai_drafts`, {
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

/**
 * 更新草稿状态（审核）
 * status：按你 enum 传中文，比如：'待审核' / '已通过' / '已驳回'
 */
export async function updateAIDraftStatus(id, status, reviewedBy, comment = '') {
  if (!id) throw new Error('MISSING_DRAFT_ID')

  const patch = {
    status,
    reviewed_by: reviewedBy ?? null,
    reviewed_at: new Date().toISOString(),
    review_comment: comment || '',
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


// ================= 补充到 src/api.js 末尾 =================

/**
 * ✅ 新增：从 AI 草稿创建正式产品
 * @param {number} draftId - 草稿 ID
 * @param {number} createdBy - 创建人 ID
 */
export async function createProductFromDraft(draftId, createdBy = null) {
  try {
    // 1. 获取草稿详情
    const drafts = await fetchAIDrafts();
    const draft = drafts.find(d => d.id === draftId);
    
    if (!draft) {
      throw new Error('草稿不存在');
    }

    if (draft.status !== '已通过') {
      throw new Error('只能从已通过的草稿创建产品');
    }

    // 2. 构建产品数据
    const productData = {
      // 基础信息
      develop_month: draft.develop_month || new Date().toISOString().slice(0, 7),
      category: draft.category || '',
      target_market: draft.market || '',
      target_platform: draft.platform || '',
      
      // AI 生成的字段
      selling_point: draft.selling_point || draft.sellingPoint || '',
      main_concept: draft.positioning || '',
      ingredient: draft.ingredients || '',
      primary_benefit: draft.efficacy || '',
      ingredients: draft.ingredients || '',
      
      // 产品规格
      capacity: draft.volume || '',
      fragrance: draft.scent || '',
      material_color: draft.texture_color || draft.color || '',
      price: draft.pricing || '',
      
      // 包装需求
      packaging_requirements: draft.packaging_requirements || draft.packaging || '',
      
      // 竞品数据（可选）
      competitor_1_url: '',
      competitor_2_url: '',
      competitor_3_url: '',
      competitor_1_img: '',
      competitor_2_img: '',
      competitor_3_img: '',
      ref_design_img: '',
      
      // 瓶型（可选）
      bottle_id: null,
      
      // 阶段状态
      stage: 1,
      status: '进行中',
      developer_id: createdBy,
      develop_start_time: new Date().toISOString(),
      develop_submit_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      
      // 包装设计字段
      package_designer_id: null,
      package_design_url: null,
      package_design_time: null,
      package_review_status: null,
      package_review_note: null,
      review_history: [],
    };

    // 3. 创建产品
    const result = await insertData('products', productData);
    
    return result;
  } catch (error) {
    console.error('从草稿创建产品失败:', error);
    throw error;
  }
}
