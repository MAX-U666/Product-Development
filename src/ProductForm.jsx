import React, { useEffect, useMemo, useState } from 'react'
import { X, Upload, Image as ImageIcon, Download, FileUp } from 'lucide-react'
import { insertData, fetchData } from './api'
import { getCurrentBeijingISO } from './timeConfig'

// ⚠️ 说明：你现在 api.js 里 SUPABASE_URL / SUPABASE_KEY 没有导出
// 为了让 ProductForm "单文件可用"，这里复制一份（跟 api.js 保持一致）
const SUPABASE_URL = 'https://ppzwadqyqjadfdklkvtw.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwendhZHF5cWphZGZka2xrdnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODgzOTQsImV4cCI6MjA4NDQ2NDM5NH0.xRfWovMVy55OqFFeS3hi1bn7X3CMji-clm8Hzo0yBok'

// ==================== Storage 上传（Public Bucket）====================
async function uploadToBucket(bucket, file) {
  if (!file) return null
  const ext = file.name.split('.').pop()
  const safeName = file.name
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\.]/g, '')
    .slice(0, 60)
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}.${ext}`
  const path = `${fileName}`

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': file.type || 'application/octet-stream'
    },
    body: file
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`图片上传失败（${bucket}）：${txt || res.status}`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

// 简单图片预览
function filePreview(file) {
  if (!file) return null
  return URL.createObjectURL(file)
}

// ==================== Excel 导出模板 ====================
function exportExcelTemplate() {
  // CSV 格式（Excel 可以直接打开）
  const headers = [
    '开发月份*',
    '开发时间',
    '开发品类*',
    '卖点*',
    '目标市场',
    '目标平台',
    '赛道',
    '主概念',
    '主要成分',
    '主打功效',
    '完整成分',
    '料体颜色',
    '容量',
    '香味',
    '价格',
    '包装设计需求',
    '竞品链接1',
    '竞品链接2',
    '竞品链接3'
  ]

  const example = [
    '2026-01',
    '2026-01-21',
    '洗面奶',
    '深层清洁，温和不刺激',
    '美国',
    'Amazon',
    '护肤',
    '氨基酸温和清洁',
    '氨基酸、透明质酸',
    '清洁控油、保湿补水',
    '水、甘油、氨基酸表面活性剂...',
    '乳白色',
    '150ml',
    '清新柠檬',
    '$12.99',
    '简约现代风格，主色调为白色和淡蓝色',
    'https://amazon.com/product1',
    'https://amazon.com/product2',
    'https://amazon.com/product3'
  ]

  // 构建 CSV 内容（使用制表符分隔，Excel 更友好）
  let csvContent = '\uFEFF' // UTF-8 BOM，让 Excel 正确识别中文
  csvContent += headers.join('\t') + '\n'
  csvContent += example.join('\t') + '\n'
  // 添加一个空行供填写
  csvContent += headers.map(() => '').join('\t') + '\n'

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `产品开发模板_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)

  alert(
    '✅ 模板已下载！\n\n使用说明：\n1. 用 Excel 打开 CSV 文件\n2. 参考示例行填写产品信息\n3. 保存后导入（*号为必填项）\n4. 图片需在系统中手动上传'
  )
}

// ==================== Excel 导入 ====================
function parseCSV(text) {
  const lines = text.split('\n').filter((line) => line.trim())
  if (lines.length < 2) throw new Error('文件内容为空')

  const headers = lines[0].split('\t').map((h) => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map((v) => v.trim())
    if (values.every((v) => !v)) continue // 跳过空行

    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }

  return data
}

function mapExcelDataToForm(excelRow) {
  return {
    developMonth: excelRow['开发月份*'] || excelRow['开发月份'] || '',
    developTime: excelRow['开发时间'] || '',
    category: excelRow['开发品类*'] || excelRow['开发品类'] || '',
    sellingPoint: excelRow['卖点*'] || excelRow['卖点'] || '',
    targetMarket: excelRow['目标市场'] || '',
    targetPlatform: excelRow['目标平台'] || '',
    track: excelRow['赛道'] || '',
    mainConcept: excelRow['主概念'] || '',
    ingredient: excelRow['主要成分'] || '',
    primaryBenefit: excelRow['主打功效'] || '',
    fullIngredients: excelRow['完整成分'] || '',
    materialColor: excelRow['料体颜色'] || '',
    capacity: excelRow['容量'] || '',
    fragrance: excelRow['香味'] || '',
    price: excelRow['价格'] || '',
    packagingRequirements: excelRow['包装设计需求'] || '',
    competitor1Url: excelRow['竞品链接1'] || '',
    competitor2Url: excelRow['竞品链接2'] || '',
    competitor3Url: excelRow['竞品链接3'] || ''
  }
}

