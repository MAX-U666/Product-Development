// src/CompetitorAnalysis.jsx
// 竞品分析模块 - 独立页面
// 2026-01-31

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Link, Upload, Search, TrendingUp, AlertTriangle, 
  Lightbulb, Target, DollarSign, Star, MessageSquare,
  Package, FileText, Image as ImageIcon, ChevronDown, ChevronUp,
  Check, Clock, RefreshCw, Eye, Save, ArrowRight
} from 'lucide-react';

// ==================== API 函数（需要在 api.js 中实现）====================
// import { 
//   extractCompetitorData,      // Gemini: 提取基础数据
//   analyzeCompetitorPainPoints, // Claude: 分析差评痛点
//   generateAnalysisSummary,     // Claude: 生成总结和建议
//   saveCompetitorAnalysis,      // 保存分析报告
//   fetchCompetitorAnalyses,     // 获取分析列表
// } from './api';

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

const PAIN_POINT_CATEGORIES = [
  { key: 'effectiveness', label: '效果问题', icon: '💊', color: '#EF4444' },
  { key: 'quality', label: '质量问题', icon: '🔧', color: '#F59E0B' },
  { key: 'experience', label: '体验问题', icon: '😣', color: '#8B5CF6' },
  { key: 'packaging', label: '包装物流', icon: '📦', color: '#3B82F6' },
  { key: 'price', label: '性价比', icon: '💰', color: '#10B981' },
];

