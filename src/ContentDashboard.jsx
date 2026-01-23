import React, { useState, useMemo, useEffect } from 'react'
import { Package, CheckCircle, Clock, X, Upload, Image as ImageIcon, Eye } from 'lucide-react'
import { updateData, uploadImage } from './api'
import { formatTime, getCurrentBeijingISO } from './timeConfig'

// 9种固定的图片类型
const IMAGE_TYPES = [
  '主图',
  '适用对象',
  '对比图',
  '周期图',
  '对比图2',
  '成分图',
  '卖点归纳图',
  '无刺激图/证书',
  '使用方法'
]

export default function ContentDashboard({ products = [], currentUser, onRefresh }) {
  const [selectedProduct, setSelectedProduct] = useState(null)

  // 待接单的产品（包装审核通过，stage=4）
  const pendingProducts = useMemo(() => {
    return products.filter(p => p.stage === 4 && !p.content_creator_id)
  }, [products])

  // 我的任务
  const myTasks = useMemo(() => {
    return products.filter(
      p => p.content_creator_id === currentUser.id && p.stage >= 4 && p.stage <= 6
    )
  }, [products, currentUser.id])

  // 接单
  async function handleAcceptTask(product) {
    if (!confirm(`确定接单：${product.category || '未命名'}？`)) return

    try {
      await updateData('products', product.id, {
        content_creator_id: currentUser.id,
        content_start_time: getCurrentBeijingISO()
      })

      alert('✅ 接单成功！')
      onRefresh?.()
    } catch (error) {
      alert('接单失败：' + (error?.message || '未知错误'))
    }
  }

  // ✅ 不是弹窗：点击“开始填写/补充翻译”后进入同一 SPA 的“全屏编辑页”
  if (selectedProduct) {
    return (
      <ContentTaskPage
        product={selectedProduct}
        currentUser={currentUser}
        onBack={() => setSelectedProduct(null)}
        onRefresh={onRefresh}
      />
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">✍️ 内容策划工作台</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">待接单</p>
              <p className="text-3xl font-bold mt-1">{pendingProducts.length}</p>
            </div>
            <Package size={40} className="opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">进行中</p>
              <p className="text-3xl font-bold mt-1">{myTasks.length}</p>
            </div>
            <Clock size={40} className="opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">已完成</p>
              <p className="text-3xl font-bold mt-1">
                {
                  products.filter(
                    p => p.content_creator_id === currentUser.id && p.translation_complete
                  ).length
                }
              </p>
            </div>
            <CheckCircle size={40} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* 待接单列表 */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Package size={20} />
          待接单任务 ({pendingProducts.length})
        </h3>

        {pendingProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package className="mx-auto mb-3" size={48} />
            <p>暂无待接单任务</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingProducts.map(product => (
              <div
                key={product.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 text-lg">
                      {product.category || '未命名产品'}
                    </h4>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <p>📅 开发月份：{product.develop_month || '-'}</p>
                      <p>💡 卖点：{product.selling_point?.slice(0, 100) || '-'}...</p>
                      <p>📦 包装审核通过：{formatTime(product.package_review_time)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptTask(product)}
                    className="ml-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    接单
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 我的任务列表 */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock size={20} />
          我的任务 ({myTasks.length})
        </h3>

        {myTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock className="mx-auto mb-3" size={48} />
            <p>暂无进行中的任务</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myTasks.map(product => (
              <div
                key={product.id}
                className="border-2 rounded-xl p-5 transition-all border-gray-200 bg-white hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg">
                      {product.category || '未命名产品'}
                    </h4>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <p>📅 开发月份：{product.develop_month}</p>
                      <p>⏰ 接单时间：{formatTime(product.content_start_time)}</p>
                      <p>📊 当前阶段：阶段{product.stage}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {product.stage === 4 && !product.content_first_submit_time && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        待填写
                      </span>
                    )}
                    {product.content_review_status === 'pending' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        审核中
                      </span>
                    )}
                    {product.content_review_status === 'approved' &&
                      !product.translation_complete && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          待补充翻译
                        </span>
                      )}
                    {product.translation_complete && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        已提交翻译
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 flex justify-end">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {!product.content_first_submit_time
                      ? '开始填写'
                      : product.content_review_status === 'approved' &&
                        !product.translation_complete
                      ? '补充翻译'
                      : '查看详情'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** ✅ 全屏内容编辑页（不是弹窗） */
function ContentTaskPage({ product, currentUser, onBack, onRefresh }) {
  const needTranslation = product.content_review_status === 'approved' && !product.translation_complete

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
        >
          ← 返回任务列表
        </button>

        <div className="text-sm text-gray-600">
          当前：<span className="font-medium text-gray-800">{product.category || '未命名产品'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左侧：产品上下文信息（开发+设计阶段的信息都给内容看） */}
        <div className="lg:col-span-4">
          <ProductContextPanel product={product} />
        </div>

        {/* 右侧：表单 */}
        <div className="lg:col-span-8">
          {needTranslation ? (
            <TranslationForm
              product={product}
              onBack={onBack}
              onSuccess={() => onRefresh?.()}
            />
          ) : (
            <FirstSubmitForm
              product={product}
              currentUser={currentUser}
              onBack={onBack}
              onSuccess={() => onRefresh?.()}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/** 产品上下文面板：尽量把你之前阶段的字段都展示出来 */
function ProductContextPanel({ product }) {
  const rows = [
    ['开发月份', product.develop_month],
    ['阶段', product.stage ? `阶段${product.stage}` : '-'],
    ['卖点', product.selling_point],
    ['主概念', product.main_concept || product.mainConcept],
    ['主要成分', product.ingredient || product.main_ingredient || product.mainIngredient],
    ['主打功效', product.primary_benefit || product.primaryBenefit],
    ['完整成分', product.full_ingredients || product.fullIngredients],
    ['包装需求', product.packaging_requirements || product.packagingRequirements],
    ['包装审核状态', product.package_review_status || '-'],
    ['内容审核状态', product.content_review_status || '-']
  ]

  const packageDesignUrl =
    product.package_design_url ||
    product.packageDesignUrl ||
    product.package_design_image_url ||
    product.package_design_image

  const packageImages = product.package_images || product.packageImages || []

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-blue-600" />
          <h3 className="font-bold text-gray-800">产品上下文信息</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          开发/设计阶段的信息在这里，内容人员不用到处翻。
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="text-sm">
              <div className="text-gray-500">{k}</div>
              <div className="text-gray-800 whitespace-pre-wrap break-words">
                {v && String(v).trim() ? String(v) : '-'}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <ImageIcon size={16} />
            包装设计回传
          </div>

          {packageDesignUrl ? (
            <div className="space-y-2">
              <a
                href={packageDesignUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <Eye size={16} />
                查看包装设计大图
              </a>
              <img
                src={packageDesignUrl}
                alt="package_design"
                className="w-full rounded-xl border object-contain bg-gray-50"
              />
            </div>
          ) : packageImages?.length ? (
            <div className="grid grid-cols-2 gap-2">
              {packageImages.slice(0, 4).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt={`package_${i}`}
                    className="w-full h-28 rounded-lg border object-cover bg-gray-50"
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">暂无包装设计图</div>
          )}
        </div>
      </div>
    </div>
  )
}

// 第一次提交表单（填写内容+上传图片）
function FirstSubmitForm({ product, currentUser, onBack, onSuccess }) {
  const [loading, setLoading] = useState(false)

  // 竞品分析
  const [competitors, setCompetitors] = useState(() => {
    const ca = product.competitor_analysis
    if (ca?.competitors?.length === 3) return ca.competitors
    return [
      { selling_point: '', price: '', rating: '', sales_volume: '' },
      { selling_point: '', price: '', rating: '', sales_volume: '' },
      { selling_point: '', price: '', rating: '', sales_volume: '' }
    ]
  })
  const [differentiation, setDifferentiation] = useState(
    product.competitor_analysis?.differentiation || ''
  )
  const [pricing, setPricing] = useState(product.competitor_analysis?.pricing || '')

  // 产品内容
  const [manualTitle, setManualTitle] = useState(product.manual_title || '')
  const [bulletPoints, setBulletPoints] = useState(() => {
    const bp = product.manual_bullet_points
    if (Array.isArray(bp) && bp.length === 5) return bp
    return ['', '', '', '', '']
  })
  const [manualDescription, setManualDescription] = useState(product.manual_description || '')
  const [manualKeywords, setManualKeywords] = useState(product.manual_keywords || '')

  // 图片上传（3套×9张）
  const [currentSet, setCurrentSet] = useState(1)
  const [imageSets, setImageSets] = useState(() => {
    const existing = product.image_sets_uploaded
    if (existing?.set1 && existing?.set2 && existing?.set3) return existing

    const emptySet = IMAGE_TYPES.map(type => ({ type, url: '' }))
    return {
      set1: [...emptySet],
      set2: [...emptySet],
      set3: [...emptySet]
    }
  })

  // 选图（9张）
  const [selectedImages, setSelectedImages] = useState(() => {
    const existing = product.selected_images_by_content
    if (Array.isArray(existing) && existing.length === 9) return existing
    return []
  })

  // 备注
  const [imageNotes, setImageNotes] = useState(product.image_notes || '')

  async function handleImageUpload(setNum, idx, file) {
    if (!file) return

    try {
      const url = await uploadImage('content-images', file)

      setImageSets(prev => {
        const next = { ...prev }
        const key = `set${setNum}`
        const arr = [...next[key]]
        arr[idx] = { ...arr[idx], url }
        next[key] = arr
        return next
      })
    } catch (error) {
      console.error(error)
      alert('图片上传失败：' + (error?.message || '未知错误'))
    }
  }

  function handleSelectImage(typeIdx, fromSet) {
    const key = `set${fromSet}`
    const img = imageSets[key]?.[typeIdx]
    if (!img?.url) {
      alert(`套${fromSet} 的「${IMAGE_TYPES[typeIdx]}」还没上传`)
      return
    }

    setSelectedImages(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      next[typeIdx] = {
        type: IMAGE_TYPES[typeIdx],
        from_set: fromSet,
        url: img.url,
        order: typeIdx + 1
      }
      // 保证数组长度为9（按类型顺序）
      const filled = IMAGE_TYPES.map((_, i) => next[i]).filter(Boolean)
      // 这里保持“按类型顺序固定”，后续再做拖拽排序
      return filled.length === 9 ? IMAGE_TYPES.map((_, i) => next[i]) : next
    })
  }

  function validate() {
    if (!manualTitle.trim()) return '请填写产品标题'
    if (bulletPoints.some(p => !String(p || '').trim())) return '请填写完整的5点描述'
    if (!manualDescription.trim()) return '请填写产品详情'
    if (!manualKeywords.trim()) return '请填写搜索关键词'

    for (let setNum of [1, 2, 3]) {
      const images = imageSets[`set${setNum}`]
      if (!images || images.length !== 9) return `第${setNum}套图结构异常`
      if (images.some(img => !img.url)) return `第${setNum}套图未完整上传（需要9张）`
    }

    // selectedImages 必须是 9 个且每个有 url
    if (!Array.isArray(selectedImages) || selectedImages.length !== 9)
      return '请从3套图中选出9张（每个类型都要选）'
    if (selectedImages.some(s => !s?.url)) return '选图不完整（有类型未选择）'

    return null
  }

  async function handleSaveDraft() {
    setLoading(true)
    try {
      await updateData('products', product.id, {
        competitor_analysis: {
          competitors,
          differentiation,
          pricing
        },
        manual_title: manualTitle,
        manual_bullet_points: bulletPoints,
        manual_description: manualDescription,
        manual_keywords: manualKeywords,
        image_sets_uploaded: imageSets,
        selected_images_by_content: selectedImages,
        image_notes: imageNotes
      })
      alert('✅ 已保存草稿')
      onSuccess?.()
    } catch (error) {
      console.error(error)
      alert('保存失败：' + (error?.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    const err = validate()
    if (err) {
      alert(err)
      return
    }

    setLoading(true)
    try {
      await updateData('products', product.id, {
        competitor_analysis: {
          competitors,
          differentiation,
          pricing
        },
        manual_title: manualTitle,
        manual_bullet_points: bulletPoints,
        manual_description: manualDescription,
        manual_keywords: manualKeywords,
        image_sets_uploaded: imageSets,
        selected_images_by_content: selectedImages,
        image_notes: imageNotes,
        content_first_submit_time: getCurrentBeijingISO(),
        content_review_status: 'pending',
        stage: 5
      })

      alert('✅ 提交成功！等待管理员审核')
      onSuccess?.()
      onBack?.()
    } catch (error) {
      console.error(error)
      alert('提交失败：' + (error?.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">内容策划 - {product.category}</h2>
            <p className="text-sm text-gray-600 mt-1">
              第一次提交：填写内容 + 上传图片（3套×9张）+ 选9张
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="返回"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* 竞品分析 */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            📊 竞品分析
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="border rounded-xl p-4 bg-gray-50 space-y-3">
                <h4 className="font-semibold text-gray-800">竞品{i + 1}</h4>

                <div className="space-y-2">
                  <input
                    value={competitors[i].selling_point}
                    onChange={e => {
                      const next = [...competitors]
                      next[i] = { ...next[i], selling_point: e.target.value }
                      setCompetitors(next)
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="卖点"
                  />
                  <input
                    value={competitors[i].price}
                    onChange={e => {
                      const next = [...competitors]
                      next[i] = { ...next[i], price: e.target.value }
                      setCompetitors(next)
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="价格"
                  />
                  <input
                    value={competitors[i].rating}
                    onChange={e => {
                      const next = [...competitors]
                      next[i] = { ...next[i], rating: e.target.value }
                      setCompetitors(next)
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="评分"
                  />
                  <input
                    value={competitors[i].sales_volume}
                    onChange={e => {
                      const next = [...competitors]
                      next[i] = { ...next[i], sales_volume: e.target.value }
                      setCompetitors(next)
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="销量"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <textarea
              value={differentiation}
              onChange={e => setDifferentiation(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              rows={3}
              placeholder="差异化策略（我们怎么赢）"
            />
            <textarea
              value={pricing}
              onChange={e => setPricing(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              rows={2}
              placeholder="定价建议"
            />
          </div>
        </section>

        {/* 产品内容 */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            ✍️ 产品内容
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品标题</label>
              <input
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="请输入产品标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">5点描述</label>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <input
                    key={i}
                    value={bulletPoints[i]}
                    onChange={e => {
                      const next = [...bulletPoints]
                      next[i] = e.target.value
                      setBulletPoints(next)
                    }}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder={`第${i + 1}点`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">产品详情</label>
              <textarea
                value={manualDescription}
                onChange={e => setManualDescription(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                rows={6}
                placeholder="请输入产品详情描述"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">搜索关键词</label>
              <input
                value={manualKeywords}
                onChange={e => setManualKeywords(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="关键词用空格/逗号分隔"
              />
            </div>
          </div>
        </section>

        {/* 图片准备 */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            🖼️ 图片准备
          </h3>

          {/* Step1 上传3套 */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Step 1：上传3套竞品图（每套9张）</h4>

            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setCurrentSet(n)}
                  className={`px-4 py-2 rounded-lg border ${
                    currentSet === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'
                  }`}
                  type="button"
                >
                  第{n}套图
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {IMAGE_TYPES.map((type, idx) => {
                const key = `set${currentSet}`
                const url = imageSets[key]?.[idx]?.url
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 border rounded-lg p-3 hover:bg-gray-50"
                  >
                    <div className="w-44 text-sm text-gray-700">
                      {idx + 1}. {type}
                    </div>

                    <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-white">
                      <Upload size={16} />
                      <span className="text-sm">上传</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleImageUpload(currentSet, idx, e.target.files?.[0])}
                      />
                    </label>

                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="ml-auto">
                        <img
                          src={url}
                          alt={type}
                          className="w-20 h-20 object-cover rounded-lg border bg-gray-50"
                        />
                      </a>
                    ) : (
                      <div className="ml-auto text-xs text-gray-400">未上传</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step2 选9张 */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold text-gray-800">
              Step 2：从3套中选出最优的9张（每个类型选1张）
            </h4>

            <div className="space-y-3">
              {IMAGE_TYPES.map((type, idx) => {
                const current = selectedImages?.[idx]
                return (
                  <div key={idx} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-800">
                        {idx + 1}. {type}
                      </div>

                      <div className="flex items-center gap-4">
                        {[1, 2, 3].map(setNum => (
                          <label key={setNum} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`select-${idx}`}
                              checked={current?.from_set === setNum}
                              onChange={() => handleSelectImage(idx, setNum)}
                            />
                            套{setNum}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      {current?.url ? (
                        <>
                          <img
                            src={current.url}
                            alt={type}
                            className="w-20 h-20 object-cover rounded-lg border bg-gray-50"
                          />
                          <a
                            href={current.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            查看大图
                          </a>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">尚未选择</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step3 排序（先固定顺序，后续再做拖拽） */}
          <div className="border-t pt-4 text-sm text-gray-500">
            Step 3：调整顺序（当前版本按默认顺序，后续可加拖拽排序）
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">备注</label>
            <textarea
              value={imageNotes}
              onChange={e => setImageNotes(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
              placeholder="给设计师/审核的备注"
            />
          </div>
        </section>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            取消
          </button>

          <button
            onClick={handleSaveDraft}
            className="px-6 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
            disabled={loading}
          >
            保存草稿
          </button>

          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '提交中...' : '提交审核'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 第二次提交表单：补充翻译
function TranslationForm({ product, onBack, onSuccess }) {
  const selected = Array.isArray(product.selected_images_by_content)
    ? product.selected_images_by_content
    : []

  const [translations, setTranslations] = useState(() => {
    const existing = product.selected_images_with_translation
    if (Array.isArray(existing) && existing.length === 9) return existing

    return selected.map(img => ({
      ...img,
      cn_text: img.cn_text || '',
      id_text: img.id_text || ''
    }))
  })

  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!translations.length || translations.length !== 9) {
      alert('选定的9张图数据异常，请联系开发检查 selected_images_by_content')
      return
    }

    if (translations.some(t => !String(t.cn_text || '').trim() || !String(t.id_text || '').trim())) {
      alert('请为所有图片填写中文和印尼语')
      return
    }

    setLoading(true)
    try {
      await updateData('products', product.id, {
        selected_images_with_translation: translations,
        content_second_submit_time: getCurrentBeijingISO(),
        translation_complete: true,
        stage: 6
      })

      alert('✅ 翻译提交成功！已进入图片优化阶段')
      onSuccess?.()
      onBack?.()
    } catch (error) {
      console.error(error)
      alert('提交失败：' + (error?.message || '未知错误'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">🎉 内容审核已通过！</h2>
            <p className="text-sm text-gray-600 mt-1">请为选定的9张图补充中文和印尼语翻译</p>
          </div>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="返回"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {translations.map((img, idx) => (
          <div key={idx} className="border rounded-xl p-4">
            <h4 className="font-semibold mb-3">
              {idx + 1}. {img.type}
            </h4>

            {img.url ? (
              <a href={img.url} target="_blank" rel="noreferrer">
                <img
                  src={img.url}
                  alt={img.type}
                  className="w-full max-w-2xl h-56 object-cover rounded-lg mb-3 border bg-gray-50"
                />
              </a>
            ) : (
              <div className="text-sm text-gray-500 mb-3">图片URL缺失</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">中文文案</label>
                <input
                  type="text"
                  value={translations[idx].cn_text || ''}
                  onChange={e => {
                    const next = [...translations]
                    next[idx] = { ...next[idx], cn_text: e.target.value }
                    setTranslations(next)
                  }}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="请输入中文文案"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  印尼语翻译
                  <button
                    className="ml-2 text-xs text-blue-600 disabled:text-gray-400"
                    disabled
                    type="button"
                    title="后续接AI翻译"
                  >
                    🤖 AI翻译(开发中)
                  </button>
                </label>
                <input
                  type="text"
                  value={translations[idx].id_text || ''}
                  onChange={e => {
                    const next = [...translations]
                    next[idx] = { ...next[idx], id_text: e.target.value }
                    setTranslations(next)
                  }}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="请输入印尼语翻译"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            取消
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '提交中...' : '提交完成'}
          </button>
        </div>
      </div>
    </div>
  )
}
