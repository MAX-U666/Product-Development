import React, { useState, useMemo } from 'react'
import { Package, Upload, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { updateData, uploadImage } from './api'
import { formatTime, getCurrentBeijingISO } from './timeConfig'

// ✅ 状态机常量（推荐）
const REVIEW_STATUS = {
  NONE: null,              // 未开始
  DESIGNING: 'designing',  // 设计中（已接单）
  PENDING: 'pending',      // 待审核（已提交）
  APPROVED: 'approved',    // 已通过
  REJECTED: 'rejected'     // 需修改
}

export default function DesignerDashboard({ products = [], currentUser, onRefresh }) {
  const [uploading, setUploading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [designFile, setDesignFile] = useState(null)

  // 待接单：阶段1 且 没有设计师
  const pendingProducts = useMemo(() => {
    return products.filter((p) => p.stage === 1 && !p.package_designer_id)
  }, [products])

  // 我的任务：我接单的，阶段<=3 都显示
  const myTasks = useMemo(() => {
    return products.filter(
      (p) => p.package_designer_id === currentUser.id && p.stage <= 3
    )
  }, [products, currentUser.id])

  // 已完成：通过审核（你也可以加上 stage >= 4 更严格）
  const completedTasks = useMemo(() => {
    return products.filter(
      (p) =>
        p.package_designer_id === currentUser.id &&
        p.package_review_status === REVIEW_STATUS.APPROVED
    )
  }, [products, currentUser.id])

  // 接单
  async function handleAcceptTask(product) {
    if (!confirm(`确定接单：${product.category || '未命名'}？`)) return

    try {
      await updateData('products', product.id, {
        package_designer_id: currentUser.id,
        stage: 2,
        status: '包装设计中',
        design_start_time: getCurrentBeijingISO(),

        // ✅ 修复6：接单即进入 designing
        package_review_status: REVIEW_STATUS.DESIGNING
      })

      alert('✅ 接单成功！')
      onRefresh?.()
    } catch (error) {
      alert('接单失败：' + (error?.message || '未知错误'))
    }
  }

  // 上传设计稿
  async function handleUploadDesign(product) {
    if (!designFile) {
      alert('请先选择设计稿文件')
      return
    }

    setUploading(true)
    try {
      const designUrl = await uploadImage('package-designs', designFile)

      // 上传只更新文件与时间，不强制改 stage / pending
      await updateData('products', product.id, {
        package_design_url: designUrl,
        package_design_time: getCurrentBeijingISO()
      })

      alert('✅ 设计稿上传成功！')
      setDesignFile(null)
      setSelectedProduct(null)
      onRefresh?.()
    } catch (error) {
      alert('上传失败：' + (error?.message || '未知错误'))
    } finally {
      setUploading(false)
    }
  }

  // ✅ 修复5：提交审核时才进入 stage=3 且 pending
  async function handleSubmitReview(product) {
    if (!product.package_design_url) {
      alert('请先上传设计稿')
      return
    }
    if (!confirm('确定提交审核吗？提交后将通知管理员审核。')) return

    try {
      await updateData('products', product.id, {
        stage: 3,
        status: '待审核',

        // ✅ 这时候才改成 pending
        package_review_status: REVIEW_STATUS.PENDING
      })

      alert('✅ 已提交审核，请等待管理员审核！')
      onRefresh?.()
    } catch (error) {
      alert('提交失败：' + (error?.message || '未知错误'))
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">🎨 我的设计任务</h2>

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
              <p className="text-3xl font-bold mt-1">{completedTasks.length}</p>
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
            {pendingProducts.map((product) => (
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
                      <p>🎯 目标市场：{product.target_market || '-'}</p>
                      <p>⏰ 创建时间：{formatTime(product.created_at)}</p>
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
            {myTasks.map((product) => {
              const status = product.package_review_status ?? REVIEW_STATUS.NONE
              const hasDesign = !!product.package_design_url

              // ✅ 核心：审核中必须 stage===3 且 pending
              const isPending =
                product.stage === 3 && status === REVIEW_STATUS.PENDING

              const isRejected = status === REVIEW_STATUS.REJECTED
              const isDesigning = status === REVIEW_STATUS.DESIGNING || product.stage === 2
              const isApproved = status === REVIEW_STATUS.APPROVED

              return (
                <div
                  key={product.id}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    isRejected
                      ? 'border-red-300 bg-red-50'
                      : isPending
                      ? 'border-yellow-300 bg-yellow-50'
                      : isApproved
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* 产品信息 */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">
                        {product.category || '未命名产品'}
                      </h4>
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <p>📅 开发月份：{product.develop_month}</p>
                        <p>⏰ 接单时间：{formatTime(product.design_start_time)}</p>
                        {product.package_design_time && (
                          <p>📤 上传时间：{formatTime(product.package_design_time)}</p>
                        )}
                      </div>
                    </div>

                    {/* 状态标签 */}
                    <div className="flex flex-col gap-2 items-end">
                      {isPending && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          审核中
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          需修改
                        </span>
                      )}
                      {!isPending && !isRejected && hasDesign && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          已上传
                        </span>
                      )}
                      {!hasDesign && isDesigning && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          设计中
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 退回意见 */}
                  {isRejected && product.package_review_note && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800 mb-1">管理员审核意见：</p>
                          <p className="text-sm text-red-700 whitespace-pre-wrap">
                            {product.package_review_note}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 历史退回记录 */}
                  {product.review_history && Array.isArray(product.review_history) && product.review_history.length > 0 && (
                    <details className="mb-4">
                      <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                        📜 查看历史退回记录 ({product.review_history.length}次)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {product.review_history.map((record, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                            <p className="text-gray-500 mb-1">
                              第{idx + 1}次退回 · {formatTime(record.time)}
                            </p>
                            <p className="text-gray-700">{record.note}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* 当前设计稿预览 */}
                  {hasDesign && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">当前设计稿：</p>
                      <img
                        src={product.package_design_url}
                        alt="包装设计稿"
                        className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}

                  {/* 操作区：审核中禁止操作 */}
                  {!isPending && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-end gap-3">
                        {/* 文件选择 */}
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {hasDesign ? '重新上传设计稿：' : '上传设计稿：'}
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              setDesignFile(e.target.files?.[0] || null)
                              setSelectedProduct(product)
                            }}
                            className="block w-full text-sm text-gray-600
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-medium
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100 cursor-pointer"
                          />
                        </div>

                        {/* 上传按钮 */}
                        {selectedProduct?.id === product.id && designFile && (
                          <button
                            onClick={() => handleUploadDesign(product)}
                            disabled={uploading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                          >
                            <Upload size={18} />
                            {uploading ? '上传中...' : '确认上传'}
                          </button>
                        )}

                        {/* 提交审核：有设计稿才允许（不管是否 rejected，都允许重新提交） */}
                        {hasDesign && (
                          <button
                            onClick={() => handleSubmitReview(product)}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap flex items-center gap-2"
                          >
                            <CheckCircle size={18} />
                            提交审核
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 审核中提示 */}
                  {isPending && (
                    <div className="border-t border-yellow-200 pt-4">
                      <p className="text-sm text-yellow-700 flex items-center gap-2">
                        <Clock size={16} />
                        设计稿已提交，正在等待管理员审核...
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
