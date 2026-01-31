// src/CompetitorAnalysisList.jsx1
// 竞品分析库 - 列表页面（使用真实API）
import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Trash2, ArrowRight, Filter } from 'lucide-react';
import { fetchCompetitorAnalyses, deleteCompetitorAnalysis } from './api';

// 品类选项
const CATEGORIES = [
  { value: 'all', label: '全部品类' },
  { value: 'Shampoo', label: '洗发水' },
  { value: 'Conditioner', label: '护发素' },
  { value: 'BodyWash', label: '沐浴露' },
  { value: 'BodyLotion', label: '身体乳' },
  { value: 'Toothpaste', label: '牙膏' },
  { value: 'HairMask', label: '发膜' },
];

// 市场选项
const MARKETS = [
  { value: 'all', label: '全部市场' },
  { value: 'Indonesia', label: '🇮🇩 印尼' },
  { value: 'Malaysia', label: '🇲🇾 马来西亚' },
  { value: 'Thailand', label: '🇹🇭 泰国' },
  { value: 'Philippines', label: '🇵🇭 菲律宾' },
  { value: 'Vietnam', label: '🇻🇳 越南' },
];

export default function CompetitorAnalysisList({ 
  currentUser, 
  onCreateNew, 
  onViewDetail,
  onUseForProduct 
}) {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMarket, setSelectedMarket] = useState('all');

  // 加载数据
  useEffect(() => {
    loadAnalyses();
  }, [selectedCategory, selectedMarket]);

  const loadAnalyses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCompetitorAnalyses({
        category: selectedCategory,
        market: selectedMarket
      });
      setAnalyses(data);
    } catch (err) {
      console.error('加载竞品分析失败:', err);
      setError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 搜索过滤
  const filteredAnalyses = analyses.filter(item => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      item.title?.toLowerCase().includes(search) ||
      item.category?.toLowerCase().includes(search) ||
      item.summary?.conclusion?.toLowerCase().includes(search)
    );
  });

  // 删除分析
  const handleDelete = async (analysis) => {
    const ok = window.confirm(`确定删除「${analysis.title}」吗？\n\n⚠️ 删除后不可恢复。`);
    if (!ok) return;

    try {
      await deleteCompetitorAnalysis(analysis.id);
      setAnalyses(prev => prev.filter(a => a.id !== analysis.id));
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败：' + err.message);
    }
  };

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 获取品类标签颜色
  const getCategoryColor = (category) => {
    const colors = {
      'Shampoo': { bg: '#dbeafe', text: '#1d4ed8' },
      'Conditioner': { bg: '#fce7f3', text: '#be185d' },
      'BodyWash': { bg: '#d1fae5', text: '#047857' },
      'BodyLotion': { bg: '#fef3c7', text: '#b45309' },
      'Toothpaste': { bg: '#e0e7ff', text: '#4338ca' },
      'HairMask': { bg: '#f3e8ff', text: '#7c3aed' },
    };
    return colors[category] || { bg: '#f3f4f6', text: '#374151' };
  };

  return (
    <div style={{ padding: '0' }}>
      {/* 头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#1e293b',
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            📊 竞品分析库
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            保存的竞品分析报告，可用于 AI 创建产品
          </p>
        </div>
        
        <button
          onClick={onCreateNew}
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          <Plus size={18} />
          新建分析
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        {/* 搜索框 */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: '#94a3b8'
          }} />
          <input
            type="text"
            placeholder="搜索报告标题、品类..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              color: '#1e293b',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* 品类筛选 */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '14px',
            color: '#1e293b',
            backgroundColor: 'white',
            cursor: 'pointer',
            minWidth: '140px'
          }}
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* 市场筛选 */}
        <select
          value={selectedMarket}
          onChange={(e) => setSelectedMarket(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '14px',
            color: '#1e293b',
            backgroundColor: 'white',
            cursor: 'pointer',
            minWidth: '140px'
          }}
        >
          {MARKETS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <p>加载中...</p>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          borderRadius: '12px',
          color: '#dc2626'
        }}>
          <p>{error}</p>
          <button
            onClick={loadAnalyses}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #dc2626',
              backgroundColor: 'white',
              color: '#dc2626',
              cursor: 'pointer'
            }}
          >
            重试
          </button>
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && filteredAnalyses.length === 0 && (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
          <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '20px' }}>
            {searchText ? '没有找到匹配的分析报告' : '还没有竞品分析报告'}
          </p>
          <button
            onClick={onCreateNew}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            创建第一个分析
          </button>
        </div>
      )}

      {/* 分析列表 */}
      {!loading && !error && filteredAnalyses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredAnalyses.map(analysis => {
            const categoryColor = getCategoryColor(analysis.category);
            const competitorCount = analysis.competitors?.length || 0;
            
            // 从 summary 或 opportunities 中提取关键信息
            const keyFindings = [];
            if (analysis.pain_points_summary?.[0]) {
              keyFindings.push(`🔴 ${analysis.pain_points_summary[0].category || analysis.pain_points_summary[0]}`);
            }
            if (analysis.summary?.priceRange) {
              keyFindings.push(`💰 价格带 ${analysis.summary.priceRange}`);
            }
            if (analysis.opportunities?.[0]) {
              keyFindings.push(`💡 ${analysis.opportunities[0].suggestion || analysis.opportunities[0]}`);
            }

            return (
              <div
                key={analysis.id}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '20px'
                }}
              >
                {/* 左侧：内容 */}
                <div style={{ flex: 1 }}>
                  {/* 标题行 */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: '#1e293b'
                    }}>
                      {analysis.title}
                    </h3>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: categoryColor.bg,
                      color: categoryColor.text
                    }}>
                      {analysis.category}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569'
                    }}>
                      {analysis.market}
                    </span>
                  </div>

                  {/* 结论摘要 */}
                  <p style={{ 
                    margin: '0 0 12px 0', 
                    fontSize: '14px', 
                    color: '#64748b',
                    lineHeight: '1.5'
                  }}>
                    {analysis.summary?.conclusion || '暂无分析结论'}
                  </p>

                  {/* 元数据 */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    fontSize: '12px', 
                    color: '#94a3b8',
                    marginBottom: '10px'
                  }}>
                    <span>📅 {formatDate(analysis.created_at)}</span>
                    <span>🔗 {competitorCount} 个竞品</span>
                    <span>↗️ 已使用 {analysis.used_count || 0} 次</span>
                  </div>

                  {/* 关键发现标签 */}
                  {keyFindings.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {keyFindings.map((finding, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            backgroundColor: '#fef3c7',
                            color: '#b45309'
                          }}
                        >
                          {finding}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 右侧：操作按钮 */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  minWidth: '120px'
                }}>
                  <button
                    onClick={() => onViewDetail?.(analysis)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Eye size={14} />
                    查看
                  </button>
                  
                  <button
                    onClick={() => onUseForProduct?.(analysis)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ArrowRight size={14} />
                    用于创建产品
                  </button>
                  
                  <button
                    onClick={() => handleDelete(analysis)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: 'white',
                      color: '#64748b',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 统计信息 */}
      {!loading && filteredAnalyses.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          共 {filteredAnalyses.length} 个分析报告
          {(selectedCategory !== 'all' || selectedMarket !== 'all' || searchText) && (
            <span>（已筛选）</span>
          )}
        </div>
      )}
    </div>
  );
}
