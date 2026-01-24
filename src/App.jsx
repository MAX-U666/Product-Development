// File: src/App.jsx
import React, { useState, useEffect } from 'react'
import { Package, LogOut, Plus, Eye, Trash2, Sparkles } from 'lucide-react'
import { fetchData, deleteData, fetchAIDrafts } from './api'
import Login from './Login'
import Dashboard from './Dashboard'
import ProductForm from './ProductForm'
import ProductFormAI from './ProductFormAI'
import ProductDetail from './ProductDetail'
import DesignerDashboard from './DesignerDashboard'
import ContentDashboard from './ContentDashboard'
import AIDraftDashboard from './AIDraftDashboard'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showProductForm, setShowProductForm] = useState(false)
  const [showProductFormAI, setShowProductFormAI] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // ✅ 新增：待审核草稿数量
  const [pendingDraftsCount, setPendingDraftsCount] = useState(0)

  useEffect(() => {
    // 从 localStorage 恢复用户登录状态
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)

        // 根据角色自动跳转初始 Tab
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

  async function loadData() {
    setLoading(true)
    try {
      const [usersData, productsData] = await Promise.all([
        fetchData('users'), 
        fetchData('products')
      ])
      setUsers(usersData || [])
      setProducts(productsData || [])
      
      // ✅ 新增：加载待审核草稿数量
      await loadPendingDraftsCount()
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ 新增：加载待审核草稿数量
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

  // ✅ 新增：AI 创建成功后刷新草稿数量
  async function handleAICreateSuccess() {
    await loadData()
    await loadPendingDraftsCount()
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
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

            <div className="flex items-center gap-3">
              {(currentUser.role === '管理员' || currentUser.role === '开发人员') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:shadow transition-all flex items-center gap-2"
                  >
                    <Plus size={20} />
                    传统创建
                  </button>

                  <button
                    onClick={() => setShowProductFormAI(true)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <Sparkles size={20} />
                    🤖 AI 创建
                  </button>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2"
              >
                <LogOut size={20} />
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 标签导航 */}
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

          {(currentUser.role === '设计师' || currentUser.role === '管理员') && (
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

          {(currentUser.role === '内容人员' || currentUser.role === '管理员') && (
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

          {/* ✅ 修改：AI 草稿 Tab - 带待审核数量角标 */}
          {(currentUser.role === '管理员' || currentUser.role === '开发人员') && (
            <button
              onClick={() => setActiveTab('ai_drafts')}
              className={`px-4 py-3 border-b-2 transition-colors relative ${
                activeTab === 'ai_drafts'
                  ? 'border-purple-600 text-purple-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              🤖 AI 草稿
              {/* ✅ 待审核数量角标 */}
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

                {(currentUser.role === '管理员' || currentUser.role === '开发人员') && (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowProductForm(true)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
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
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">产品名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">月份</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">阶段</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">负责人</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">出单</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase">操作</th>
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
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">
                            {product.category || '未命名'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{product.develop_month}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                              阶段{product.stage}
                            </span>
                          </td>
                          <td className="px-6 py-4">
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
                          <td className="px-6 py-4 text-sm text-gray-600">{currentOwner}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{product.order_count || 0}单</td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setSelectedProduct(product)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="查看详情"
                              >
                                <Eye size={18} />
                              </button>

                              {(currentUser.role === '管理员' || currentUser.role === '开发人员') && (
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

        {activeTab === 'designer' && (currentUser.role === '设计师' || currentUser.role === '管理员') && (
          <DesignerDashboard products={products} currentUser={currentUser} onRefresh={loadData} />
        )}

        {activeTab === 'content' && (currentUser.role === '内容人员' || currentUser.role === '管理员') && (
          <ContentDashboard products={products} currentUser={currentUser} onRefresh={loadData} />
        )}

        {/* ✅ 修改：传递 onRefresh 回调 */}
        {activeTab === 'ai_drafts' && (currentUser.role === '管理员' || currentUser.role === '开发人员') && (
          <AIDraftDashboard
            currentUser={currentUser}
            onCreateProduct={() => setShowProductFormAI(true)}
            onRefresh={loadPendingDraftsCount}
          />
        )}
      </div>

      {showProductForm && (
        <ProductForm currentUser={currentUser} onClose={() => setShowProductForm(false)} onSuccess={loadData} />
      )}

      {/* ✅ 修改：传递 handleAICreateSuccess 回调 */}
      {showProductFormAI && (
        <ProductFormAI 
          currentUser={currentUser} 
          onClose={() => setShowProductFormAI(false)} 
          onSuccess={handleAICreateSuccess}
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
    </div>
  )
}