async function importExcelTemplate(file, setFormData, setImportedData) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const rows = parseCSV(text)

        if (rows.length === 0) {
          reject(new Error('Excel 文件中没有数据'))
          return
        }

        // 如果只有一行数据，直接填充到表单
        if (rows.length === 1) {
          const formData = mapExcelDataToForm(rows[0])
          setFormData((prevData) => ({
            ...prevData,
            ...formData
          }))
          resolve({ type: 'single', data: formData })
        } else {
          // 多行数据，存储起来供用户选择或批量导入
          setImportedData(rows)
          resolve({ type: 'multiple', count: rows.length })
        }
      } catch (error) {
        reject(new Error('Excel 文件格式错误：' + error.message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

export default function ProductForm({ currentUser, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    developMonth: new Date().toISOString().slice(0, 7),
    developTime: new Date().toISOString().slice(0, 10),
    category: '',
    sellingPoint: '',
    targetMarket: '',
    targetPlatform: '',
    track: '',
    mainConcept: '',
    ingredient: '',
    primaryBenefit: '',
    fullIngredients: '',
    materialColor: '',
    capacity: '',
    fragrance: '',
    price: '',
    packagingRequirements: '',
    competitor1Url: '',
    competitor2Url: '',
    competitor3Url: ''
  })

  const [competitorImgs, setCompetitorImgs] = useState([null, null, null])
  const [refDesignImg, setRefDesignImg] = useState(null)

  const [bottles, setBottles] = useState([])
  const [selectedBottle, setSelectedBottle] = useState(null)

  const [showBottleUpload, setShowBottleUpload] = useState(false)
  const [newBottleName, setNewBottleName] = useState('')
  const [newBottleImg, setNewBottleImg] = useState(null)

  const [loading, setLoading] = useState(false)
  const [loadingTip, setLoadingTip] = useState('')

  const [importedData, setImportedData] = useState(null)
  const [showBatchImport, setShowBatchImport] = useState(false)

  // 加载瓶型库
  useEffect(() => {
    ;(async () => {
      try {
        const list = await fetchData('bottles')
        setBottles(Array.isArray(list) ? list : [])
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  const competitorPreviews = useMemo(
    () => competitorImgs.map((f) => filePreview(f)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [competitorImgs[0], competitorImgs[1], competitorImgs[2]]
  )
  const refDesignPreview = useMemo(() => filePreview(refDesignImg), [refDesignImg])
  const newBottlePreview = useMemo(() => filePreview(newBottleImg), [newBottleImg])

  // 处理 Excel 导入
  async function handleImportExcel(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setLoadingTip('正在读取 Excel 文件...')

    try {
      const result = await importExcelTemplate(file, setFormData, setImportedData)

      if (result.type === 'single') {
        alert('✅ Excel 导入成功！\n\n已自动填充表单，请检查数据并上传图片')
      } else {
        alert(
          `✅ 检测到 ${result.count} 条产品数据！\n\n您可以：\n1. 点击下方"批量导入"按钮查看和导入\n2. 或继续手动创建单个产品`
        )
        setShowBatchImport(true)
      }
    } catch (error) {
      alert('❌ 导入失败：' + error.message)
    } finally {
      setLoading(false)
      setLoadingTip('')
      e.target.value = ''
    }
  }

  async function handleCreateBottle() {
    if (!newBottleName.trim()) {
      alert('请填写瓶型名称')
      return
    }
    if (!newBottleImg) {
      alert('请上传瓶型图片')
      return
    }

    setLoading(true)
    setLoadingTip('正在上传瓶型图片...')

    try {
      const bottleImgUrl = await uploadToBucket('bottle-library', newBottleImg)

      setLoadingTip('正在写入瓶型库...')
      const created = await insertData('bottles', {
        name: newBottleName.trim(),
        img_url: bottleImgUrl,
        created_by: currentUser?.username || currentUser?.name || ''
      })

      const newBottle = Array.isArray(created) ? created[0] : created
      if (!newBottle?.id) throw new Error('瓶型创建返回异常')

      setBottles((prev) => [newBottle, ...prev])
      setSelectedBottle(newBottle)

      setNewBottleName('')
      setNewBottleImg(null)
      setShowBottleUpload(false)

      alert('瓶型上传成功，并已自动选择')
    } catch (e) {
      alert('瓶型上传失败：' + (e?.message || 'unknown'))
    } finally {
      setLoading(false)
      setLoadingTip('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!formData.category || !formData.sellingPoint) {
      alert('请填写品类和卖点')
      return
    }

    setLoading(true)

    try {
      setLoadingTip('正在上传竞品图片...')
      const [c1, c2, c3] = await Promise.all([
        uploadToBucket('competitor-images', competitorImgs[0]),
        uploadToBucket('competitor-images', competitorImgs[1]),
        uploadToBucket('competitor-images', competitorImgs[2])
      ])

      setLoadingTip('正在上传参考设计图片...')
      const refImgUrl = await uploadToBucket('ref-design-images', refDesignImg)

      setLoadingTip('正在创建产品...')

      const beijingTimeNow = getCurrentBeijingISO()

      // ✅ 按你要求：删除 id 字段 + 增加包装设计相关字段
      const newProduct = {
        develop_month: formData.developMonth,
        develop_time: formData.developTime,
        category: formData.category,
        selling_point: formData.sellingPoint,
        target_market: formData.targetMarket || '',
        target_platform: formData.targetPlatform || '',
        track: formData.track || '',
        main_concept: formData.mainConcept || '',
        ingredient: formData.ingredient || '',
        primary_benefit: formData.primaryBenefit || '',
        ingredients: formData.fullIngredients || '',

        material_color: formData.materialColor || '',
        capacity: formData.capacity || '',
        fragrance: formData.fragrance || '',
        price: formData.price || '',
        packaging_requirements: formData.packagingRequirements || '',

        competitor_1_url: formData.competitor1Url || '',
        competitor_2_url: formData.competitor2Url || '',
        competitor_3_url: formData.competitor3Url || '',

        competitor_1_img: c1 || '',
        competitor_2_img: c2 || '',
        competitor_3_img: c3 || '',

        ref_design_img: refImgUrl || '',

        bottle_id: selectedBottle?.id ?? null,

        stage: 1,
        status: '待审核',
        dev_assets_status: '待复审',
        developer_id: currentUser.id,
        develop_start_time: beijingTimeNow,
        develop_submit_time: beijingTimeNow,
        created_at: beijingTimeNow,

        // ✅ 包装设计字段
        package_designer_id: null,
        package_design_url: null,
        package_design_time: null,
        package_review_status: null,
        package_review_note: null,
        review_history: []
      }

      await insertData('products', newProduct)

      alert('产品创建成功！')
      onSuccess?.()
      onClose?.()
    } catch (error) {
      alert('创建失败: ' + (error?.message || 'unknown'))
    } finally {
      setLoading(false)
      setLoadingTip('')
    }
  }

  // 批量导入处理
  async function handleBatchImport() {
    if (!importedData || importedData.length === 0) return

    setLoading(true)
    setLoadingTip(`正在批量创建 ${importedData.length} 个产品...`)

    try {
      const beijingTimeNow = getCurrentBeijingISO()
      let successCount = 0

      for (let i = 0; i < importedData.length; i++) {
        const row = importedData[i]
        const data = mapExcelDataToForm(row)

        if (!data.category || !data.sellingPoint) {
          console.warn(`跳过第 ${i + 1} 行：缺少必填字段`)
          continue
        }

        setLoadingTip(`正在创建第 ${i + 1}/${importedData.length} 个产品...`)

        const newProduct = {
          develop_month: data.developMonth,
          develop_time: data.developTime,
          category: data.category,
          selling_point: data.sellingPoint,
          target_market: data.targetMarket,
          target_platform: data.targetPlatform,
          track: data.track,
          main_concept: data.mainConcept,
          ingredient: data.ingredient,
          primary_benefit: data.primaryBenefit,
          ingredients: data.fullIngredients,

          material_color: data.materialColor,
          capacity: data.capacity,
          fragrance: data.fragrance,
          price: data.price,
          packaging_requirements: data.packagingRequirements,

          competitor_1_url: data.competitor1Url,
          competitor_2_url: data.competitor2Url,
          competitor_3_url: data.competitor3Url,

          competitor_1_img: '',
          competitor_2_img: '',
          competitor_3_img: '',

          ref_design_img: '',

          bottle_id: null,

          stage: 1,
          status: '进行中',
          developer_id: currentUser.id,
          develop_start_time: beijingTimeNow,
          develop_submit_time: beijingTimeNow,
          created_at: beijingTimeNow,

          // ✅ 包装设计字段（批量导入同样带上默认值）
          package_designer_id: null,
          package_design_url: null,
          package_design_time: null,
          package_review_status: null,
          package_review_note: null,
          review_history: []
        }

        await insertData('products', newProduct)
        successCount++
      }

      alert(`✅ 批量导入成功！\n\n共创建 ${successCount} 个产品\n注意：图片需要在产品详情中单独上传`)
      onSuccess?.()
      onClose?.()
    } catch (error) {
      alert('批量导入失败: ' + (error?.message || 'unknown'))
    } finally {
      setLoading(false)
      setLoadingTip('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">新建产品</h2>
            {loading && loadingTip ? <div className="text-sm text-gray-500 mt-1">{loadingTip}</div> : null}
          </div>

          {/* Excel 操作按钮 */}
          <div className="flex items-center gap-3">
            {importedData && importedData.length > 1 && (
              <button
                type="button"
                onClick={handleBatchImport}
                disabled={loading}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Upload size={18} />
                批量导入 ({importedData.length}条)
              </button>
            )}

            <button
              type="button"
              onClick={exportExcelTemplate}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
              title="下载 Excel 模板"
            >
              <Download size={18} />
              下载模板
            </button>

            <label className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 cursor-pointer">
              <FileUp size={18} />
              导入Excel
              <input type="file" accept=".csv,.xls,.xlsx" onChange={handleImportExcel} className="hidden" />
            </label>

            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基础信息 */}
          <div className="border rounded-2xl p-5">
            <div className="font-semibold text-gray-800 mb-4">📋 基础信息</div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开发月份 <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={formData.developMonth}
                  onChange={(e) => setFormData({ ...formData, developMonth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">开发时间</label>
                <input
                  type="date"
                  value={formData.developTime}
                  onChange={(e) => setFormData({ ...formData, developTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开发品类 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="如：洗面奶、精华液"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">赛道</label>
                <input
                  type="text"
                  value={formData.track}
                  onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="如：护肤、彩妆"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标市场</label>
                <input
                  type="text"
                  value={formData.targetMarket}
                  onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="如：美国、欧洲"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标平台</label>
                <input
                  type="text"
                  value={formData.targetPlatform}
                  onChange={(e) => setFormData({ ...formData, targetPlatform: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="如：Amazon、TikTok"
                />
              </div>
            </div>
          </div>

          {/* ✅ 产品规格 */}
          <div className="border rounded-2xl p-5 bg-blue-50">
            <div className="font-semibold text-gray-800 mb-4">🎨 产品规格</div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">料体颜色</label>
                <input
                  type="text"
                  value={formData.materialColor}
                  onChange={(e) => setFormData({ ...formData, materialColor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  placeholder="如：乳白色、透明、淡粉色"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">容量</label>
                <input
                  type="text"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  placeholder="如：50ml、100g、500ml"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">香味</label>
                <input
                  type="text"
                  value={formData.fragrance}
                  onChange={(e) => setFormData({ ...formData, fragrance: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  placeholder="如：清新柠檬、无香、玫瑰花香"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">价格</label>
                <input
                  type="text"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  placeholder="如：$19.99、¥89"
                />
              </div>
            </div>
          </div>

          {/* 卖点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              卖点 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.sellingPoint}
              onChange={(e) => setFormData({ ...formData, sellingPoint: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows="3"
              placeholder="产品核心卖点..."
              required
            />
          </div>

          {/* 主概念 & 成分 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">主概念</label>
              <input
                type="text"
                value={formData.mainConcept}
                onChange={(e) => setFormData({ ...formData, mainConcept: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="产品主要概念"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">主要成分</label>
              <input
                type="text"
                value={formData.ingredient}
                onChange={(e) => setFormData({ ...formData, ingredient: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="如：烟酰胺、玻尿酸..."
              />
            </div>
          </div>

          {/* 主打功效 / 完整成分 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">主打功效</label>
              <textarea
                value={formData.primaryBenefit}
                onChange={(e) => setFormData({ ...formData, primaryBenefit: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows="3"
                placeholder="如：控油祛痘 / 舒缓修护 / 去屑止痒..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">完整成分</label>
              <textarea
                value={formData.fullIngredients}
                onChange={(e) => setFormData({ ...formData, fullIngredients: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows="3"
                placeholder="按 INCI / 配方表完整粘贴"
              />
            </div>
          </div>

          {/* 包装设计需求 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">包装设计需求</label>
            <textarea
              value={formData.packagingRequirements}
              onChange={(e) => setFormData({ ...formData, packagingRequirements: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows="4"
              placeholder="描述包装设计的具体要求，如：风格、色调、元素、文案位置等..."
            />
          </div>

          {/* 竞品信息 */}
          <div className="border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon size={18} className="text-gray-600" />
              <div className="font-semibold text-gray-800">竞品信息（3条链接 + 3张图片）</div>
            </div>

            <div className="space-y-4">
              {[0, 1, 2].map((i) => {
                const urlKey = i === 0 ? 'competitor1Url' : i === 1 ? 'competitor2Url' : 'competitor3Url'
                return (
                  <div key={i} className="grid grid-cols-2 gap-3 items-start">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{`竞品链接 ${i + 1}`}</label>
                      <input
                        type="text"
                        value={formData[urlKey]}
                        onChange={(e) => setFormData({ ...formData, [urlKey]: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="https://..."
                      />
                      {formData[urlKey] ? (
                        <a
                          href={formData[urlKey]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          打开链接
                        </a>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{`竞品图片 ${i + 1}`}</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          const arr = [...competitorImgs]
                          arr[i] = file
                          setCompetitorImgs(arr)
                        }}
                        className="block w-full text-sm"
                      />
                      {competitorPreviews[i] ? (
                        <img
                          src={competitorPreviews[i]}
                          alt=""
                          className="mt-2 w-full max-w-[220px] h-[120px] object-cover rounded-lg border"
                        />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 参考设计图 */}
          <div className="border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Upload size={18} className="text-gray-600" />
              <div className="font-semibold text-gray-800">参考设计图片</div>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setRefDesignImg(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            {refDesignPreview ? (
              <img
                src={refDesignPreview}
                alt=""
                className="mt-3 w-full max-w-[320px] h-[160px] object-cover rounded-lg border"
              />
            ) : (
              <div className="text-xs text-gray-500 mt-2">可选：上传一张参考设计图，用于设计/对标</div>
            )}
          </div>

          {/* 瓶型库 */}
          <div className="border rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="font-semibold text-gray-800">瓶型（从瓶型库选择）</div>
              <button
                type="button"
                onClick={() => setShowBottleUpload((v) => !v)}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
              >
                {showBottleUpload ? '收起上传' : '上传新瓶型'}
              </button>
            </div>

            {bottles?.length ? (
              <div className="flex flex-wrap gap-3">
                {bottles.map((b) => (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => setSelectedBottle(b)}
                    className={`border rounded-xl p-2 w-[140px] text-left hover:shadow-sm transition ${
                      selectedBottle?.id === b.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                    }`}
                  >
                    <img src={b.img_url} alt="" className="w-full h-[90px] object-cover rounded-lg" />
                    <div className="text-xs text-gray-700 mt-2 line-clamp-2">{b.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">瓶型库暂无数据（可点击右上角上传新瓶型）</div>
            )}

            {showBottleUpload ? (
              <div className="mt-4 border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">瓶型名称</label>
                  <input
                    type="text"
                    value={newBottleName}
                    onChange={(e) => setNewBottleName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="如：500ml 圆肩瓶 / 300ml 方瓶..."
                  />
                  <div className="text-xs text-gray-500 mt-2">建议写"容量 + 外观特征 + 编号"</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">瓶型图片</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewBottleImg(e.target.files?.[0] || null)}
                    className="block w-full text-sm"
                  />
                  {newBottlePreview ? (
                    <img
                      src={newBottlePreview}
                      alt=""
                      className="mt-2 w-full max-w-[220px] h-[120px] object-cover rounded-lg border"
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCreateBottle}
                    className="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? '上传中...' : '确认上传瓶型'}
                  </button>
                </div>
              </div>
            ) : null}

            {selectedBottle ? (
              <div className="mt-3 text-sm text-green-700">
                已选择瓶型：<span className="font-semibold">{selectedBottle.name}</span>
              </div>
            ) : (
              <div className="mt-3 text-xs text-gray-500">可选：未选择也能创建产品，但建议选择瓶型以便设计对齐</div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? '创建中...' : '创建产品'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
