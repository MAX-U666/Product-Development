// src/CompetitorAnalysis.jsx
// 竞品分析模块 - 独立页面
// 2026-01-31 - 修复：对接真实API

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Link, Upload, Search, TrendingUp, AlertTriangle, 
  Lightbulb, Target, DollarSign, Star, MessageSquare,
  Package, FileText, Image as ImageIcon, ChevronDown, ChevronUp,
  Check, Clock, RefreshCw, Eye, Save, ArrowRight
} from 'lucide-react';

// ✅ 导入真实 API
import { 
  extractCompetitorInfo,     // 提取竞品数据
  saveCompetitorAnalysis,    // 保存分析报告
} from './api';

// ==================== 常量配置 ====================
const PLATFORMS = [
  { value: 'Shopee', label: 'Shopee', color: '#EE4D2D' },
  { value: 'Lazada', label: 'Lazada', color: '#0F146D' },
  { value: 'Tokopedia', label: 'Tokopedia', color: '#42B549' },
  { value: 'Amazon', label: 'Amazon', color: '#FF9900' },
  { value: 'TikTok', label: 'TikTok Shop', color: '#000000' },
];

const MARKETS = [
  { value: 'Indonesia', label: '🇮🇩 印尼', currency: 'IDR' },
  { value: 'Malaysia', label: '🇲🇾 马来西亚', currency: 'MYR' },
  { value: 'Thailand', label: '🇹🇭 泰国', currency: 'THB' },
  { value: 'Philippines', label: '🇵🇭 菲律宾', currency: 'PHP' },
  { value: 'Vietnam', label: '🇻🇳 越南', currency: 'VND' },
];

const CATEGORIES = [
  { value: 'Shampoo', label: '洗发水 Shampoo' },
  { value: 'Conditioner', label: '护发素 Conditioner' },
  { value: 'BodyWash', label: '沐浴露 Body Wash' },
  { value: 'Toothpaste', label: '牙膏 Toothpaste' },
  { value: 'Skincare', label: '护肤品 Skincare' },
  { value: 'Other', label: '其他 Other' },
];