// ==================== 主组件 ====================
export default function CompetitorAnalysis({ onClose, onSuccess, currentUser }) {
  // ========== 基础信息 ==========
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [category, setCategory] = useState('Shampoo');
  const [market, setMarket] = useState('Indonesia');
  const [platform, setPlatform] = useState('Shopee');

  // ========== 竞品列表 ==========
  const [competitors, setCompetitors] = useState([
    createEmptyCompetitor(1),
    createEmptyCompetitor(2),
    createEmptyCompetitor(3),
  ]);

  // ========== 分析结果 ==========
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // ========== 状态控制 ==========
  const [activeStep, setActiveStep] = useState(1); // 1:输入 2:提取 3:分析 4:结果
  const [expandedCompetitor, setExpandedCompetitor] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ========== 辅助函数 ==========
  function createEmptyCompetitor(index) {
    return {
      id: `comp_${index}`,
      url: '',
      status: 'pending', // pending / extracting / extracted / analyzing / completed / error
      error: '',
      
      // 模块1: 基础数据
      basicData: null,
      
      // 模块2: 标题分析
      titleAnalysis: null,
      
      // 模块3: 卖点提取
      sellingPoints: null,
      
      // 模块4: 成分分析
      ingredients: null,
      
      // 模块5: 视觉素材
      visuals: null,
      
      // 模块6: 差评痛点
      painPoints: null,
    };
  }

  function updateCompetitor(index, updates) {
    setCompetitors(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  }

  // ========== 提取竞品数据（Gemini）==========
  async function handleExtractSingle(index) {
    const comp = competitors[index];
    if (!comp.url.trim()) {
      updateCompetitor(index, { error: '请输入链接' });
      return;
    }

    updateCompetitor(index, { status: 'extracting', error: '' });

    try {
      // 模拟 API 调用（实际需要调用后端）
      // const result = await extractCompetitorData(comp.url, { market, platform, category });
      
      // 模拟数据（开发阶段）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData = generateMockExtractedData(index);
      
      updateCompetitor(index, {
        status: 'extracted',
        ...mockData
      });
    } catch (err) {
      updateCompetitor(index, {
        status: 'error',
        error: err.message || '提取失败'
      });
    }
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
      if (competitors[i].url.trim()) {
        await handleExtractSingle(i);
      }
    }

    setIsExtracting(false);
    setActiveStep(2);
  }

  // ========== 深度分析（Claude）==========
  async function handleDeepAnalysis() {
    const extractedCompetitors = competitors.filter(c => c.status === 'extracted' || c.status === 'completed');
    if (extractedCompetitors.length === 0) {
      alert('请先提取竞品数据');
      return;
    }

    setIsAnalyzing(true);
    setActiveStep(3);

    try {
      // 1. 对每个竞品分析差评痛点
      for (let i = 0; i < competitors.length; i++) {
        if (competitors[i].status === 'extracted') {
          updateCompetitor(i, { status: 'analyzing' });
          
          // 模拟 Claude 分析
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const mockPainPoints = generateMockPainPoints();
          updateCompetitor(i, {
            status: 'completed',
            painPoints: mockPainPoints
          });
        }
      }

      // 2. 生成综合分析报告
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockAnalysisResult = generateMockAnalysisResult();
      setAnalysisResult(mockAnalysisResult);
      
      setActiveStep(4);
    } catch (err) {
      alert('分析失败: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ========== 保存分析报告 ==========
  async function handleSave() {
    if (!analysisTitle.trim()) {
      alert('请输入报告标题');
      return;
    }

    setIsSaving(true);

    try {
      const reportData = {
        title: analysisTitle,
        category,
        market,
        platform,
        competitors: competitors.filter(c => c.status === 'completed'),
        analysis: analysisResult,
        created_by: currentUser?.id,
        created_at: new Date().toISOString()
      };

      // await saveCompetitorAnalysis(reportData);
      console.log('保存数据:', reportData);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('✅ 竞品分析报告保存成功！');
      onSuccess?.();
      onClose?.();
    } catch (err) {
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
                placeholder="如：印尼竹炭牙膏竞品分析-2026.01"
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
                  开始深度分析（Claude）
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
            // 空状态
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
            // 完整分析报告
            <AnalysisReport 
              competitors={competitors.filter(c => c.status === 'completed')}
              analysis={analysisResult}
              market={market}
            />
          ) : (
            // 提取结果预览
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
            {competitor.basicData.name}
          </div>
          <div style={{ display: 'flex', gap: '12px', color: '#6E6E73', flexWrap: 'wrap' }}>
            <span>💰 {competitor.basicData.price}</span>
            <span>📦 {competitor.basicData.volume}</span>
            <span>⭐ {competitor.basicData.rating}</span>
            <span>💬 {competitor.basicData.reviewCount} 评论</span>
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

// 单个竞品卡片（详细展示）
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
      {/* 头部 - 基础信息 */}
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
              {basicData.name}
            </h3>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#6E6E73' }}>
              <span style={{ fontWeight: '600', color: '#EF4444' }}>{basicData.price}</span>
              <span>📦 {basicData.volume}</span>
              <span>⭐ {basicData.rating}</span>
              <span>💬 {basicData.reviewCount}</span>
              <span>🛒 {basicData.sales}</span>
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

      {/* 展开详情 */}
      {isExpanded && (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* 标题分析 */}
            <DetailSection 
              icon="📝" 
              title="标题分析"
              status={titleAnalysis ? 'done' : 'pending'}
            >
              {titleAnalysis && (
                <>
                  <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '10px', lineHeight: '1.5' }}>
                    {titleAnalysis.full}
                  </div>
                  <div style={{ fontSize: '11px', color: '#86868B', marginBottom: '8px' }}>
                    字符数: {titleAnalysis.charCount} | 结构: {titleAnalysis.structure}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {titleAnalysis.keywords?.map((kw, i) => (
                      <span key={i} style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#EFF6FF',
                        color: '#3B82F6',
                        fontSize: '11px'
                      }}>{kw}</span>
                    ))}
                  </div>
                </>
              )}
            </DetailSection>

            {/* 卖点提取 */}
            <DetailSection 
              icon="⭐" 
              title="核心卖点"
              status={sellingPoints ? 'done' : 'pending'}
            >
              {sellingPoints && (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#1D1D1F' }}>
                  {sellingPoints.map((sp, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{sp}</li>
                  ))}
                </ul>
              )}
            </DetailSection>

            {/* 成分分析 */}
            <DetailSection 
              icon="🧪" 
              title="主打成分"
              status={ingredients ? 'done' : 'pending'}
            >
              {ingredients && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ingredients.map((ing, i) => (
                    <div key={i} style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#F5F5F7',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontWeight: '600', color: '#1D1D1F' }}>{ing.name}</div>
                      <div style={{ fontSize: '11px', color: '#86868B' }}>{ing.benefit}</div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

            {/* 差评痛点 */}
            <DetailSection 
              icon="😣" 
              title="差评痛点"
              status={painPoints ? 'done' : 'pending'}
            >
              {painPoints && (
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
        <div style={{ fontSize: '12px', color: '#86868B' }}>等待分析...</div>
      )}
    </div>
  );
}

// 完整分析报告
function AnalysisReport({ competitors, analysis, market }) {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* 报告头部 */}
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
        
        {/* 核心结论 */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255,255,255,0.15)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>🎯 核心结论</div>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
            {analysis.summary?.conclusion || '该市场存在明显的差异化机会，建议从产品体验和包装升级切入。'}
          </p>
        </div>
      </div>

      {/* 市场机会评估 */}
      <ReportSection icon="📈" title="市场机会评估">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <MetricCard 
            label="市场容量" 
            value={analysis.marketAssessment?.volume || '中等'} 
            trend="up"
          />
          <MetricCard 
            label="竞争程度" 
            value={analysis.marketAssessment?.competition || '中等'} 
            trend="neutral"
          />
          <MetricCard 
            label="利润空间" 
            value={analysis.marketAssessment?.margin || '较高'} 
            trend="up"
          />
          <MetricCard 
            label="进入建议" 
            value={analysis.marketAssessment?.recommendation || '推荐'} 
            highlight={true}
          />
        </div>
      </ReportSection>

      {/* 价格带分析 */}
      <ReportSection icon="💰" title="价格带分析">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#F5F5F7', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '8px' }}>最低价</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#10B981' }}>
              {analysis.priceAnalysis?.min || 'IDR 35,000'}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#EFF6FF', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#3B82F6', marginBottom: '8px' }}>主流价格</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3B82F6' }}>
              {analysis.priceAnalysis?.median || 'IDR 55,000'}
            </div>
          </div>
          <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#F5F5F7', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '8px' }}>最高价</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#EF4444' }}>
              {analysis.priceAnalysis?.max || 'IDR 89,000'}
            </div>
          </div>
        </div>
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          borderRadius: '8px', 
          backgroundColor: '#FEF3C7',
          fontSize: '13px',
          color: '#92400E'
        }}>
          💡 <strong>定价建议：</strong>{analysis.priceAnalysis?.suggestion || '建议定价 IDR 49,900 - 59,900，略低于头部竞品，主打性价比差异化'}
        </div>
      </ReportSection>

      {/* 差评痛点汇总 */}
      <ReportSection icon="😣" title="差评痛点汇总（核心机会）">
        <div style={{ display: 'grid', gap: '12px' }}>
          {(analysis.painPointsSummary || [
            { category: '效果预期', count: 45, description: '美白效果不明显，与广告宣传不符', opportunity: '设置合理预期，附赠对比色卡' },
            { category: '性价比', count: 32, description: '价格偏高，容量偏小', opportunity: '加大容量或套装优惠' },
            { category: '使用体验', count: 28, description: '泡沫少、有异味、残留黑点', opportunity: '优化配方口感' },
            { category: '包装物流', count: 18, description: '包装破损、封口渗漏', opportunity: '升级包装+破损包赔' },
          ]).map((pp, i) => (
            <div key={i} style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#FEF2F2',
              borderLeft: '4px solid #EF4444',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#EF4444' }}>{pp.category}</span>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#FCA5A5',
                    color: 'white'
                  }}>出现 {pp.count} 次</span>
                </div>
                <div style={{ fontSize: '13px', color: '#1D1D1F', marginBottom: '8px' }}>{pp.description}</div>
                <div style={{ fontSize: '12px', color: '#10B981' }}>
                  💡 <strong>我们的机会：</strong>{pp.opportunity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* 差异化机会 */}
      <ReportSection icon="🚀" title="差异化机会">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {(analysis.opportunities || [
            { dimension: '产品升级', priority: '高', suggestions: ['泵头式包装设计', '益生菌复合配方', '加入抗敏成分'] },
            { dimension: '定价策略', priority: '中', suggestions: ['比头部竞品低10-15%', '买二送一套装', '首单优惠'] },
            { dimension: '营销差异', priority: '中', suggestions: ['真实KOC种草', '场景化投放（咖啡爱好者）', '效果对比视频'] },
            { dimension: '服务承诺', priority: '高', suggestions: ['破损包赔', '无效退款', '附赠美白色卡'] },
          ]).map((opp, i) => (
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
                {opp.suggestions.map((s, j) => (
                  <li key={j} style={{ marginBottom: '4px' }}>{s}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* 产品开发建议 */}
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
                {analysis.recommendations?.positioning || '美白不伤龈的竹炭益生菌牙膏，主打温和有效'}
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#7C3AED' }}>💰 建议定价</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#1D1D1F', lineHeight: '1.6' }}>
                {analysis.recommendations?.pricing || 'IDR 49,900 - 59,900（150g装，比竞品多25%容量）'}
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#7C3AED' }}>⭐ 核心差异点</h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#1D1D1F' }}>
                {(analysis.recommendations?.differentiators || ['泵头式高级包装', '竹炭+益生菌双重配方', '破损包赔服务承诺']).map((d, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#EF4444' }}>⚠️ 规避的坑</h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#1D1D1F' }}>
                {(analysis.recommendations?.pitfalls || ['不要过度宣传美白效果', '注意包装防摔防漏', '控制成本避免定价过高']).map((p, i) => (
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

// 指标卡片
function MetricCard({ label, value, trend, highlight }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: highlight ? '#EFF6FF' : '#F5F5F7',
      border: highlight ? '2px solid #3B82F6' : '1px solid #E5E5EA',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '8px' }}>{label}</div>
      <div style={{ 
        fontSize: '18px', 
        fontWeight: '700', 
        color: highlight ? '#3B82F6' : (trend === 'up' ? '#10B981' : '#1D1D1F')
      }}>
        {value}
        {trend === 'up' && ' ↑'}
        {trend === 'down' && ' ↓'}
      </div>
    </div>
  );
}

// ==================== Mock 数据生成（开发阶段）====================
function generateMockExtractedData(index) {
  const mockProducts = [
    {
      basicData: {
        name: 'Lola Rose Advanced Charcoal Toothpaste 120g',
        brand: 'Lola Rose',
        price: 'Rp 55,900',
        priceOriginal: 'Rp 79,900',
        volume: '120g',
        sales: '10rb+ terjual',
        rating: 4.8,
        reviewCount: 2547
      },
      titleAnalysis: {
        full: 'Lola Rose Original Pasta Gigi Pemutih Charcoal Whitening Toothpaste 120g BPOM',
        charCount: 78,
        structure: '品牌 + 产品类型 + 核心成分 + 功效 + 规格 + 认证',
        keywords: ['Pasta Gigi Pemutih', 'Charcoal', 'Whitening', 'BPOM', '美白牙膏']
      },
      sellingPoints: [
        '强力去渍 - 竹炭成分针对咖啡/茶/烟渍',
        '去除牙结石 - Hydrated Silica 物理摩擦',
        '无氟配方 - 孕妇及5岁以上儿童可用',
        '3倍美白 - 4周可见效果',
        'BPOM认证 - 印尼官方安全认证'
      ],
      ingredients: [
        { name: '竹炭 Charcoal', benefit: '吸附去渍' },
        { name: 'Hydrated Silica', benefit: '物理美白' },
        { name: 'Menthol', benefit: '清新口气' }
      ],
      visuals: {
        mainImage: 'https://down-id.img.susercontent.com/file/id-11134207-7r98z-example1',
        detailImages: []
      }
    },
    {
      basicData: {
        name: 'SAFI White Expert Toothpaste 100g',
        brand: 'SAFI',
        price: 'Rp 42,000',
        priceOriginal: 'Rp 58,000',
        volume: '100g',
        sales: '5rb+ terjual',
        rating: 4.6,
        reviewCount: 1823
      },
      titleAnalysis: {
        full: 'SAFI White Expert Pasta Gigi Pemutih Halal Natural Whitening 100g',
        charCount: 65,
        structure: '品牌 + 系列 + 产品类型 + 认证 + 功效 + 规格',
        keywords: ['White Expert', 'Halal', 'Natural Whitening', 'Pemutih']
      },
      sellingPoints: [
        'Halal认证 - 清真友好',
        '天然美白成分',
        '温和配方 - 适合敏感牙龈',
        '持久清新口气'
      ],
      ingredients: [
        { name: 'Calcium Carbonate', benefit: '温和去渍' },
        { name: 'Aloe Vera', benefit: '舒缓牙龈' }
      ],
      visuals: {
        mainImage: 'https://down-id.img.susercontent.com/file/id-11134207-7r98z-example2',
        detailImages: []
      }
    },
    {
      basicData: {
        name: 'Ciptadent Pro Charcoal 150g',
        brand: 'Ciptadent',
        price: 'Rp 28,500',
        priceOriginal: 'Rp 35,000',
        volume: '150g',
        sales: '50rb+ terjual',
        rating: 4.5,
        reviewCount: 8932
      },
      titleAnalysis: {
        full: 'Ciptadent Pro Charcoal Pasta Gigi Arang Aktif Pemutih Gigi 150g',
        charCount: 62,
        structure: '品牌 + 系列 + 成分 + 产品类型 + 功效 + 规格',
        keywords: ['Charcoal', 'Arang Aktif', 'Pemutih Gigi', '活性炭']
      },
      sellingPoints: [
        '超高性价比 - 150g大容量',
        '活性炭深层清洁',
        '全家适用',
        '月销量TOP'
      ],
      ingredients: [
        { name: 'Activated Charcoal', benefit: '深层清洁' },
        { name: 'Fluoride', benefit: '防蛀固齿' }
      ],
      visuals: {
        mainImage: 'https://down-id.img.susercontent.com/file/id-11134207-7r98z-example3',
        detailImages: []
      }
    }
  ];

  return mockProducts[index] || mockProducts[0];
}

function generateMockPainPoints() {
  return [
    {
      category: '效果预期',
      description: '用完一支没看到明显美白效果，广告过于夸张',
      frequency: '高频',
      originalReviews: ['用了一个月没效果', '和普通牙膏没区别'],
      opportunity: '设置合理预期，附赠美白对比色卡追踪效果'
    },
    {
      category: '性价比',
      description: '120g近6万盾价格偏高，容量偏小',
      frequency: '中频',
      originalReviews: ['太贵了', '量太少'],
      opportunity: '加大容量到150g，或提供套装优惠'
    },
    {
      category: '使用体验',
      description: '泡沫不够丰富，有轻微土腥味，刷完牙缝残留黑点',
      frequency: '低频',
      originalReviews: ['泡沫少', '味道怪'],
      opportunity: '优化配方口感，增加薄荷清新感'
    }
  ];
}

function generateMockAnalysisResult() {
  return {
    summary: {
      conclusion: '印尼竹炭牙膏市场处于快速增长期，头部产品存在明显的效果预期管理和性价比痛点，建议通过包装升级+复合配方+合理定价切入市场。'
    },
    marketAssessment: {
      volume: '中高',
      competition: '中等',
      margin: '较高',
      recommendation: '⭐⭐⭐⭐ 推荐进入'
    },
    priceAnalysis: {
      min: 'Rp 28,500',
      median: 'Rp 45,000',
      max: 'Rp 79,900',
      suggestion: '建议定价 Rp 49,900，150g装，比竞品Lola Rose多25%容量但更低价'
    },
    painPointsSummary: [
      { category: '效果预期', count: 45, description: '美白效果不明显，与广告宣传不符', opportunity: '设置合理预期，附赠对比色卡' },
      { category: '性价比', count: 32, description: '价格偏高，容量偏小', opportunity: '加大容量或套装优惠' },
      { category: '使用体验', count: 28, description: '泡沫少、有异味、残留黑点', opportunity: '优化配方口感' },
      { category: '包装物流', count: 18, description: '包装破损、封口渗漏', opportunity: '升级包装+破损包赔' }
    ],
    opportunities: [
      { dimension: '产品升级', priority: '高', suggestions: ['泵头式包装设计', '益生菌复合配方', '加入抗敏成分'] },
      { dimension: '定价策略', priority: '中', suggestions: ['比头部竞品低10-15%', '买二送一套装', '首单优惠'] },
      { dimension: '营销差异', priority: '中', suggestions: ['真实KOC种草', '场景化投放', '效果对比视频'] },
      { dimension: '服务承诺', priority: '高', suggestions: ['破损包赔', '无效退款', '附赠美白色卡'] }
    ],
    recommendations: {
      positioning: '美白不伤龈的竹炭益生菌牙膏，主打温和有效',
      pricing: 'Rp 49,900 - 59,900（150g装，比竞品多25%容量）',
      differentiators: ['泵头式高级包装', '竹炭+益生菌双重配方', '破损包赔服务承诺'],
      pitfalls: ['不要过度宣传美白效果', '注意包装防摔防漏', '控制成本避免定价过高']
    }
  };
}
