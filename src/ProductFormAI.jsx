// src/ProductFormAI.jsx
// AI 智能创建产品 - 主组件（精简版）
// 2026-01-31 重构：拆分为多个子组件
// 2026-01-31 更新：集成竞品分析数据
import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Check, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import { extractCompetitorInfo, generateProductPlan, insertAIDraft } from './api';
import { getCurrentBeijingISO } from './timeConfig';

// 子组件
import CompetitorCard from './components/ai-create/CompetitorCard';
import GeneratedModules from './components/ai-create/GeneratedModules';
import { 
  AIConfigPanel, 
  BrandInfoPanel, 
  CoreInputPanel, 
  MarketInfoPanel 
} from './components/ai-create/InputPanels';
import { withTimeout, formatGeneratedData, prepareDraftData } from './components/ai-create/utils';

// ==================== 主组件 ====================
const ProductFormAI = ({ onClose, onSuccess, currentUser, preSelectedAnalysis }) => {
  // ========== AI 配置状态 ==========
  const [aiConfig, setAiConfig] = useState({
    extract_provider: 'gemini',
    generate_provider: 'claude'
  });

  // ========== 表单状态 ==========
  const [formData, setFormData] = useState({
    brandName: 'BIOAQUA',
    brandPhilosophy: '自然科技，焕活秀发',
    coreSellingPoint: '',
    conceptIngredient: '',
    volume: '',
    pricing: '',
    category: 'Shampoo',
    market: 'Indonesia',
    platform: 'Shopee'
  });

  // ========== 竞品分析状态 ==========
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(!!preSelectedAnalysis);
  const [selectedPainPoints, setSelectedPainPoints] = useState([]);
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);
  const [useAnalysisData, setUseAnalysisData] = useState(!!preSelectedAnalysis);

  // ========== 竞品状态 ==========
  const [competitors, setCompetitors] = useState([
    { mode: 'url', url: '', images: [], data: null, loading: false, success: false, error: '' },
    { mode: 'url', url: '', images: [], data: null, loading: false, success: false, error: '' },
    { mode: 'url', url: '', images: [], data: null, loading: false, success: false, error: '' }
  ]);
  const [extractingIndex, setExtractingIndex] = useState(null);
  const fileInputRefs = [useRef(null), useRef(null), useRef(null)];

  // ========== 生成状态 ==========
  const [generatedData, setGeneratedData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // ========== 模块状态 ==========
  const [moduleStatus, setModuleStatus] = useState({});
  const [editingModule, setEditingModule] = useState(null);
  const [regeneratingModule, setRegeneratingModule] = useState(null);

  // ========== 保存状态 ==========
  const [isSaving, setIsSaving] = useState(false);

  // ========== 初始化：从竞品分析预填充 ==========
  useEffect(() => {
    if (preSelectedAnalysis) {
      // 预填充表单数据
      setFormData(prev => ({
        ...prev,
        category: preSelectedAnalysis.category || prev.category,
        market: preSelectedAnalysis.market || prev.market,
        platform: preSelectedAnalysis.platform || prev.platform,
        // 如果有定价建议，预填充
        pricing: preSelectedAnalysis.recommendations?.pricing || prev.pricing
      }));

      // 默认选中所有痛点和机会
      const painPoints = preSelectedAnalysis.pain_points_summary || [];
      const opportunities = preSelectedAnalysis.opportunities || [];
      
      setSelectedPainPoints(painPoints.map((_, i) => i));
      setSelectedOpportunities(opportunities.map((_, i) => i));
      
      setShowAnalysisPanel(true);
      setUseAnalysisData(true);
    }
  }, [preSelectedAnalysis]);

  // ========== 辅助函数 ==========
  const updateCompetitor = (index, updates) => {
    setCompetitors(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const updateModuleStatus = (moduleId, status) => {
    setModuleStatus(prev => ({ ...prev, [moduleId]: status }));
  };

  // 切换痛点选择
  const togglePainPoint = (index) => {
    setSelectedPainPoints(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // 切换机会选择
  const toggleOpportunity = (index) => {
    setSelectedOpportunities(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // ========== 竞品提取 ==========
  const handleExtractCompetitor = async (index) => {
    const comp = competitors[index];
    
    if (comp.mode === 'url') {
      if (!comp.url) return;
      
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(comp.url.trim())) {
        updateCompetitor(index, { error: '请输入有效的商品链接（以 http:// 或 https:// 开头）' });
        return;
      }
      
      setExtractingIndex(index);
      updateCompetitor(index, { loading: true, error: '', success: false, data: null });

      try {
        const cleanUrl = comp.url.trim();

        const result = await withTimeout(
          extractCompetitorInfo(cleanUrl, aiConfig),
          90000
        );
        
        console.log('📥 竞品提取结果:', result);
        
        const listing = result?.listing || result?.data || result;
        
        const extractedData = {
          name: listing?.title || listing?.name || listing?.product_name || listing?.productName || '',
          brand: listing?.brand || listing?.shop_name || '',
          price: listing?.price || listing?.sale_price || listing?.salePrice || '',
          originalPrice: listing?.original_price || listing?.originalPrice || '',
          volume: listing?.volume || listing?.size || listing?.specification || '',
          rating: listing?.rating || listing?.score || '',
          reviewCount: listing?.review_count || listing?.reviewCount || listing?.reviews || '',
          sales: listing?.sales || listing?.sold || listing?.sales_count || '',
          title: listing?.full_title || listing?.title || '',
          titleKeywords: listing?.title_keywords || listing?.keywords || [],
          sellingPoints: listing?.selling_points || listing?.benefits || listing?.highlights || listing?.features || [],
          ingredients: listing?.ingredients || listing?.composition || listing?.ingredient_list || '',
          imageUrl: listing?.image || listing?.main_image || listing?.imageUrl || null
        };
        
        const hasValidData = extractedData.name || extractedData.price || extractedData.ingredients;
        
        if (!hasValidData) {
          updateCompetitor(index, {
            loading: false,
            success: false,
            error: '未能提取到有效信息，请检查链接是否为有效商品页面'
          });
        } else {
          updateCompetitor(index, {
            loading: false,
            success: true,
            data: extractedData,
            error: ''
          });
        }
      } catch (err) {
        console.error('❌ 提取异常:', err);
        updateCompetitor(index, {
          loading: false,
          success: false,
          error: err.message || '提取失败'
        });
      } finally {
        setExtractingIndex(null);
      }
    }
  };

  // ========== 图片上传处理 ==========
  const handleImageUpload = (index, files) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files).slice(0, 3);
      updateCompetitor(index, { 
        images: fileArray, 
        mode: 'image',
        success: false, 
        data: null, 
        error: '' 
      });
    }
  };

  // ========== 生成产品方案 ==========
  const handleGenerate = async () => {
    const hasCompetitorData = competitors.some(c => c.success && c.data);
    const hasAnalysisData = useAnalysisData && preSelectedAnalysis;
    
    if (!hasCompetitorData && !hasAnalysisData) {
      alert('请至少提取1条竞品数据，或使用竞品分析报告');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');

    try {
      // 收集竞品数据
      const competitorsData = competitors
        .filter(c => c.success && c.data)
        .map(c => ({
          name: c.data.name || '',
          price: c.data.price || '',
          volume: c.data.volume || '',
          ingredients: c.data.ingredients || '',
          benefits: c.data.sellingPoints || c.data.benefits || [],
          source_url: c.url || ''
        }));

      // ✅ 收集竞品分析数据
      let analysisContext = null;
      if (useAnalysisData && preSelectedAnalysis) {
        const painPoints = preSelectedAnalysis.pain_points_summary || [];
        const opportunities = preSelectedAnalysis.opportunities || [];
        
        analysisContext = {
          title: preSelectedAnalysis.title,
          summary: preSelectedAnalysis.summary?.conclusion || '',
          // 只包含选中的痛点
          painPoints: selectedPainPoints.map(i => painPoints[i]).filter(Boolean),
          // 只包含选中的机会
          opportunities: selectedOpportunities.map(i => opportunities[i]).filter(Boolean),
          // 产品建议
          recommendations: preSelectedAnalysis.recommendations || {},
          // 竞品分析中的竞品数据
          analysisCompetitors: preSelectedAnalysis.competitors || []
        };
      }

      const payload = {
        brandName: formData.brandName,
        brandPhilosophy: formData.brandPhilosophy,
        coreSellingPoint: formData.coreSellingPoint,
        conceptIngredient: formData.conceptIngredient,
        volume: formData.volume,
        pricing: formData.pricing,
        category: formData.category,
        market: formData.market,
        platform: formData.platform,
        competitors: competitorsData,
        ai_config: aiConfig,
        // ✅ 新增：竞品分析上下文
        analysis_context: analysisContext
      };

      console.log('📤 发送生成请求:', payload);

      const result = await withTimeout(generateProductPlan(payload), 120000);
      
      console.log('📥 收到生成结果:', result);

      if (result && result.success !== false) {
        const planData = result.data || result;
        const plan = planData.plan || planData;
        const explanations = planData.explanations || {};

        const formattedData = formatGeneratedData(plan, explanations, competitorsData, formData);
        setGeneratedData(formattedData);
      } else {
        setGenerateError(result?.error || 'AI 返回数据为空');
      }
    } catch (err) {
      console.error('生成失败:', err);
      setGenerateError(err.message || '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // ========== 保存草稿 ==========
  const handleSaveDraft = async () => {
    if (!generatedData) {
      alert('请先生成产品方案');
      return;
    }

    setIsSaving(true);

    try {
      const draftData = prepareDraftData(generatedData, formData, competitors, aiConfig, currentUser);
      draftData.created_at = getCurrentBeijingISO();
      
      // ✅ 新增：关联竞品分析ID
      if (preSelectedAnalysis?.id) {
        draftData.from_analysis_id = preSelectedAnalysis.id;
      }

      await insertAIDraft(draftData);
      
      alert('✅ 草稿保存成功！\n\n请前往「AI 草稿」Tab 查看，管理员审核通过后将自动创建产品。');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('保存失败:', err);
      alert(`保存失败：${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ========== 模块操作 ==========
  const handleRegenerate = (moduleId) => {
    setRegeneratingModule(moduleId);
    setTimeout(() => {
      setRegeneratingModule(null);
    }, 1500);
  };

  // 计算已提取竞品数量
  const extractedCount = competitors.filter(c => c.success).length;
  
  // 是否可以生成（有竞品数据或有分析数据）
  const canGenerate = extractedCount > 0 || (useAnalysisData && preSelectedAnalysis);

  // ==================== 主渲染 ====================
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      backgroundColor: '#F5F5F7',
      color: '#1d1d1f',
      fontFamily: "'Noto Sans SC', 'SF Pro Display', -apple-system, sans-serif",
      overflow: 'hidden'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid #e5e5ea',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F7',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f97316, #fb923c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>🧪</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>AI 智能创建产品</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#86868b' }}>
              {preSelectedAnalysis 
                ? `📊 基于「${preSelectedAnalysis.title}」创建` 
                : '9模块产品方案生成 · AI驱动'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {generatedData && (
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginRight: '12px',
              padding: '8px 16px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '12px'
            }}>
              <span style={{ color: '#86868b' }}>
                待审核: <span style={{ color: '#ea580c', fontWeight: '600' }}>
                  {9 - Object.values(moduleStatus).filter(s => s === 'approved' || s === 'needsRevision').length}
                </span>
              </span>
              <span style={{ color: '#86868b' }}>
                已确认: <span style={{ color: '#10b981', fontWeight: '600' }}>
                  {Object.values(moduleStatus).filter(s => s === 'approved').length}
                </span>
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #d2d2d7',
              backgroundColor: 'transparent',
              color: '#6e6e73',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <X size={16} /> 关闭
          </button>
          {generatedData && (
            <button
              onClick={handleSaveDraft}
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isSaving ? '#d2d2d7' : 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSaving ? '⏳ 保存中...' : '💾 保存草稿'}
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 69px)' }}>
        {/* Left Panel - 输入区 */}
        <div style={{
          width: '420px',
          borderRight: '1px solid #e5e5ea',
          padding: '20px',
          overflowY: 'auto',
          backgroundColor: '#F5F5F7'
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#ea580c' }}>
            📝 输入信息
          </h2>

          {/* ✅ 新增：竞品分析参考面板 */}
          {preSelectedAnalysis && (
            <AnalysisReferencePanel
              analysis={preSelectedAnalysis}
              isExpanded={showAnalysisPanel}
              onToggle={() => setShowAnalysisPanel(!showAnalysisPanel)}
              useAnalysisData={useAnalysisData}
              onToggleUse={() => setUseAnalysisData(!useAnalysisData)}
              selectedPainPoints={selectedPainPoints}
              selectedOpportunities={selectedOpportunities}
              onTogglePainPoint={togglePainPoint}
              onToggleOpportunity={toggleOpportunity}
            />
          )}

          {/* AI 模型选择 */}
          <AIConfigPanel aiConfig={aiConfig} onChange={setAiConfig} />

          {/* 品牌信息 */}
          <BrandInfoPanel formData={formData} onChange={setFormData} />

          {/* 核心输入 */}
          <CoreInputPanel formData={formData} onChange={setFormData} />

          {/* 市场信息 */}
          <MarketInfoPanel formData={formData} onChange={setFormData} />

          {/* 竞品采集 */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            marginBottom: '16px',
            border: useAnalysisData && preSelectedAnalysis ? '1px solid #e5e5ea' : '1px solid #f97316'
          }}>
            <div style={{ 
              fontSize: '11px', 
              color: useAnalysisData && preSelectedAnalysis ? '#86868b' : '#ea580c', 
              marginBottom: '12px', 
              fontWeight: '600', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              🔗 竞品采集
              {useAnalysisData && preSelectedAnalysis ? (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#f0fdf4',
                  color: '#10b981'
                }}>可选 · 已有分析数据</span>
              ) : (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#fff7ed',
                  color: '#ea580c'
                }}>必填 · 已提取{extractedCount}条</span>
              )}
            </div>
            
            {competitors.map((comp, index) => (
              <CompetitorCard 
                key={index} 
                index={index} 
                competitor={comp}
                isExtracting={extractingIndex === index}
                onUpdateCompetitor={updateCompetitor}
                onExtract={handleExtractCompetitor}
                onImageUpload={handleImageUpload}
                fileInputRef={fileInputRefs[index]}
                platform={formData.platform}
              />
            ))}

            {/* 竞品分析摘要 */}
            {extractedCount > 0 && (
              <div style={{
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                marginTop: '12px'
              }}>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600', marginBottom: '8px' }}>
                  📊 竞品快速分析
                </div>
                <div style={{ fontSize: '11px', color: '#6e6e73', lineHeight: '1.6' }}>
                  <div>• 已提取 {extractedCount} 条竞品数据</div>
                  <div>• 点击生成后，AI 将分析竞品差异化机会</div>
                </div>
              </div>
            )}
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: (isGenerating || !canGenerate) 
                ? '#d2d2d7' 
                : 'linear-gradient(135deg, #f97316, #fb923c)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: (isGenerating || !canGenerate) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isGenerating ? '⚙️ AI 生成中...' : '🚀 生成产品方案'}
          </button>
          
          {!canGenerate && (
            <p style={{ fontSize: '11px', color: '#86868b', textAlign: 'center', marginTop: '8px' }}>
              请先提取竞品数据或启用竞品分析参考
            </p>
          )}

          {generateError && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '12px'
            }}>
              ❌ {generateError}
            </div>
          )}
        </div>

        {/* Right Panel - 生成结果 */}
        <div style={{
          flex: 1,
          padding: '20px 28px',
          overflowY: 'auto',
          backgroundColor: '#F5F5F7'
        }}>
          {!generatedData ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#86868b'
            }}>
              <div style={{ fontSize: '72px', marginBottom: '16px', opacity: 0.3 }}>🧪</div>
              <p style={{ fontSize: '16px', fontWeight: '500', color: '#6e6e73' }}>填写左侧信息后点击生成</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>
                {preSelectedAnalysis 
                  ? 'AI 将基于竞品分析报告 + 竞品数据生成完整产品方案'
                  : 'AI 将基于竞品分析 + 手动输入生成完整产品方案'}
              </p>
            </div>
          ) : (
            <GeneratedModules
              generatedData={generatedData}
              formData={formData}
              moduleStatus={moduleStatus}
              editingModule={editingModule}
              regeneratingModule={regeneratingModule}
              onEdit={setEditingModule}
              onRegenerate={handleRegenerate}
              onStatusChange={updateModuleStatus}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input:focus, select:focus {
          outline: none;
          border-color: #f97316 !important;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #FFFFFF;
        }
        ::-webkit-scrollbar-thumb {
          background: #d2d2d7;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

// ==================== 竞品分析参考面板 ====================
function AnalysisReferencePanel({
  analysis,
  isExpanded,
  onToggle,
  useAnalysisData,
  onToggleUse,
  selectedPainPoints,
  selectedOpportunities,
  onTogglePainPoint,
  onToggleOpportunity
}) {
  const painPoints = analysis.pain_points_summary || [];
  const opportunities = analysis.opportunities || [];
  const recommendations = analysis.recommendations || {};
  const competitors = analysis.competitors || [];

  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: '#FFFFFF',
      marginBottom: '16px',
      border: useAnalysisData ? '2px solid #8B5CF6' : '1px solid #e5e5ea'
    }}>
      {/* 头部 */}
      <div 
        onClick={onToggle}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: isExpanded ? '12px' : 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>📊</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f' }}>
              竞品分析参考
            </div>
            <div style={{ fontSize: '10px', color: '#86868b' }}>
              {analysis.title}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 启用开关 */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleUse(); }}
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: useAnalysisData ? '#8B5CF6' : '#e5e5ea',
              color: useAnalysisData ? 'white' : '#86868b',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {useAnalysisData ? <Check size={12} /> : null}
            {useAnalysisData ? '已启用' : '未启用'}
          </button>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div style={{ fontSize: '12px' }}>
          {/* 核心结论 */}
          {analysis.summary?.conclusion && (
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: '#F5F3FF',
              marginBottom: '12px'
            }}>
              <div style={{ fontWeight: '600', color: '#7C3AED', marginBottom: '4px', fontSize: '11px' }}>
                🎯 核心结论
              </div>
              <div style={{ color: '#1d1d1f', lineHeight: '1.5' }}>
                {analysis.summary.conclusion}
              </div>
            </div>
          )}

          {/* 竞品列表 */}
          {competitors.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: '600', color: '#6e6e73', marginBottom: '6px', fontSize: '11px' }}>
                📦 分析的竞品 ({competitors.length}个)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {competitors.slice(0, 3).map((comp, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#f0f9ff',
                      color: '#0369a1',
                      fontSize: '10px'
                    }}
                  >
                    {comp.basicData?.name || comp.name || `竞品${i + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 痛点选择 */}
          {painPoints.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontWeight: '600', 
                color: '#DC2626', 
                marginBottom: '6px', 
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <AlertTriangle size={12} />
                差评痛点（点击选择要参考的）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {painPoints.map((point, i) => (
                  <div
                    key={i}
                    onClick={() => onTogglePainPoint(i)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: selectedPainPoints.includes(i) ? '#FEF2F2' : '#f9fafb',
                      border: selectedPainPoints.includes(i) ? '1px solid #FECACA' : '1px solid #e5e5ea',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: selectedPainPoints.includes(i) ? 'none' : '1px solid #d1d5db',
                      backgroundColor: selectedPainPoints.includes(i) ? '#DC2626' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px'
                    }}>
                      {selectedPainPoints.includes(i) && <Check size={10} color="white" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#DC2626', fontSize: '11px' }}>
                        {point.category}
                      </div>
                      <div style={{ color: '#6e6e73', fontSize: '10px', marginTop: '2px' }}>
                        {point.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 差异化机会选择 */}
          {opportunities.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontWeight: '600', 
                color: '#059669', 
                marginBottom: '6px', 
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Lightbulb size={12} />
                差异化机会（点击选择要采纳的）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {opportunities.map((opp, i) => (
                  <div
                    key={i}
                    onClick={() => onToggleOpportunity(i)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: selectedOpportunities.includes(i) ? '#ECFDF5' : '#f9fafb',
                      border: selectedOpportunities.includes(i) ? '1px solid #A7F3D0' : '1px solid #e5e5ea',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: selectedOpportunities.includes(i) ? 'none' : '1px solid #d1d5db',
                      backgroundColor: selectedOpportunities.includes(i) ? '#059669' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px'
                    }}>
                      {selectedOpportunities.includes(i) && <Check size={10} color="white" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#059669', fontSize: '11px' }}>
                        {opp.dimension}
                      </div>
                      <div style={{ color: '#6e6e73', fontSize: '10px', marginTop: '2px' }}>
                        {opp.suggestion || (opp.suggestions && opp.suggestions.join(', '))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 建议定位 */}
          {recommendations.positioning && (
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <Target size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '600', color: '#D97706', fontSize: '11px' }}>建议定位</div>
                <div style={{ color: '#92400E', fontSize: '11px', marginTop: '2px' }}>
                  {recommendations.positioning}
                </div>
                {recommendations.pricing && (
                  <div style={{ color: '#92400E', fontSize: '11px', marginTop: '4px' }}>
                    💰 建议定价: {recommendations.pricing}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 统计 */}
          <div style={{
            marginTop: '12px',
            padding: '8px',
            borderRadius: '6px',
            backgroundColor: '#f9fafb',
            fontSize: '10px',
            color: '#86868b',
            textAlign: 'center'
          }}>
            已选择 {selectedPainPoints.length} 个痛点 · {selectedOpportunities.length} 个机会
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductFormAI;