// ==================== 主组件 ====================
export default function CompetitorAnalysis({ onClose, onSuccess, currentUser }) {
  // ========== 基础信息 ==========
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [category, setCategory] = useState('Shampoo');
  const [market, setMarket] = useState('Indonesia');
  const [platform, setPlatform] = useState('Shopee');

  // ========== AI 配置 ==========
  const [aiConfig, setAiConfig] = useState({
    extract_provider: 'qwen',
    analyze_provider: 'claude'
  });

  // ========== 竞品列表 ==========
  const [competitors, setCompetitors] = useState([
    createEmptyCompetitor(1),
    createEmptyCompetitor(2),
    createEmptyCompetitor(3),
  ]);

  // ========== 分析结果 ==========
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // ========== 状态控制 ==========
  const [activeStep, setActiveStep] = useState(1);
  const [expandedCompetitor, setExpandedCompetitor] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ========== 辅助函数 ==========
  function createEmptyCompetitor(index) {
    return {
      id: `comp_${index}`,
      url: '',
      status: 'pending',
      error: '',
      basicData: null,
      titleAnalysis: null,
      sellingPoints: null,
      ingredients: null,
      visuals: null,
      painPoints: null,
    };
  }

  function updateCompetitor(index, updates) {
    setCompetitors(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  }

  // ========== 提取竞品数据（真实API）==========
  async function handleExtractSingle(index) {
    const comp = competitors[index];
    if (!comp.url.trim()) {
      updateCompetitor(index, { error: '请输入链接' });
      return;
    }

    updateCompetitor(index, { status: 'extracting', error: '' });

    try {
      // ✅ 调用真实 API
      const result = await extractCompetitorInfo(comp.url.trim(), aiConfig);
      
      console.log('📥 竞品提取结果:', result);
      
      // 解析返回数据
      const listing = result?.listing || result?.data || result;
      
      // 构建提取数据
      const extractedData = {
        basicData: {
          name: listing?.title || listing?.name || listing?.product_name || '',
          brand: listing?.brand || listing?.shop_name || '',
          price: listing?.price || listing?.sale_price || '',
          priceOriginal: listing?.original_price || '',
          volume: listing?.volume || listing?.size || '',
          sales: listing?.sales || listing?.sold || '',
          rating: listing?.rating || listing?.score || '',
          reviewCount: listing?.review_count || listing?.reviewCount || ''
        },
        titleAnalysis: {
          full: listing?.title || listing?.full_title || '',
          charCount: (listing?.title || '').length,
          structure: '品牌 + 产品 + 功效 + 规格',
          keywords: listing?.title_keywords || listing?.keywords || []
        },
        sellingPoints: listing?.selling_points || listing?.benefits || listing?.highlights || [],
        ingredients: parseIngredients(listing?.ingredients || listing?.composition || ''),
        visuals: {
          mainImage: listing?.image || listing?.main_image || listing?.imageUrl || null,
          detailImages: listing?.detail_images || []
        }
      };
      
      // 检查是否有有效数据
      const hasValidData = extractedData.basicData.name || extractedData.basicData.price;
      
      if (!hasValidData) {
        updateCompetitor(index, {
          status: 'error',
          error: '未能提取到有效信息'
        });
      } else {
        updateCompetitor(index, {
          status: 'extracted',
          ...extractedData
        });
      }
    } catch (err) {
      console.error('❌ 提取失败:', err);
      updateCompetitor(index, {
        status: 'error',
        error: err.message || '提取失败'
      });
    }
  }

  // 解析成分字符串
  function parseIngredients(ingredientsStr) {
    if (!ingredientsStr) return [];
    if (Array.isArray(ingredientsStr)) {
      return ingredientsStr.map(i => typeof i === 'string' ? { name: i, benefit: '' } : i);
    }
    const items = ingredientsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
    return items.slice(0, 5).map(item => ({ name: item, benefit: '' }));
  }

  // 提取所有竞品
  async function handleExtractAll() {
    setIsExtracting(true);
    
    const validCompetitors = competitors.filter(c => c.url.trim());
    if (validCompetitors.length === 0) {
      alert('请至少输入一个竞品链接');
      setIsExtracting(false);
      return;
    }

    for (let i = 0; i < competitors.length; i++) {
      if (competitors[i].url.trim() && competitors[i].status !== 'extracted') {
        await handleExtractSingle(i);
      }
    }

    setIsExtracting(false);
    setActiveStep(2);
  }

  // ========== 深度分析（模拟，后续可对接 Claude）==========
  async function handleDeepAnalysis() {
    const extractedCompetitors = competitors.filter(c => c.status === 'extracted' || c.status === 'completed');
    if (extractedCompetitors.length === 0) {
      alert('请先提取竞品数据');
      return;
    }

    setIsAnalyzing(true);
    setActiveStep(3);

    try {
      // 对每个竞品生成痛点分析（模拟）
      for (let i = 0; i < competitors.length; i++) {
        if (competitors[i].status === 'extracted') {
          updateCompetitor(i, { status: 'analyzing' });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 生成模拟痛点（后续可对接 Claude API）
          const mockPainPoints = generateMockPainPoints(competitors[i].basicData?.name);
          updateCompetitor(i, {
            status: 'completed',
            painPoints: mockPainPoints
          });
        }
      }

      // 生成综合分析报告
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const analysisData = generateAnalysisFromCompetitors(
        competitors.filter(c => c.status === 'completed')
      );
      setAnalysisResult(analysisData);
      
      setActiveStep(4);
    } catch (err) {
      alert('分析失败: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  // 从竞品数据生成分析报告
  function generateAnalysisFromCompetitors(completedCompetitors) {
    // 提取价格数据
    const prices = completedCompetitors
      .map(c => c.basicData?.price)
      .filter(p => p)
      .map(p => parseFloat(p.replace(/[^0-9.]/g, '')))
      .filter(n => !isNaN(n) && n > 0);
    
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

    // 收集所有痛点
    const allPainPoints = completedCompetitors
      .flatMap(c => c.painPoints || [])
      .reduce((acc, pp) => {
        const existing = acc.find(p => p.category === pp.category);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ ...pp, count: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    return {
      summary: {
        conclusion: `分析了 ${completedCompetitors.length} 个竞品，发现主要痛点集中在${allPainPoints[0]?.category || '产品体验'}方面，建议从差异化定位切入。`
      },
      marketAssessment: {
        volume: '中等',
        competition: '中等',
        margin: '较高',
        recommendation: '推荐进入'
      },
      priceAnalysis: {
        min: minPrice ? `Rp ${minPrice.toLocaleString()}` : '-',
        median: avgPrice ? `Rp ${Math.round(avgPrice).toLocaleString()}` : '-',
        max: maxPrice ? `Rp ${maxPrice.toLocaleString()}` : '-',
        suggestion: avgPrice ? `建议定价 Rp ${Math.round(avgPrice * 0.9).toLocaleString()} - ${Math.round(avgPrice * 1.1).toLocaleString()}` : '待定'
      },
      painPointsSummary: allPainPoints.slice(0, 4),
      opportunities: [
        { dimension: '产品升级', priority: '高', suggestions: ['优化配方', '升级包装', '增加容量'] },
        { dimension: '定价策略', priority: '中', suggestions: ['性价比定位', '套装优惠'] },
        { dimension: '营销差异', priority: '中', suggestions: ['KOC种草', '场景化内容'] },
        { dimension: '服务承诺', priority: '高', suggestions: ['破损包赔', '效果保证'] },
      ],
      recommendations: {
        positioning: '差异化定位，主打品质与性价比',
        pricing: avgPrice ? `Rp ${Math.round(avgPrice * 0.95).toLocaleString()}` : '待定',
        differentiators: ['升级包装', '复合配方', '服务承诺'],
        pitfalls: ['避免过度宣传', '注意包装质量', '控制成本']
      }
    };
  }

  // ========== 保存分析报告（真实API）==========
  async function handleSave() {
    if (!analysisTitle.trim()) {
      alert('请输入报告标题');
      return;
    }

    setIsSaving(true);

    try {
      // 收集完成的竞品数据
      const completedCompetitors = competitors
        .filter(c => c.status === 'completed')
        .map(c => ({
          url: c.url,
          basicData: c.basicData,
          titleAnalysis: c.titleAnalysis,
          sellingPoints: c.sellingPoints,
          ingredients: c.ingredients,
          visuals: c.visuals,
          painPoints: c.painPoints
        }));

      // 构建保存数据
      const reportData = {
        title: analysisTitle.trim(),
        category,
        market,
        platform,
        status: 'completed',
        extract_provider: aiConfig.extract_provider,
        analyze_provider: aiConfig.analyze_provider,
        competitors: completedCompetitors,
        summary: analysisResult?.summary || {},
        pain_points_summary: analysisResult?.painPointsSummary || [],
        opportunities: analysisResult?.opportunities || [],
        recommendations: analysisResult?.recommendations || {},
        created_by: currentUser?.id || null
      };

      console.log('📤 保存竞品分析:', reportData);

      // ✅ 调用真实 API 保存
      await saveCompetitorAnalysis(reportData);
      
      alert('✅ 竞品分析报告保存成功！');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // ========== 统计数据 ==========
  const extractedCount = competitors.filter(c => ['extracted', 'analyzing', 'completed'].includes(c.status)).length;
  const completedCount = competitors.filter(c => c.status === 'completed').length;

  // ==================== 渲染 ====================
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      backgroundColor: '#F5F5F7',
      fontFamily: "'Noto Sans SC', -apple-system, sans-serif",
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid #E5E5EA',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>📊</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1D1D1F' }}>
              竞品分析
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#86868B' }}>
              深度分析竞品，发现差异化机会
            </p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[
            { step: 1, label: '输入链接' },
            { step: 2, label: '数据提取' },
            { step: 3, label: '深度分析' },
            { step: 4, label: '分析报告' },
          ].map((s, i) => (
            <React.Fragment key={s.step}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '20px',
                backgroundColor: activeStep >= s.step ? '#3B82F6' : '#E5E5EA',
                color: activeStep >= s.step ? 'white' : '#86868B',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.3s'
              }}>
                {activeStep > s.step ? <Check size={14} /> : s.step}
                <span>{s.label}</span>
              </div>
              {i < 3 && (
                <div style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: activeStep > s.step ? '#3B82F6' : '#E5E5EA'
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {analysisResult && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isSaving ? '#E5E5EA' : 'linear-gradient(135deg, #10B981, #059669)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              {isSaving ? '保存中...' : '保存报告'}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #E5E5EA',
              backgroundColor: 'white',
              color: '#6E6E73',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <X size={16} />
            关闭
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* 左侧：输入区 */}
        <div style={{
          width: '420px',
          borderRight: '1px solid #E5E5EA',
          backgroundColor: '#FFFFFF',
          overflow: 'auto',
          padding: '20px'
        }}>
          {/* 报告基础信息 */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#F5F5F7',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1D1D1F' }}>
              📝 报告信息
            </h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#86868B', display: 'block', marginBottom: '4px' }}>
                报告标题 <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                value={analysisTitle}
                onChange={(e) => setAnalysisTitle(e.target.value)}
                placeholder="如：印尼洗发水竞品分析-2026.01"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E5EA',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '4px' }}>品类</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E5E5EA',
                    fontSize: '12px'
                  }}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '4px' }}>市场</label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E5E5EA',
                    fontSize: '12px'
                  }}
                >
                  {MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#86868B', display: 'block', marginBottom: '4px' }}>平台</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E5E5EA',
                    fontSize: '12px'
                  }}
                >
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 竞品链接输入 */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            border: '2px solid #3B82F6',
            backgroundColor: '#EFF6FF',
            marginBottom: '16px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1D1D1F' }}>
                🔗 竞品链接
              </h3>
              <span style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: '#3B82F6',
                color: 'white'
              }}>
                已提取 {extractedCount}/3
              </span>
            </div>

            {competitors.map((comp, index) => (
              <CompetitorInput
                key={comp.id}
                index={index}
                competitor={comp}
                onUrlChange={(url) => updateCompetitor(index, { url })}
                onExtract={() => handleExtractSingle(index)}
                platform={platform}
              />
            ))}

            <button
              onClick={handleExtractAll}
              disabled={isExtracting || !competitors.some(c => c.url.trim())}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: isExtracting ? '#E5E5EA' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isExtracting ? 'not-allowed' : 'pointer',
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isExtracting ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  提取中...
                </>
              ) : (
                <>
                  <Search size={16} />
                  一键提取全部
                </>
              )}
            </button>
          </div>

          {/* 开始深度分析按钮 */}
          {extractedCount > 0 && !analysisResult && (
            <button
              onClick={handleDeepAnalysis}
              disabled={isAnalyzing}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: isAnalyzing ? '#E5E5EA' : 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                color: 'white',
                fontSize: '15px',
                fontWeight: '600',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  AI 深度分析中...
                </>
              ) : (
                <>
                  <Lightbulb size={18} />
                  开始深度分析
                </>
              )}
            </button>
          )}
        </div>

        {/* 右侧：结果展示区 */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 28px',
          backgroundColor: '#F5F5F7'
        }}>
          {!extractedCount && !analysisResult ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#86868B'
            }}>
              <div style={{ fontSize: '80px', marginBottom: '20px', opacity: 0.3 }}>📊</div>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#1D1D1F' }}>
                输入竞品链接开始分析
              </p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>
                AI 将提取产品数据、分析差评痛点、发现差异化机会
              </p>
            </div>
          ) : analysisResult ? (
            <AnalysisReport 
              competitors={competitors.filter(c => c.status === 'completed')}
              analysis={analysisResult}
              market={market}
            />
          ) : (
            <ExtractedDataPreview 
              competitors={competitors}
              expandedCompetitor={expandedCompetitor}
              setExpandedCompetitor={setExpandedCompetitor}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ==================== 子组件 ====================

// 竞品输入卡片
function CompetitorInput({ index, competitor, onUrlChange, onExtract, platform }) {
  const statusConfig = {
    pending: { color: '#86868B', bg: '#F5F5F7', label: '待提取' },
    extracting: { color: '#3B82F6', bg: '#EFF6FF', label: '提取中...' },
    extracted: { color: '#10B981', bg: '#ECFDF5', label: '已提取' },
    analyzing: { color: '#8B5CF6', bg: '#F5F3FF', label: '分析中...' },
    completed: { color: '#10B981', bg: '#ECFDF5', label: '已完成' },
    error: { color: '#EF4444', bg: '#FEF2F2', label: '失败' },
  };

  const status = statusConfig[competitor.status] || statusConfig.pending;

  return (
    <div style={{
      padding: '12px',
      borderRadius: '10px',
      backgroundColor: 'white',
      marginBottom: '10px',
      border: `1px solid ${competitor.status === 'completed' ? '#10B981' : '#E5E5EA'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: status.bg,
          color: status.color,
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>{index + 1}</span>
        <span style={{ fontSize: '12px', color: '#6E6E73' }}>竞品 {index + 1}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '10px',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: status.bg,
          color: status.color
        }}>{status.label}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder={`粘贴 ${platform} 商品链接...`}
          value={competitor.url}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={competitor.status === 'extracting' || competitor.status === 'analyzing'}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #E5E5EA',
            fontSize: '12px',
            backgroundColor: competitor.status === 'extracting' ? '#F5F5F7' : 'white'
          }}
        />
        <button
          onClick={onExtract}
          disabled={!competitor.url.trim() || competitor.status === 'extracting'}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: competitor.status === 'extracting' ? '#E5E5EA' : '#3B82F6',
            color: 'white',
            fontSize: '11px',
            cursor: !competitor.url.trim() || competitor.status === 'extracting' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {competitor.status === 'extracting' ? '...' : '提取'}
        </button>
      </div>

      {competitor.error && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          borderRadius: '6px',
          backgroundColor: '#FEF2F2',
          color: '#EF4444',
          fontSize: '11px'
        }}>
          ❌ {competitor.error}
        </div>
      )}

      {competitor.basicData && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          borderRadius: '6px',
          backgroundColor: '#F5F5F7',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
            {competitor.basicData.name || '产品名称'}
          </div>
          <div style={{ display: 'flex', gap: '12px', color: '#6E6E73', flexWrap: 'wrap' }}>
            {competitor.basicData.price && <span>💰 {competitor.basicData.price}</span>}
            {competitor.basicData.volume && <span>📦 {competitor.basicData.volume}</span>}
            {competitor.basicData.rating && <span>⭐ {competitor.basicData.rating}</span>}
            {competitor.basicData.reviewCount && <span>💬 {competitor.basicData.reviewCount} 评论</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// 提取数据预览
function ExtractedDataPreview({ competitors, expandedCompetitor, setExpandedCompetitor }) {
  const extractedList = competitors.filter(c => 
    ['extracted', 'analyzing', 'completed'].includes(c.status)
  );

  if (extractedList.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#86868B' }}>
        <RefreshCw size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
        <p>正在提取竞品数据...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1D1D1F' }}>
        📋 提取结果预览
      </h2>

      {extractedList.map((comp, idx) => (
        <CompetitorCard 
          key={comp.id}
          competitor={comp}
          index={idx}
          isExpanded={expandedCompetitor === comp.id}
          onToggle={() => setExpandedCompetitor(
            expandedCompetitor === comp.id ? null : comp.id
          )}
        />
      ))}
    </div>
  );
}

// 单个竞品卡片
function CompetitorCard({ competitor, index, isExpanded, onToggle }) {
  const { basicData, titleAnalysis, sellingPoints, ingredients, visuals, painPoints } = competitor;

  if (!basicData) return null;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      marginBottom: '16px',
      border: '1px solid #E5E5EA',
      overflow: 'hidden'
    }}>
      <div 
        onClick={onToggle}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isExpanded ? '1px solid #E5E5EA' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {visuals?.mainImage && (
            <img 
              src={visuals.mainImage} 
              alt="" 
              style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '8px', 
                objectFit: 'cover',
                border: '1px solid #E5E5EA'
              }}
            />
          )}
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1D1D1F' }}>
              {basicData.name || '产品名称'}
            </h3>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#6E6E73' }}>
              {basicData.price && <span style={{ fontWeight: '600', color: '#EF4444' }}>{basicData.price}</span>}
              {basicData.volume && <span>📦 {basicData.volume}</span>}
              {basicData.rating && <span>⭐ {basicData.rating}</span>}
              {basicData.reviewCount && <span>💬 {basicData.reviewCount}</span>}
              {basicData.sales && <span>🛒 {basicData.sales}</span>}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {competitor.status === 'completed' && (
            <span style={{
              fontSize: '10px',
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: '#ECFDF5',
              color: '#10B981'
            }}>
              ✓ 分析完成
            </span>
          )}
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            <DetailSection icon="📝" title="标题分析" status={titleAnalysis?.full ? 'done' : 'pending'}>
              {titleAnalysis?.full && (
                <>
                  <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '10px', lineHeight: '1.5' }}>
                    {titleAnalysis.full}
                  </div>
                  <div style={{ fontSize: '11px', color: '#86868B', marginBottom: '8px' }}>
                    字符数: {titleAnalysis.charCount}
                  </div>
                  {titleAnalysis.keywords?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {titleAnalysis.keywords.map((kw, i) => (
                        <span key={i} style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#EFF6FF',
                          color: '#3B82F6',
                          fontSize: '11px'
                        }}>{kw}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </DetailSection>

            <DetailSection icon="⭐" title="核心卖点" status={sellingPoints?.length ? 'done' : 'pending'}>
              {sellingPoints?.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#1D1D1F' }}>
                  {sellingPoints.slice(0, 5).map((sp, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>
                      {typeof sp === 'string' ? sp : sp.text || sp.point || JSON.stringify(sp)}
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>

            <DetailSection icon="🧪" title="主打成分" status={ingredients?.length ? 'done' : 'pending'}>
              {ingredients?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ingredients.map((ing, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F5F5F7',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: '600', color: '#1D1D1F' }}>{ing.name}</div>
                      {ing.benefit && <div style={{ fontSize: '11px', color: '#86868B' }}>{ing.benefit}</div>}
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection icon="😣" title="差评痛点" status={painPoints?.length ? 'done' : 'pending'}>
              {painPoints?.length > 0 && (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {painPoints.slice(0, 3).map((pp, i) => (
                    <div key={i} style={{
                      padding: '10px',
                      borderRadius: '6px',
                      backgroundColor: '#FEF2F2',
                      borderLeft: '3px solid #EF4444'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#EF4444', marginBottom: '4px' }}>
                        {pp.category}
                      </div>
                      <div style={{ fontSize: '12px', color: '#1D1D1F' }}>
                        {pp.description}
                      </div>
                      {pp.opportunity && (
                        <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px' }}>
                          💡 机会: {pp.opportunity}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

          </div>
        </div>
      )}
    </div>
  );
}

// 详情区块
function DetailSection({ icon, title, status, children }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: '#F9FAFB',
      border: '1px solid #E5E5EA'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#1D1D1F' }}>
          {icon} {title}
        </h4>
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          backgroundColor: status === 'done' ? '#ECFDF5' : '#F5F5F7',
          color: status === 'done' ? '#10B981' : '#86868B'
        }}>
          {status === 'done' ? '✓' : '...'}
        </span>
      </div>
      {children || (
        <div style={{ fontSize: '12px', color: '#86868B' }}>等待数据...</div>
      )}
    </div>
  );
}

// 完整分析报告
function AnalysisReport({ competitors, analysis, market }) {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      
      <div style={{
        padding: '24px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
        color: 'white',
        marginBottom: '24px'
      }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '700' }}>
          📊 竞品分析报告
        </h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
          分析了 {competitors.length} 个竞品 · {market} 市场
        </p>
        
        <div style={{
          marginTop: '20px',
          padding: '16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255,255,255,0.15)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>🎯 核心结论</div>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
            {analysis.summary?.conclusion || '分析完成，发现市场存在差异化机会。'}
          </p>
        </div>
      </div>

      <ReportSection icon="💰" title="价格带分析">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#F5F5F7', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '8px' }}>最低价</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#10B981' }}>
              {analysis.priceAnalysis?.min || '-'}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#EFF6FF', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#3B82F6', marginBottom: '8px' }}>平均价格</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>
              {analysis.priceAnalysis?.median || '-'}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#F5F5F7', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '8px' }}>最高价</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#EF4444' }}>
              {analysis.priceAnalysis?.max || '-'}
            </div>
          </div>
        </div>
        {analysis.priceAnalysis?.suggestion && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            borderRadius: '8px', 
            backgroundColor: '#FEF3C7',
            fontSize: '13px',
            color: '#92400E'
          }}>
            💡 <strong>定价建议：</strong>{analysis.priceAnalysis.suggestion}
          </div>
        )}
      </ReportSection>

      {analysis.painPointsSummary?.length > 0 && (
        <ReportSection icon="😣" title="差评痛点汇总">
          <div style={{ display: 'grid', gap: '12px' }}>
            {analysis.painPointsSummary.map((pp, i) => (
              <div key={i} style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#FEF2F2',
                borderLeft: '4px solid #EF4444'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#EF4444' }}>{pp.category}</span>
                  {pp.count && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#FCA5A5',
                      color: 'white'
                    }}>出现 {pp.count} 次</span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '8px' }}>{pp.description}</div>
                {pp.opportunity && (
                  <div style={{ fontSize: '12px', color: '#10B981' }}>
                    💡 <strong>机会：</strong>{pp.opportunity}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {analysis.opportunities?.length > 0 && (
        <ReportSection icon="🚀" title="差异化机会">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {analysis.opportunities.map((opp, i) => (
              <div key={i} style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                borderLeft: `4px solid ${opp.priority === '高' ? '#10B981' : '#3B82F6'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1D1D1F' }}>{opp.dimension}</span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: opp.priority === '高' ? '#10B981' : '#3B82F6',
                    color: 'white'
                  }}>优先级: {opp.priority}</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#1D1D1F' }}>
                  {opp.suggestions?.map((s, j) => (
                    <li key={j} style={{ marginBottom: '4px' }}>{s}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      <ReportSection icon="🎯" title="产品开发建议">
        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
          border: '1px solid #C4B5FD'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#7C3AED' }}>📍 建议定位</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#1D1D1F', lineHeight: '1.6' }}>
                {analysis.recommendations?.positioning || '差异化定位'}
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#7C3AED' }}>💰 建议定价</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#1D1D1F', lineHeight: '1.6' }}>
                {analysis.recommendations?.pricing || '待定'}
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#7C3AED' }}>⭐ 核心差异点</h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#1D1D1F' }}>
                {(analysis.recommendations?.differentiators || []).map((d, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#EF4444' }}>⚠️ 规避的坑</h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#1D1D1F' }}>
                {(analysis.recommendations?.pitfalls || []).map((p, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ReportSection>

    </div>
  );
}

// 报告区块
function ReportSection({ icon, title, children }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      border: '1px solid #E5E5EA'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '16px', 
        fontWeight: '600', 
        color: '#1D1D1F',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

// ==================== 辅助函数：生成模拟痛点 ====================
function generateMockPainPoints(productName) {
  return [
    {
      category: '效果预期',
      description: '实际效果与宣传不符，用户期望过高',
      opportunity: '设置合理预期，提供真实效果展示'
    },
    {
      category: '性价比',
      description: '价格偏高或容量偏小',
      opportunity: '加大容量或提供套装优惠'
    },
    {
      category: '使用体验',
      description: '使用感受不佳（泡沫、气味、质地等）',
      opportunity: '优化配方改善使用体验'
    }
  ];
}
