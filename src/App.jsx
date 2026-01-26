// File: src/App.jsx
// ✅ 主应用入口 - 2026-01-26 修复版

import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  LayoutDashboard,
  Plus,
  Users,
  Settings,
  LogOut,
  Palette,
  FileText,
  Bot,
  Eye,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

// 组件导入
import Login from "./Login";
import Dashboard from "./Dashboard";
import ProductForm from "./ProductForm";
import ProductFormAI from "./ProductFormAI";
import ProductDetail from "./ProductDetail";
import ProductDevEdit from "./ProductDevEdit";
import AIDraftDashboard from "./AIDraftDashboard";
import DraftReviewModal from "./DraftReviewModal";
import DesignerDashboard from "./DesignerDashboard";
import ContentDashboard from "./ContentDashboard";
import UserManagement from "./UserManagement";

// API
import { fetchData, fetchAIDraftById } from "./api";

// ==================== 主应用组件 ====================
export default function App() {
  // 用户状态
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 数据状态
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // UI 状态
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showProductFormAI, setShowProductFormAI] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // AI 草稿预览
  const [draftPreviewProduct, setDraftPreviewProduct] = useState(null);
  const [draftPreviewData, setDraftPreviewData] = useState(null);
  const [draftPreviewLoading, setDraftPreviewLoading] = useState(false);

  // 检查登录状态
  useEffect(() => {
    const saved = localStorage.getItem("currentUser");
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem("currentUser");
      }
    }
    setCheckingAuth(false);
  }, []);

  // 加载产品数据
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await fetchData("products", { orderBy: "created_at.desc" });
      setProducts(data || []);
    } catch (e) {
      console.error("加载产品失败:", e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadProducts();
    }
  }, [currentUser]);

  // 登录处理
  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem("currentUser", JSON.stringify(user));
  };

  // 登出处理
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    setActiveTab("dashboard");
  };

  // 打开 AI 草稿预览
  const openDraftPreview = async (product) => {
    if (!product?.created_from_draft_id) {
      alert("该产品未关联 AI 草稿");
      return;
    }

    setDraftPreviewLoading(true);
    setDraftPreviewProduct(product);

    try {
      const draft = await fetchAIDraftById(product.created_from_draft_id);
      if (draft) {
        setDraftPreviewData(draft);
      } else {
        alert("未找到关联的 AI 草稿");
        setDraftPreviewProduct(null);
      }
    } catch (e) {
      alert("加载草稿失败: " + (e?.message || "未知错误"));
      setDraftPreviewProduct(null);
    } finally {
      setDraftPreviewLoading(false);
    }
  };

  // 关闭草稿预览
  const closeDraftPreview = () => {
    setDraftPreviewProduct(null);
    setDraftPreviewData(null);
  };

  // 根据角色过滤菜单
  const menuItems = useMemo(() => {
    const role = currentUser?.role || "";
    const items = [
      { id: "dashboard", label: "数据总览", icon: LayoutDashboard, roles: ["管理员", "开发人员", "设计师", "内容人员", "业务人员"] },
      { id: "products", label: "全部产品", icon: Package, roles: ["管理员", "开发人员", "业务人员"] },
      { id: "ai-drafts", label: "AI 草稿", icon: Bot, roles: ["管理员", "开发人员"] },
      { id: "design", label: "设计任务", icon: Palette, roles: ["管理员", "设计师"] },
      { id: "content", label: "内容策划", icon: FileText, roles: ["管理员", "内容人员"] },
      { id: "users", label: "用户管理", icon: Users, roles: ["管理员"] },
    ];

    return items.filter((item) => item.roles.includes(role));
  }, [currentUser?.role]);

  // 如果正在检查登录状态
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 如果未登录
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 侧边栏 */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-gray-900 to-gray-800 
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-auto
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-white font-bold">产品开发系统</h1>
                <p className="text-gray-400 text-xs">Product Dev System</p>
              </div>
            </div>
          </div>

          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {(currentUser?.name || "U")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {currentUser?.name || currentUser?.username}
                </div>
                <div className="text-gray-400 text-xs">{currentUser?.role}</div>
              </div>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                    ${isActive
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }
                  `}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* 底部操作 */}
          <div className="p-4 border-t border-gray-700 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all"
            >
              <LogOut size={20} />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 移动端遮罩 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* 页面标题 */}
            <h2 className="text-lg font-bold text-gray-800 hidden sm:block">
              {menuItems.find((m) => m.id === activeTab)?.label || ""}
            </h2>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 ml-auto">
              {(activeTab === "products" || activeTab === "dashboard") && (
                <>
                  <button
                    onClick={() => setShowProductFormAI(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all text-sm font-semibold"
                  >
                    <Bot size={18} />
                    <span className="hidden sm:inline">AI 创建</span>
                  </button>
                  <button
                    onClick={() => setShowProductForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-all text-sm font-semibold"
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">新建产品</span>
                  </button>
                </>
              )}

              <button
                onClick={loadProducts}
                disabled={loadingProducts}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                title="刷新数据"
              >
                <svg
                  className={`w-5 h-5 text-gray-600 ${loadingProducts ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {activeTab === "dashboard" && (
            <Dashboard
              products={products}
              currentUser={currentUser}
              onRefresh={loadProducts}
            />
          )}

          {activeTab === "products" && (
            <ProductList
              products={products}
              currentUser={currentUser}
              onRefresh={loadProducts}
              onViewProduct={setSelectedProduct}
              onEditProduct={setEditingProduct}
              onOpenDraftPreview={openDraftPreview}
            />
          )}

          {activeTab === "ai-drafts" && (
            <AIDraftDashboard
              currentUser={currentUser}
              onRefresh={loadProducts}
            />
          )}

          {activeTab === "design" && (
            <DesignerDashboard
              products={products}
              currentUser={currentUser}
              onRefresh={loadProducts}
            />
          )}

          {activeTab === "content" && (
            <ContentDashboard
              products={products}
              currentUser={currentUser}
              onRefresh={loadProducts}
            />
          )}

          {activeTab === "users" && (
            <UserManagement currentUser={currentUser} />
          )}
        </div>
      </main>

      {/* 弹窗：新建产品 */}
      {showProductForm && (
        <ProductForm
          currentUser={currentUser}
          onClose={() => setShowProductForm(false)}
          onSuccess={() => {
            setShowProductForm(false);
            loadProducts();
          }}
        />
      )}

      {/* 弹窗：AI 创建产品 */}
      {showProductFormAI && (
        <ProductFormAI
          currentUser={currentUser}
          onClose={() => setShowProductFormAI(false)}
          onSuccess={() => {
            setShowProductFormAI(false);
            loadProducts();
          }}
        />
      )}

      {/* 弹窗：产品详情 */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          currentUser={currentUser}
          onClose={() => setSelectedProduct(null)}
          onRefresh={loadProducts}
          onOpenDraftPreview={openDraftPreview}
        />
      )}

      {/* 弹窗：产品开发编辑 */}
      {editingProduct && (
        <ProductDevEdit
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            loadProducts();
          }}
        />
      )}

      {/* 弹窗：AI 草稿预览 */}
      {draftPreviewProduct && draftPreviewData && (
        <DraftReviewModal
          draft={draftPreviewData}
          product={draftPreviewProduct}
          mode="view"
          currentUser={currentUser}
          onClose={closeDraftPreview}
          onSuccess={() => {
            closeDraftPreview();
            loadProducts();
          }}
        />
      )}
    </div>
  );
}

