// File: src/App.jsx
// ✅ 2026-01-31 更新：添加竞品分析模块
// - 新增 CompetitorAnalysis 竞品分析创建页面
// - 新增 CompetitorAnalysisList 竞品分析列表页面
// - 新增 CompetitorAnalysisDetail 竞品分析详情弹窗
// - 新增 📊 竞品分析 Tab
// - 支持从竞品分析跳转到 AI 创建产品

import React, { useState, useEffect, useRef } from 'react'
import { Package, LogOut, Plus, Eye, Trash2, Sparkles, ChevronDown } from 'lucide-react'
import { fetchData, deleteData, fetchAIDrafts, fetchAIDraftById } from './api'
import Login from './Login'
import Dashboard from './Dashboard'
import ProductForm from './ProductForm'
import ProductFormAI from './ProductFormAI'
import ProductDetail from './ProductDetail'
import DesignerDashboard from './DesignerDashboard'
import ContentDashboard from './ContentDashboard'
import AIDraftDashboard from './AIDraftDashboard'
import ProductDevEdit from './ProductDevEdit'
import DraftReviewModal from './DraftReviewModal'
import UserManagement from './UserManagement'

// ✅ 新增：竞品分析模块
import CompetitorAnalysis from './CompetitorAnalysis'
import CompetitorAnalysisList from './CompetitorAnalysisList'
import CompetitorAnalysisDetail from './CompetitorAnalysisDetail'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showProductFormAI, setShowProductFormAI] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedDevProduct, setSelectedDevProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  const [pendingDraftsCount, setPendingDraftsCount] = useState(0)

  // 快速预览（AI草稿 + 开发素材）
  const [quickPreviewOpen, setQuickPreviewOpen] = useState(false)
  const [quickPreviewDraft, setQuickPreviewDraft] = useState(null)
  const [quickPreviewProduct, setQuickPreviewProduct] = useState(null)

  // 管理员下拉菜单
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const adminMenuRef = useRef(null)

  // ✅ 新增：竞品分析相关状态
  const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState(false)
  const [selectedAnalysisForProduct, setSelectedAnalysisForProduct] = useState(null)
  const [viewingAnalysis, setViewingAnalysis] = useState(null) // ✅ 查看详情的分析报告

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)

        if (user.role === '设计师') {
          setActiveTab('designer')
        } else if (user.role === '内容人员') {
          setActiveTab('content')
        } else {
          setActiveTab('dashboard')
        }
      } catch (e) {
        console.error('恢复用户状态失败:', e)
        localStorage.removeItem('currentUser')
      }
    }

    loadData()
  }, [])

  // 点击空白关闭管理员菜单
  useEffect(() => {
    function onDocClick(e) {
      if (!showAdminMenu) return
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setShowAdminMenu(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [showAdminMenu])

  async function loadData() {
    setLoading(true)
    try {
      const [usersData, productsData] = await Promise.all([
        fetchData('users'),
        fetchData('products'),
      ])
      setUsers(usersData || [])
      setProducts(productsData || [])

      await loadPendingDraftsCount()
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadPendingDraftsCount() {
    try {
      const drafts = await fetchAIDrafts({ status: '待审核' })
      setPendingDraftsCount(drafts?.length || 0)
    } catch (error) {
      console.error('加载草稿数量失败:', error)
      setPendingDraftsCount(0)
    }
  }

  function handleLogin(user) {
    setCurrentUser(user)
    if (user.role === '设计师') {
      setActiveTab('designer')
    } else if (user.role === '内容人员') {
      setActiveTab('content')
    } else {
      setActiveTab('dashboard')
    }
  }

  function handleLogout() {
    setCurrentUser(null)
    setActiveTab('dashboard')
    localStorage.removeItem('currentUser')
  }

  async function handleDeleteProduct(product) {
    if (!(currentUser?.role === '管理员' || currentUser?.role === '开发人员')) return

    const name = product.category || product.product_name || '未命名'
    const ok = window.confirm(`确定删除这个产品吗？\n\n${name}\n\n⚠️ 删除后不可恢复。`)
    if (!ok) return

    try {
      const success = await deleteData('products', product.id)
      if (!success) {
        alert('删除失败：接口返回非 OK')
        return
      }
      setProducts(prev => prev.filter(p => p.id !== product.id))
      if (selectedProduct?.id === product.id) {
        setSelectedProduct(null)
      }
    } catch (e) {
      console.error(e)
      alert('删除失败：请查看控制台错误')
    }
  }

  async function handleAICreateSuccess() {
    await loadData()
    await loadPendingDraftsCount()
  }

  // 点👁 快速预览（优先弹 AI 草稿 + 开发素材）
  async function openQuickPreview(product) {
    // 二次审核（开发素材复审）时：直接打开【产品详情】让管理员点"通过/驳回"
    if (
      product?.stage === 1 &&
      (product?.dev_assets_status === "待复审" || product?.status === "待管理员复审")
    ) {
      setSelectedProduct(product)
      return
    }

    const draftId = product?.created_from_draft_id
    if (!draftId) {
      setSelectedProduct(product)
      return
    }

    try {
      const d = await fetchAIDraftById(draftId)
      if (!d) {
        alert('未找到 AI 草稿，将打开产品详情')
        setSelectedProduct(product)
        return
      }
      setQuickPreviewProduct(product)
      setQuickPreviewDraft(d)
      setQuickPreviewOpen(true)
    } catch (e) {
      console.error(e)
      alert('读取 AI 草稿失败：' + (e?.message || e))
      setSelectedProduct(product)
    }
  }

  // ✅ 新增：从竞品分析跳转到 AI 创建产品
  function handleUseAnalysisForProduct(analysis) {
    setViewingAnalysis(null) // 关闭详情弹窗
    setSelectedAnalysisForProduct(analysis)
    setShowProductFormAI(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto text-blue-600 animate-pulse mb-4" size={48} />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Login users={users} onLogin={handleLogin} />
  }

  const isAdmin = currentUser.role === '管理员'
  const canDev = currentUser.role === '管理员' || currentUser.role === '开发人员'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            {/* 左：Logo + 标题 */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">产品开发管理系统</h1>
                <p className="text-xs text-gray-500">
                  {currentUser.role} - {currentUser.name}
                </p>
              </div>
            </div>

            {/* 右：动作按钮 */}
            <div className="flex items-center gap-3">
              {canDev && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:shadow transition-all flex items-center gap-2"
                  >
                    <Plus size={18} />
                    传统创建
                  </button>

                  <button
                    onClick={() => setShowProductFormAI(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Sparkles size={18} />
                    🤖 AI 创建
                  </button>
                </div>
              )}

              {/* 管理员下拉入口（只管理员看得到） */}
              {isAdmin && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    onClick={() => setShowAdminMenu(v => !v)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2"
                    title="系统管理"
                  >
                    👤 管理员
                    <ChevronDown size={16} className={`${showAdminMenu ? 'rotate-180' : ''} transition-transform`} />
                  </button>

                  {showAdminMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                      <button
                        onClick={() => {
                          setActiveTab('users')
                          setShowAdminMenu(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-700"
                      >
                        👥 用户管理
                      </button>

                      <div className="h-px bg-gray-100" />

                      <button
                        onClick={() => setShowAdminMenu(false)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 text-gray-500"
                      >
                        关闭
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2"
              >
                <LogOut size={18} />
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 标签导航（业务区，不放用户管理） */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 数据总览
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            📦 全部产品
          </button>

          {(currentUser.role === '设计师' || isAdmin) && (
            <button
              onClick={() => setActiveTab('designer')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'designer'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              🎨 设计任务
            </button>
          )}

          {(currentUser.role === '内容人员' || isAdmin) && (
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'content'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              ✍️ 内容策划
            </button>
          )}

          {/* ✅ 新增：竞品分析 Tab */}
          {canDev && (
            <button
              onClick={() => setActiveTab('competitor_analysis')}
              className={`px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'competitor_analysis'
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              📊 竞品分析
            </button>
          )}

          {canDev && (
            <button
              onClick={() => setActiveTab('ai_drafts')}
              className={`px-4 py-3 border-b-2 transition-colors relative ${
                activeTab === 'ai_drafts'
                  ? 'border-purple-600 text-purple-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              🤖 AI 草稿
              {pendingDraftsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingDraftsCount > 99 ? '99+' : pendingDraftsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'dashboard' && (
          <Dashboard products={products} currentUser={currentUser} onRefresh={loadData} />
        )}

        {activeTab === 'products' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">全部产品</h2>

            {products.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-12 text-center">
                <Package className="mx-auto text-gray-300 mb-4" size={64} />
                <p className="text-gray-500 mb-4">暂无产品数据</p>

                {canDev && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowProductForm(true)}
                      className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <Plus size={18} />
                      传统创建
                    </button>

                    <button
                      onClick={() => setShowProductFormAI(true)}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow transition-all flex items-center gap-2"
                    >
                      <Sparkles size={18} />
                      🤖 AI 创建
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">产品名称</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">月份</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">阶段</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">状态</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">负责人</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">出单</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">操作</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {products.map(product => {
                      let currentOwner = '-'
                      if (product.stage === 1) {
                        const dev = users.find(u => u.id === product.developer_id)
                        currentOwner = dev ? dev.name : '-'
                      } else if (product.stage === 2 || product.stage === 3) {
                        const designer = users.find(u => u.id === product.package_designer_id)
                        currentOwner = designer ? designer.name : '待分配(设计)'
                      } else if (product.stage === 4 || product.stage === 5) {
                        const contentUser = users.find(u => u.id === product.content_user_id)
                        currentOwner = contentUser ? contentUser.name : '待接单(内容)'
                      } else if (product.stage >= 6) {
                        currentOwner = '业务/视觉部'
                      }

                      return (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            {product.sku ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200">
                                📦 {product.sku}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-medium text-gray-800">
                            <div className="flex items-center gap-2">
                              {product.category || '未命名'}
                              {product.is_ai_generated && (
                                <span className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2 py-0.5 text-xs font-bold text-white">
                                  🤖 AI
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">{product.develop_month}</td>

                          <td className="px-4 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                              阶段{product.stage}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs ${
                                product.status === '可做货'
                                  ? 'bg-green-100 text-green-700'
                                  : product.status === '测试成功'
                                  ? 'bg-blue-100 text-blue-700'
                                  : product.status === '测试失败'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {product.status}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">{currentOwner}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{product.order_count || 0}单</td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openQuickPreview(product)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="查看详情/预览草稿"
                              >
                                <Eye size={18} />
                              </button>

                              {product.is_ai_generated && product.stage === 1 && (
                                <button
                                  onClick={() => setSelectedDevProduct(product)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold"
                                  title="继续编辑"
                                >
                                  📝 继续编辑
                                </button>
                              )}

                              {canDev && (
                                <button
                                  onClick={() => handleDeleteProduct(product)}
                                  className="text-red-600 hover:text-red-800 transition-colors"
                                  title="删除产品"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'designer' && (currentUser.role === '设计师' || isAdmin) && (
          <DesignerDashboard products={products} currentUser={currentUser} onRefresh={loadData} />
        )}

        {activeTab === 'content' && (currentUser.role === '内容人员' || isAdmin) && (
          <ContentDashboard products={products} currentUser={currentUser} onRefresh={loadData} />
        )}

        {/* ✅ 新增：竞品分析列表页 */}
        {activeTab === 'competitor_analysis' && canDev && (
          <CompetitorAnalysisList
            currentUser={currentUser}
            onCreateNew={() => setShowCompetitorAnalysis(true)}
            onViewDetail={(analysis) => {
              // ✅ 打开详情弹窗
              setViewingAnalysis(analysis)
            }}
            onUseForProduct={(analysis) => {
              // 选中分析报告后，跳转到 AI 创建产品
              handleUseAnalysisForProduct(analysis)
            }}
          />
        )}

        {activeTab === 'ai_drafts' && canDev && (
          <AIDraftDashboard
            currentUser={currentUser}
            onCreateProduct={() => setShowProductFormAI(true)}
            onRefresh={loadPendingDraftsCount}
          />
        )}

        {/* 用户管理：不出现在业务 Tab，只从右上角管理员菜单进入 */}
        {activeTab === 'users' && isAdmin && (
          <UserManagement currentUser={currentUser} />
        )}
      </div>

      {showProductForm && (
        <ProductForm
          currentUser={currentUser}
          onClose={() => setShowProductForm(false)}
          onSuccess={loadData}
        />
      )}

      {showProductFormAI && (
        <ProductFormAI
          currentUser={currentUser}
          onClose={() => {
            setShowProductFormAI(false)
            setSelectedAnalysisForProduct(null) // ✅ 关闭时清空选中的分析
          }}
          onSuccess={handleAICreateSuccess}
          preSelectedAnalysis={selectedAnalysisForProduct} // ✅ 传入预选的竞品分析
        />
      )}

      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedProduct(null)}
          onUpdate={loadData}
        />
      )}

      {selectedDevProduct && (
        <ProductDevEdit
          product={selectedDevProduct}
          onClose={() => setSelectedDevProduct(null)}
          onSuccess={() => {
            setSelectedDevProduct(null)
            loadData()
          }}
        />
      )}

      {/* 快速预览弹窗（不会影响原审核/接单功能） */}
      {quickPreviewOpen && quickPreviewDraft && (
        <DraftReviewModal
          draft={quickPreviewDraft}
          product={quickPreviewProduct}
          mode="view"
          onClose={() => {
            setQuickPreviewOpen(false)
            setQuickPreviewDraft(null)
            setQuickPreviewProduct(null)
          }}
        />
      )}

      {/* ✅ 新增：竞品分析创建弹窗 */}
      {showCompetitorAnalysis && (
        <CompetitorAnalysis
          currentUser={currentUser}
          onClose={() => setShowCompetitorAnalysis(false)}
          onSuccess={() => {
            setShowCompetitorAnalysis(false)
            // 如果当前在竞品分析页，会自动刷新（因为 CompetitorAnalysisList 内部有 useEffect）
          }}
        />
      )}

      {/* ✅ 新增：竞品分析详情弹窗 */}
      {viewingAnalysis && (
        <CompetitorAnalysisDetail
          analysis={viewingAnalysis}
          onClose={() => setViewingAnalysis(null)}
          onUseForProduct={handleUseAnalysisForProduct}
        />
      )}
    </div>
  )
}
