import React, { useEffect, useMemo, useState } from 'react'
import { X, ExternalLink, Image as ImageIcon, Link as LinkIcon, Package, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react'
import { fetchData, deleteProduct, updateData, fetchAIDraftById } from './api'
import { formatTime, getCurrentBeijingISO } from './timeConfig'

import DraftReviewModal from './DraftReviewModal'

function safeOpen(url) {
  if (!url) return
  const u = url.trim()
  if (!/^https?:\/\//i.test(u)) {
    window.open('https://' + u, '_blank', 'noopener,noreferrer')
    return
  }
  window.open(u, '_blank', 'noopener,noreferrer')
}

function InfoRow({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 border-b border-gray-100">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  )
}

function ImgCard({ title, src, onClick }) {
  if (!src) {
    return (
      <div className="border border-dashed rounded-xl p-4 text-sm text-gray-400 flex items-center justify-center h-[150px]">
        暂无图片
      </div>
    )
  }
  return (
    <div className="border rounded-xl overflow-hidden hover:shadow-sm transition">
      <div className="px-3 py-2 text-sm font-medium text-gray-800 bg-gray-50">{title}</div>
      <button type="button" onClick={onClick} className="w-full">
        <img src={src} alt={title} className="w-full h-[180px] object-cover" />
      </button>
    </div>
  )
}

export default function ProductDetail({ product, bottle: bottleProp, users = [], currentUser, onClose, onUpdate }) {
  const [bottle, setBottle] = useState(bottleProp || null)
  const [imgPreview, setImgPreview] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ✅ 新增：审核相关状态
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewNote, setReviewNote] = useState('')

  useEffect(() => {
    setBottle(bottleProp || null)
  }, [bottleProp])

  // 如果没传 bottle，则用 bottle_id 自己去查
  useEffect(() => {
    ;(async () => {
      if (bottleProp) return
      const id = product?.bottle_id
      if (!id) return
      try {
        const list = await fetchData('bottles')
        const found = Array.isArray(list) ? list.find((x) => String(x.id) === String(id)) : null
        if (found) setBottle(found)
      } catch (e) {
        console.error('❌ 获取瓶型失败:', e)
      }
    })()
  }, [product?.bottle_id, bottleProp])

  const competitorLinks = useMemo(() => {
    return [
      { idx: 1, url: product?.competitor_1_url, img: product?.competitor_1_img },
      { idx: 2, url: product?.competitor_2_url, img: product?.competitor_2_img },
      { idx: 3, url: product?.competitor_3_url, img: product?.competitor_3_img }
    ]
  }, [product])

  // 删除产品
  const handleDelete = async () => {
    const productName = product.product_name || product.category || '未命名产品'

    if (
      !confirm(
        `⚠️ 确定要删除产品"${productName}"吗？\n\n此操作将同时删除：\n• 数据库记录\n• 所有相关图片\n\n此操作不可恢复！`
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteProduct(product.id)
      alert('✅ 删除成功')
      onClose(true)
    } catch (error) {
      console.error('删除失败:', error)
      alert('❌ 删除失败: ' + (error.message || '未知错误'))
    } finally {
      setIsDeleting(false)
    }
  }

  // =========================
  // ✅ 新增：查看 AI 草稿（全量）
  // =========================
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [activeDraft, setActiveDraft] = useState(null)
  const [draftLoading, setDraftLoading] = useState(false)

  const handleViewAIDraft = async () => {
    const draftId = product?.created_from_draft_id
    if (!draftId) {
      alert('该任务未关联 AI 草稿（created_from_draft_id 为空）')
      return
    }
    setDraftLoading(true)
    try {
      const d = await fetchAIDraftById(draftId)
      if (!d) {
        alert('未找到 AI 草稿（可能已删除或权限问题）')
        return
      }
      setActiveDraft(d)
      setDraftModalOpen(true)
    } catch (e) {
      alert(`读取 AI 草稿失败：${e.message || e}`)
    } finally {
      setDraftLoading(false)
    }
  }

  // ✅ 新增：审核通过
  const handleApprove = async () => {
    if (!confirm('确定通过审核吗？通过后将自动进入下一阶段。')) return

    setIsReviewing(true)
    try {
      await updateData('products', product.id, {
        package_review_status: 'approved',
        package_review_note: reviewNote || '审核通过',
        stage: 4,
        status: '待内容策划'
      })

      alert('✅ 审核通过！产品已进入内容策划阶段')
      setReviewNote('')
      onUpdate?.()
      onClose(false)
    } catch (error) {
      alert('审核失败：' + (error?.message || '未知错误'))
    } finally {
      setIsReviewing(false)
    }
  }

  // ✅ 新增：审核退回
  const handleReject = async () => {
    if (!reviewNote.trim()) {
      alert('请填写退回原因')
      return
    }

    if (!confirm('确定退回修改吗？设计师将收到您的修改意见。')) return

    setIsReviewing(true)
    try {
      // 获取当前的历史记录
      const currentHistory = Array.isArray(product.review_history) ? product.review_history : []

      // 添加新的退回记录
      const newHistory = [
        ...currentHistory,
        {
          time: getCurrentBeijingISO(),
          note: reviewNote,
          reviewer: currentUser?.name || '管理员'
        }
      ]

      await updateData('products', product.id, {
        package_review_status: 'rejected',
        package_review_note: reviewNote,
        review_history: newHistory,
        stage: 2,
        status: '包装设计中'
      })

      alert('✅ 已退回修改！设计师将收到您的意见')
      setReviewNote('')
      onUpdate?.()
      onClose(false)
    } catch (error) {
      alert('退回失败：' + (error?.message || '未知错误'))
    } finally {
      setIsReviewing(false)
    }
  }

  if (!product) return null

  // ✅ 判断是否显示审核区域
  const showReviewSection =
    currentUser?.role === '管理员' && product.stage === 3 && product.package_review_status === 'pending'

  // 找到设计师信息
  const designer = users.find((u) => u.id === product.package_designer_id)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div>
            <div className="text-xs text-gray-500">
              开发月份：{product.develop_month || '-'}　|　阶段：{product.stage ?? '-'}　|　状态：{product.status || '-'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">
              {product.product_name || product.category || '产品详情'}
            </h2>
            <div className="text-sm text-gray-500 mt-1">
              {product.track ? `赛道：${product.track}` : null}
              {product.target_market ? `　|　市场：${product.target_market}` : null}
              {product.target_platform ? `　|　平台：${product.target_platform}` : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ 新增：查看 AI 草稿按钮（放在任务详情头部右侧） */}
            <button
              onClick={handleViewAIDraft}
              disabled={draftLoading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              title="查看该产品关联的 AI 草稿"
            >
              <Eye size={16} />
              {draftLoading ? '加载中...' : '查看AI草稿'}
            </button>

            {/* 删除按钮（仅管理员和开发人员） */}
            {(currentUser?.role === '管理员' || currentUser?.role === '开发人员') && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                title="删除产品"
              >
                <Trash2 size={16} />
                {isDeleting ? '删除中...' : '删除'}
              </button>
            )}

            {/* 关闭按钮 */}
            <button onClick={() => onClose(false)} className="text-gray-500 hover:text-gray-800">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* ✅ 新增：审核区域（仅管理员且产品在待审核状态） */}
          {showReviewSection && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-4 flex items-center gap-2">⚠️ 待审核 - 包装设计稿</h3>

              {designer && (
                <div className="mb-4 text-sm text-gray-700">
                  <p>👤 设计师：{designer.name}</p>
                  <p>📤 提交时间：{formatTime(product.package_design_time)}</p>
                </div>
              )}

              {/* 设计稿预览 */}
              {product.package_design_url && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">包装设计稿：</p>
                  <img
                    src={product.package_design_url}
                    alt="包装设计稿"
                    className="w-full max-w-2xl h-96 object-contain rounded-lg border-2 border-yellow-300 cursor-pointer"
                    onClick={() => setImgPreview(product.package_design_url)}
                  />
                </div>
              )}

              {/* 审核意见 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">审核意见（退回时必填）：</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="请填写审核意见或修改建议..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  rows="4"
                />
              </div>

              {/* 审核按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isReviewing}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <CheckCircle size={20} />
                  {isReviewing ? '处理中...' : '通过审核'}
                </button>

                <button
                  onClick={handleReject}
                  disabled={isReviewing || !reviewNote.trim()}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <XCircle size={20} />
                  {isReviewing ? '处理中...' : '退回修改'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
            {/* Left: 文档信息 */}
            <div className="bg-white border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package size={18} className="text-gray-700" />
                <div className="font-semibold text-gray-900">开发资料</div>
              </div>

              <InfoRow label="卖点">
                <div className="whitespace-pre-wrap">{product.selling_point || '-'}</div>
              </InfoRow>

              <InfoRow label="主概念">{product.main_concept || '-'}</InfoRow>
              <InfoRow label="主要成分">{product.ingredient || '-'}</InfoRow>

              <InfoRow label="主打功效">
                <div className="whitespace-pre-wrap">{product.primary_benefit || '-'}</div>
              </InfoRow>

              <InfoRow label="完整成分">
                <div className="whitespace-pre-wrap">{product.ingredients || '-'}</div>
              </InfoRow>

              <InfoRow label="开发时间">{product.develop_time || '-'}</InfoRow>
              <InfoRow label="创建时间">{formatTime(product.created_at)}</InfoRow>

              {/* ✅ 新增：包装设计信息 */}
              {product.package_designer_id && (
                <>
                  <InfoRow label="设计师">{designer?.name || `用户 #${product.package_designer_id}`}</InfoRow>
                  {product.package_design_time && (
                    <InfoRow label="设计提交时间">{formatTime(product.package_design_time)}</InfoRow>
                  )}
                  <InfoRow label="审核状态">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        product.package_review_status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : product.package_review_status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {product.package_review_status === 'approved'
                        ? '已通过'
                        : product.package_review_status === 'rejected'
                        ? '需修改'
                        : '待审核'}
                    </span>
                  </InfoRow>
                </>
              )}
            </div>

            {/* Right: 设计视角资源 */}
            <div className="space-y-6">
              {/* ✅ 包装设计稿（优先显示） */}
              {product.package_design_url && (
                <div className="bg-white border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon size={18} className="text-gray-700" />
                    <div className="font-semibold text-gray-900">包装设计稿</div>
                  </div>

                  <ImgCard
                    title="当前设计稿"
                    src={product.package_design_url}
                    onClick={() => setImgPreview(product.package_design_url)}
                  />

                  {/* 审核意见显示 */}
                  {product.package_review_note && (
                    <div
                      className={`mt-3 p-3 rounded-lg border ${
                        product.package_review_status === 'rejected'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-green-50 border-green-200'
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-700 mb-1">审核意见：</p>
                      <p className="text-sm text-gray-800">{product.package_review_note}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 参考包装 */}
              <div className="bg-white border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon size={18} className="text-gray-700" />
                  <div className="font-semibold text-gray-900">参考包装</div>
                </div>

                <ImgCard title="参考设计图片" src={product.ref_design_img} onClick={() => setImgPreview(product.ref_design_img)} />
              </div>

              {/* 瓶型 */}
              <div className="bg-white border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon size={18} className="text-gray-700" />
                  <div className="font-semibold text-gray-900">瓶型</div>
                </div>

                <ImgCard
                  title={bottle?.name || (product.bottle_id ? `瓶型 #${product.bottle_id}` : '未选择瓶型')}
                  src={bottle?.img_url || bottle?.image_url || bottle?.url}
                  onClick={() => setImgPreview(bottle?.img_url || bottle?.image_url || bottle?.url)}
                />
              </div>
            </div>
          </div>

          {/* 竞品区 */}
          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon size={18} className="text-gray-700" />
              <div className="font-semibold text-gray-900">竞品（链接 + 图片）</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {competitorLinks.map((c) => (
                <div key={c.idx} className="border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900">竞品 {c.idx}</div>
                    {c.url ? (
                      <button
                        type="button"
                        onClick={() => safeOpen(c.url)}
                        className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1"
                      >
                        打开 <ExternalLink size={14} />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">无链接</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 break-all mb-3">{c.url || '-'}</div>

                  <ImgCard title={`竞品图 ${c.idx}`} src={c.img} onClick={() => setImgPreview(c.img)} />
                </div>
              ))}
            </div>
          </div>

          {/* ✅ 退回历史记录 */}
          {product.review_history && Array.isArray(product.review_history) && product.review_history.length > 0 && (
            <div className="bg-white border rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">📜 退回历史记录</h3>
              <div className="space-y-3">
                {product.review_history.map((record, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-700">第 {idx + 1} 次退回</span>
                      <span className="text-xs text-gray-500">{formatTime(record.time)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">审核人：{record.reviewer || '管理员'}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{record.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 图片预览 */}
        {imgPreview ? (
          <div
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6"
            onClick={() => setImgPreview(null)}
          >
            <div className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end mb-2">
                <button className="text-white/80 hover:text-white" onClick={() => setImgPreview(null)}>
                  <X size={26} />
                </button>
              </div>
              <img src={imgPreview} alt="preview" className="w-full max-h-[80vh] object-contain rounded-xl" />
            </div>
          </div>
        ) : null}

        {/* ✅ 渲染 AI 草稿弹窗（放在 return 最后，最稳） */}
        {draftModalOpen && activeDraft && (
          <DraftReviewModal
            draft={activeDraft}
            mode="view"
            onClose={() => setDraftModalOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