// ==================== 产品列表组件 ====================
function ProductList({
  products,
  currentUser,
  onRefresh,
  onViewProduct,
  onEditProduct,
  onOpenDraftPreview,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // 过滤产品
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 搜索过滤
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchFields = [
          p.category,
          p.product_title,
          p.selling_point,
          p.develop_month,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchFields.includes(q)) return false;
      }

      // 阶段过滤
      if (filterStage !== "all" && String(p.stage) !== filterStage) {
        return false;
      }

      // 状态过滤
      if (filterStatus !== "all" && p.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [products, searchQuery, filterStage, filterStatus]);

  // 获取唯一状态列表
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(products.map((p) => p.status).filter(Boolean));
    return Array.from(statuses);
  }, [products]);

  return (
    <div className="space-y-4">
      {/* 过滤栏 */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="搜索产品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">全部阶段</option>
            <option value="1">阶段 1 - 开发</option>
            <option value="2">阶段 2 - 设计</option>
            <option value="3">阶段 3 - 设计审核</option>
            <option value="4">阶段 4 - 内容</option>
            <option value="5">阶段 5 - 内容审核</option>
            <option value="6">阶段 6 - 完成</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">全部状态</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="text-sm text-gray-500">
            共 {filteredProducts.length} 个产品
          </div>
        </div>
      </div>

      {/* 产品列表 */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">暂无产品数据</p>
            <p className="text-sm text-gray-400">
              点击顶部按钮创建第一个产品
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">产品</th>
                  <th className="px-6 py-3 text-left">开发月份</th>
                  <th className="px-6 py-3 text-left">阶段</th>
                  <th className="px-6 py-3 text-left">状态</th>
                  <th className="px-6 py-3 text-left">来源</th>
                  <th className="px-6 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {product.category || product.product_title || "未命名"}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {product.selling_point?.slice(0, 50) || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.develop_month || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        阶段 {product.stage || 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.status === "可做货"
                            ? "bg-green-100 text-green-700"
                            : product.status === "待审核" || product.status === "待管理员复审"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {product.status || "进行中"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {product.is_ai_generated ? (
                        <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                          🤖 AI
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">手动</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewProduct(product)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                          title="查看详情"
                        >
                          <Eye size={18} />
                        </button>

                        {/* 开发阶段可编辑 */}
                        {product.stage === 1 &&
                          currentUser?.role === "开发人员" && (
                            <button
                              onClick={() => onEditProduct(product)}
                              className="px-3 py-1 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                            >
                              编辑
                            </button>
                          )}

                        {/* AI 产品可查看草稿 */}
                        {product.is_ai_generated &&
                          product.created_from_draft_id && (
                            <button
                              onClick={() => onOpenDraftPreview(product)}
                              className="px-3 py-1 rounded-lg border border-purple-200 text-purple-600 text-sm hover:bg-purple-50"
                            >
                              AI草稿
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
