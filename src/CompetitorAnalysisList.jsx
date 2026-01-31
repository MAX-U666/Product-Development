// src/CompetitorAnalysisList.jsx
// 竞品分析报告列表页面
// 2026-01-31

import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Eye, Trash2, Calendar, Tag, 
  TrendingUp, FileText, ArrowRight, Filter
} from 'lucide-react';

// ==================== 主组件 ====================
export default function CompetitorAnalysisList({ 
  onCreateNew, 
  onViewDetail, 
  onUseForProduct,
  currentUser 
}) {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMarket, setFilterMarket] = useState('all');

  // 加载数据
  useEffect(() => {
    loadAnalyses();
  }, []);

  async function loadAnalyses() {
    setLoading(true);
    try {
      // const data = await fetchCompetitorAnalyses();
      // setAnalyses(data || []);
      
      // Mock 数据
      setAnalyses(mockAnalyses);
    } catch (err) {
      console.error('加载失败:', err);
    } finally {
      setLoading(false);
    }
  }

  // 过滤
  const filteredAnalyses = analyses.filter(a => {
    const matchSearch = !searchTerm || 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchMarket = filterMarket === 'all' || a.market === filterMarket;
    return matchSearch && matchCategory && matchMarket;
  });

  // 删除
  async function handleDelete(id) {
    if (!confirm('确定删除这个竞品分析报告吗？')) return;
    
    try {
      // await deleteCompetitorAnalysis(id);
      setAnalyses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert('删除失败: ' + err.message);
    }
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📊 竞品分析库
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            保存的竞品分析报告，可用于 AI 创建产品
          </p>
        </div>
        
        <button
          onClick={onCreateNew}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 font-semibold"
        >
          <Plus size={18} />
          新建分析
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索报告标题、品类..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
          >
            <option value="all">全部品类</option>
            <option value="Shampoo">洗发水</option>
            <option value="Toothpaste">牙膏</option>
            <option value="BodyWash">沐浴露</option>
            <option value="Skincare">护肤品</option>
          </select>

          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm"
          >
            <option value="all">全部市场</option>
            <option value="Indonesia">印尼</option>
            <option value="Malaysia">马来西亚</option>
            <option value="Thailand">泰国</option>
          </select>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          加载中...
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-2">暂无竞品分析报告</p>
          <p className="text-sm text-gray-400 mb-4">
            创建竞品分析，为 AI 产品开发提供数据支撑
          </p>
          <button
            onClick={onCreateNew}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus size={16} />
            新建分析
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAnalyses.map(analysis => (
            <AnalysisCard
              key={analysis.id}
              analysis={analysis}
              onView={() => onViewDetail?.(analysis)}
              onDelete={() => handleDelete(analysis.id)}
              onUseForProduct={() => onUseForProduct?.(analysis)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 分析卡片
function AnalysisCard({ analysis, onView, onDelete, onUseForProduct }) {
  const categoryColors = {
    Shampoo: { bg: 'bg-blue-100', text: 'text-blue-700' },
    Toothpaste: { bg: 'bg-green-100', text: 'text-green-700' },
    BodyWash: { bg: 'bg-purple-100', text: 'text-purple-700' },
    Skincare: { bg: 'bg-pink-100', text: 'text-pink-700' },
  };

  const colors = categoryColors[analysis.category] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 标题和标签 */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {analysis.title}
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
              {analysis.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {analysis.market}
            </span>
          </div>

          {/* 核心结论 */}
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {analysis.summary?.conclusion || '暂无结论'}
          </p>

          {/* 元信息 */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(analysis.created_at).toLocaleDateString('zh-CN')}
            </span>
            <span className="flex items-center gap-1">
              <Tag size={12} />
              {analysis.competitors_count || 0} 个竞品
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp size={12} />
              已使用 {analysis.used_count || 0} 次
            </span>
          </div>

          {/* 关键发现 */}
          {analysis.key_findings && (
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.key_findings.slice(0, 3).map((finding, i) => (
                <span 
                  key={i}
                  className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs"
                >
                  💡 {finding}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={onView}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <Eye size={14} />
            查看
          </button>
          
          <button
            onClick={onUseForProduct}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow text-sm font-medium flex items-center gap-2"
          >
            <ArrowRight size={14} />
            用于创建产品
          </button>

          <button
            onClick={onDelete}
            className="px-4 py-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
          >
            <Trash2 size={14} />
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// Mock 数据
const mockAnalyses = [
  {
    id: 'ca_001',
    title: '印尼竹炭牙膏竞品分析 - 2026.01',
    category: 'Toothpaste',
    market: 'Indonesia',
    platform: 'Shopee',
    created_at: '2026-01-30T10:00:00Z',
    competitors_count: 3,
    used_count: 2,
    summary: {
      conclusion: '印尼竹炭牙膏市场处于快速增长期，头部产品存在明显的效果预期管理和性价比痛点，建议通过包装升级+复合配方+合理定价切入市场。'
    },
    key_findings: ['效果预期是最大痛点', '价格带 28K-80K', '泵头包装是差异化机会']
  },
  {
    id: 'ca_002',
    title: '马来西亚防脱洗发水竞品分析',
    category: 'Shampoo',
    market: 'Malaysia',
    platform: 'Shopee',
    created_at: '2026-01-25T14:30:00Z',
    competitors_count: 4,
    used_count: 1,
    summary: {
      conclusion: '马来西亚防脱洗发水市场竞争激烈，本土品牌和国际品牌并存，生姜和咖啡因是主流成分，建议从迷迭香+益生菌组合切入。'
    },
    key_findings: ['生姜成分最热门', '价格敏感度高', '清真认证是加分项']
  },
  {
    id: 'ca_003',
    title: '印尼身体乳竞品分析',
    category: 'BodyWash',
    market: 'Indonesia',
    platform: 'Tokopedia',
    created_at: '2026-01-20T09:15:00Z',
    competitors_count: 3,
    used_count: 0,
    summary: {
      conclusion: '身体乳市场以补水保湿为主，美白和香味是差异化方向。'
    },
    key_findings: ['补水是基础需求', '香味持久度是卖点', '大容量更受欢迎']
  }
];
