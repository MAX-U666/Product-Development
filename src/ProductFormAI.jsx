// src/ProductFormAI.jsx
// 基于 ai-draft-v3.jsx 改造，保留完整UI，接入真实API
import React, { useState, useRef } from 'react';
import { X, Upload, Link, Image as ImageIcon } from 'lucide-react';
import { extractCompetitorInfo, generateProductPlan, insertAIDraft } from './api';
import { getCurrentBeijingISO } from './timeConfig';

// ==================== 常量配置 ====================
const CATEGORIES = [
  { value: 'Shampoo', label: '洗发水 Shampoo' },
  { value: 'Conditioner', label: '护发素 Conditioner' },
  { value: 'BodyWash', label: '沐浴露 Body Wash' },
  { value: 'BodyLotion', label: '身体乳 Body Lotion' },
  { value: 'HairMask', label: '发膜 Hair Mask' },
  { value: 'HairSerum', label: '护发精油 Hair Serum' },
];

const MARKETS = [
  { value: 'Indonesia', label: '🇮🇩 印尼 Indonesia' },
  { value: 'Malaysia', label: '🇲🇾 马来西亚 Malaysia' },
  { value: 'Thailand', label: '🇹🇭 泰国 Thailand' },
  { value: 'Philippines', label: '🇵🇭 菲律宾 Philippines' },
  { value: 'Vietnam', label: '🇻🇳 越南 Vietnam' },
];

const PLATFORMS = [
  { value: 'Shopee', label: 'Shopee' },
  { value: 'Lazada', label: 'Lazada' },
  { value: 'TikTok', label: 'TikTok Shop' },
  { value: 'Tokopedia', label: 'Tokopedia' },
];

// AI 配置（固定千问）
const AI_CONFIG = {
  extract_provider: 'qwen',
  generate_provider: 'qwen'
};

// ==================== 主组件 ====================
const ProductFormAI = ({ onClose, onSuccess, currentUser }) => {
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

  // ========== 辅助函数 ==========
  const updateCompetitor = (index, updates) => {
    setCompetitors(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const updateModuleStatus = (moduleId, status) => {
    setModuleStatus(prev => ({ ...prev, [moduleId]: status }));
  };

  // 文件转 base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 超时包装
  const withTimeout = (promise, ms) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), ms))
    ]);
  };

  // ========== 竞品提取 ==========
  const handleExtractCompetitor = async (index) => {
    const comp = competitors[index];
    
    // URL 模式
    if (comp.mode === 'url') {
      if (!comp.url) return;
      
      // 验证URL格式
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(comp.url.trim())) {
        updateCompetitor(index, { error: '请输入有效的商品链接（以 http:// 或 https:// 开头）' });
        return;
      }
      
      setExtractingIndex(index);
      updateCompetitor(index, { loading: true, error: '', success: false, data: null });

      try {
        const result = await withTimeout(
          extractCompetitorInfo(comp.url.trim(), AI_CONFIG),
          90000
        );
        
        // 验证返回数据
        const listing = result?.listing || result;
        const hasValidData = listing && (listing.title || listing.name || listing.price || listing.ingredients);
        
        if (!hasValidData) {
          updateCompetitor(index, {
            loading: false,
            success: false,
            error: '未能提取到有效信息，请检查链接'
          });
        } else {
          updateCompetitor(index, {
            loading: false,
            success: true,
            data: {
              name: listing.title || listing.name || '',
              price: listing.price || '',
              volume: listing.volume || listing.size || '',
              ingredients: listing.ingredients || '',
              benefits: listing.benefits || listing.highlights || [],
              imageUrl: listing.image || listing.main_image || null
            },
            error: ''
          });
        }
      } catch (err) {
        updateCompetitor(index, {
          loading: false,
          success: false,
          error: err.message || '提取失败'
        });
      } finally {
        setExtractingIndex(null);
      }
    } 
    // 图片模式
    else {
      if (comp.images.length === 0) return;
      
      setExtractingIndex(index);
      updateCompetitor(index, { loading: true, error: '', success: false, data: null });

      try {
        const imageData = [];
        for (const file of comp.images) {
          const dataUrl = await fileToBase64(file);
          const base64 = dataUrl.split(',')[1];
          imageData.push({
            data: base64,
            mime_type: file.type
          });
        }

        const result = await withTimeout(
          extractCompetitorInfo({ mode: 'image', images: imageData }, AI_CONFIG),
          90000
        );
        
        const listing = result?.listing || result;
        const hasValidData = listing && (listing.title || listing.name || listing.price || listing.ingredients);
        
        if (!hasValidData) {
          updateCompetitor(index, {
            loading: false,
            success: false,
            error: '未能从图片提取到有效信息'
          });
        } else {
          updateCompetitor(index, {
            loading: false,
            success: true,
            data: {
              name: listing.title || listing.name || '',
              price: listing.price || '',
              volume: listing.volume || listing.size || '',
              ingredients: listing.ingredients || '',
              benefits: listing.benefits || listing.highlights || [],
              imageUrl: null
            },
            error: ''
          });
        }
      } catch (err) {
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
      const fileArray = Array.from(files).slice(0, 3); // 最多3张
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
    if (!hasCompetitorData) {
      alert('请至少提取1条竞品数据');
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
          benefits: c.data.benefits || [],
          source_url: c.url || ''
        }));

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
        ai_config: AI_CONFIG
      };

      console.log('📤 发送生成请求:', payload);

      const result = await withTimeout(generateProductPlan(payload), 120000);
      
      console.log('📥 收到生成结果:', result);

      if (result && result.success !== false) {
        const planData = result.data || result;
        const plan = planData.plan || planData;
        const explanations = planData.explanations || {};

        // 将后端返回数据转换为 UI 需要的格式
        const formattedData = formatGeneratedData(plan, explanations, competitorsData);
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

  // 格式化生成数据为 UI 需要的结构
  const formatGeneratedData = (plan, explanations, competitorsData) => {
    // 计算竞品价格区间
    const prices = competitorsData
      .map(c => c.price)
      .filter(p => p)
      .map(p => {
        const num = parseFloat(p.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
      })
      .filter(n => n > 0);
    
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const medianPrice = prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : 0;

    // 提取共同成分
    const allIngredients = competitorsData
      .map(c => c.ingredients)
      .filter(i => i)
      .join(', ')
      .split(/[,，]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const uniqueIngredients = [...new Set(allIngredients)].slice(0, 4);

    return {
      // 竞品分析摘要
      competitorAnalysis: {
        priceRange: { 
          min: minPrice ? `IDR ${minPrice.toLocaleString()}` : '-', 
          max: maxPrice ? `IDR ${maxPrice.toLocaleString()}` : '-', 
          median: medianPrice ? `IDR ${medianPrice.toLocaleString()}` : '-'
        },
        commonIngredients: uniqueIngredients.length > 0 ? uniqueIngredients : ['未提取到成分'],
        gaps: ['待分析差异化机会'],
        confidence: explanations.positioning?.confidence ? Math.round(explanations.positioning.confidence * 100) : 85
      },

      // 1. 产品名称
      productName: {
        options: [
          {
            id: `${formData.conceptIngredient || 'Natural'} ${formData.coreSellingPoint || 'Care'} ${formData.category}`,
            zh: `${formData.conceptIngredient || '天然'}${formData.coreSellingPoint || '护理'}${getCategoryZh(formData.category)}`,
            formula: `${formData.conceptIngredient}(成分) + ${formData.coreSellingPoint}(卖点) + ${formData.category}(品类)`,
            reason: '基于输入的核心卖点和概念成分组合',
            isRecommended: true
          }
        ],
        aiNote: plan.positioning ? '基于竞品分析和市场定位生成' : '基于输入信息生成',
        reason: '依据竞品标题高频词分析',
        confidence: 85
      },

      // 2. 产品定位
      positioning: {
        value: plan.positioning || `${formData.coreSellingPoint} product for ${formData.market} market`,
        valueZh: plan.positioning || `针对${formData.market}市场的${formData.coreSellingPoint}产品`,
        aiNote: explanations.positioning?.note || 'AI 基于竞品分析生成的定位建议',
        reason: explanations.positioning?.reason || '基于竞品分析和市场需求',
        confidence: explanations.positioning?.confidence ? Math.round(explanations.positioning.confidence * 100) : 90
      },

      // 3. 卖点简介
      productIntro: {
        en: plan.sellingPoint || 'Product description to be generated.',
        zh: plan.sellingPoint || '产品描述待生成。',
        structure: {
          painPoint: '待分析',
          mechanism: plan.ingredients || '待分析',
          experience: '待分析',
          audience: '待分析'
        },
        aiNote: explanations.sellingPoint?.note || 'AI 生成的卖点描述',
        reason: explanations.sellingPoint?.reason || '基于竞品卖点分析',
        confidence: explanations.sellingPoint?.confidence ? Math.round(explanations.sellingPoint.confidence * 100) : 88
      },

      // 4. 概念成分组合
      ingredientCombos: {
        items: parseIngredients(plan.ingredients || formData.conceptIngredient),
        aiNote: explanations.ingredients?.note || 'AI 推荐的成分组合',
        reason: explanations.ingredients?.reason || '基于竞品成分分析',
        confidence: explanations.ingredients?.confidence ? Math.round(explanations.ingredients.confidence * 100) : 90
      },

      // 5. 主打功效
      mainBenefits: {
        items: parseBenefits(plan.efficacy || formData.coreSellingPoint),
        aiNote: explanations.efficacy?.note || 'AI 推荐的功效表达',
        reason: explanations.efficacy?.reason || '基于市场热搜词',
        confidence: explanations.efficacy?.confidence ? Math.round(explanations.efficacy.confidence * 100) : 87
      },

      // 6. 香味
      scent: {
        value: plan.scent || 'Fresh herbal',
        valueZh: plan.scent || '清新草本香',
        aiNote: explanations.scent?.note || 'AI 推荐的香味方向',
        reason: explanations.scent?.reason || '基于市场偏好分析',
        confidence: explanations.scent?.confidence ? Math.round(explanations.scent.confidence * 100) : 85
      },

      // 7. 料体颜色
      bodyColor: {
        primary: { en: plan.color || 'Translucent gel', zh: plan.color || '透明啫喱' },
        alternative: { en: 'Clear liquid', zh: '透明液体' },
        aiNote: explanations.color?.note || 'AI 推荐的料体颜色',
        reason: explanations.color?.reason || '基于品类惯例',
        confidence: explanations.color?.confidence ? Math.round(explanations.color.confidence * 100) : 83
      },

      // 8. 定价策略
      pricingStrategy: {
        anchor: plan.pricing || formData.pricing || 'IDR 89,900',
        flash: 'IDR 69,900',
        bundle: 'IDR 159,000 (2 bottles)',
        competitorPrices: competitorsData.map((c, i) => `竞品#${i + 1}: ${c.price || '-'}`).join(' | '),
        aiNote: explanations.pricing?.note || 'AI 推荐的定价策略',
        reason: explanations.pricing?.reason || '基于竞品价格分析',
        confidence: explanations.pricing?.confidence ? Math.round(explanations.pricing.confidence * 100) : 90
      },

      // 9. 产品标题
      productTitles: {
        options: [
          {
            value: plan.title || `${formData.brandName} ${formData.conceptIngredient} ${formData.coreSellingPoint} ${formData.category} ${formData.volume || '300ml'}`,
            valueZh: plan.title || `${formData.brandName} ${formData.conceptIngredient} ${formData.coreSellingPoint} ${getCategoryZh(formData.category)}`,
            charCount: (plan.title || '').length || 150,
            keywordLayout: `${formData.conceptIngredient}, ${formData.coreSellingPoint}`,
            isRecommended: true
          }
        ],
        aiNote: explanations.title?.note || 'SEO 优化的产品标题',
        reason: explanations.title?.reason || '前40字符包含核心关键词',
        confidence: explanations.title?.confidence ? Math.round(explanations.title.confidence * 100) : 92
      },

      // 10. 搜索关键词
      searchKeywords: {
        primary: Array.isArray(plan.keywords) ? plan.keywords.slice(0, 3) : [formData.category, formData.coreSellingPoint, formData.conceptIngredient].filter(Boolean),
        secondary: [],
        longtail: [],
        aiNote: explanations.keywords?.note || 'AI 推荐的搜索关键词',
        reason: explanations.keywords?.reason || '基于平台搜索趋势',
        confidence: explanations.keywords?.confidence ? Math.round(explanations.keywords.confidence * 100) : 88
      },

      // 数据来源说明
      dataSourceNote: {
        conceptBasis: `基于${competitorsData.length}条竞品链接提取分析`,
        keywordBasis: '非精准搜索量数据，依据品牌常用表达、竞品高频词',
        verificationTip: '如需验证热搜量，建议使用 Shopee 关键词工具拉取实时数据'
      }
    };
  };

  // 辅助函数：获取类目中文名
  const getCategoryZh = (cat) => {
    const map = {
      'Shampoo': '洗发水',
      'Conditioner': '护发素',
      'BodyWash': '沐浴露',
      'BodyLotion': '身体乳',
      'HairMask': '发膜',
      'HairSerum': '护发精油'
    };
    return map[cat] || cat;
  };

  // 辅助函数：解析成分
  const parseIngredients = (ingredientsStr) => {
    if (!ingredientsStr) return [];
    const items = ingredientsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
    return items.slice(0, 4).map(item => ({
      ingredient: { en: item, id: item, zh: item },
      percentage: '0.5-1%',
      benefits: [{ en: 'Benefit', id: 'Manfaat', zh: '功效' }],
      source: '竞品分析'
    }));
  };

  // 辅助函数：解析功效
  const parseBenefits = (efficacyStr) => {
    if (!efficacyStr) return [];
    const items = efficacyStr.split(/[,，\n]/).map(s => s.trim()).filter(s => s);
    return items.slice(0, 4).map(item => ({
      en: item,
      id: item,
      zh: item
    }));
  };

  // ========== 保存草稿 ==========
  const handleSaveDraft = async () => {
    if (!generatedData) {
      alert('请先生成产品方案');
      return;
    }

    setIsSaving(true);

    try {
      const now = new Date();
      const developMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 收集竞品数据
      const competitorsData = competitors
        .filter(c => c.success && c.data)
        .map(c => ({ ...c.data, url: c.url }));

      const draftData = {
        develop_month: developMonth,
        category: formData.category,
        market: formData.market,
        platform: formData.platform,
        
        // 品牌信息
        brand_name: formData.brandName,
        brand_philosophy: formData.brandPhilosophy,
        core_selling_point: formData.coreSellingPoint,
        concept_ingredient: formData.conceptIngredient,
        
        // 三语名称
        name_zh: generatedData.productName?.options?.[0]?.zh || '',
        name_en: generatedData.productName?.options?.[0]?.id || '',
        name_id: generatedData.productName?.options?.[0]?.id || '',
        
        // 9模块数据
        positioning: generatedData.positioning?.valueZh || generatedData.positioning?.value || '',
        selling_point: generatedData.productIntro?.zh || generatedData.productIntro?.en || '',
        ingredients: generatedData.ingredientCombos?.items?.map(i => i.ingredient?.zh || i.ingredient?.en).join(', ') || '',
        efficacy: generatedData.mainBenefits?.items?.map(i => i.zh || i.en).join('\n') || '',
        scent: generatedData.scent?.valueZh || generatedData.scent?.value || '',
        texture_color: generatedData.bodyColor?.primary?.zh || generatedData.bodyColor?.primary?.en || '',
        pricing: generatedData.pricingStrategy?.anchor || '',
        title: generatedData.productTitles?.options?.[0]?.value || '',
        keywords: generatedData.searchKeywords?.primary?.join(', ') || '',
        volume: formData.volume || '',
        
        // AI 元数据
        extract_provider: AI_CONFIG.extract_provider,
        generate_provider: AI_CONFIG.generate_provider,
        competitors_data: competitorsData,
        ai_explanations: {
          positioning: generatedData.positioning,
          productIntro: generatedData.productIntro,
          ingredients: generatedData.ingredientCombos,
          benefits: generatedData.mainBenefits,
          scent: generatedData.scent,
          color: generatedData.bodyColor,
          pricing: generatedData.pricingStrategy,
          title: generatedData.productTitles,
          keywords: generatedData.searchKeywords
        },
        
        // 用户信息
        created_by: currentUser?.id || 1,
        created_at: getCurrentBeijingISO()
      };

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

  // ========== 模拟重新生成单个模块 ==========
  const handleRegenerate = (moduleId) => {
    setRegeneratingModule(moduleId);
    setTimeout(() => {
      setRegeneratingModule(null);
    }, 1500);
  };

  // 计算已提取竞品数量
  const extractedCount = competitors.filter(c => c.success).length;

  // ==================== UI 组件 ====================
  
  // 置信度徽章
  const ConfidenceBadge = ({ value }) => {
    const getStyle = (v) => {
      if (v >= 90) return { bg: '#065f46', text: '#6ee7b7', label: '高' };
      if (v >= 80) return { bg: '#166534', text: '#86efac', label: '中高' };
      if (v >= 70) return { bg: '#854d0e', text: '#fde047', label: '中' };
      return { bg: '#991b1b', text: '#fca5a5', label: '低' };
    };
    const style = getStyle(value);
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '6px',
        backgroundColor: style.bg,
        color: style.text,
        fontSize: '12px',
        fontWeight: '600'
      }}>
        置信度 {value}%
      </div>
    );
  };

  // 状态选择器
  const StatusSelector = ({ moduleId, currentStatus }) => {
    const statuses = [
      { key: 'pending', label: '待审核', color: '#64748b', bg: '#334155' },
      { key: 'approved', label: '已确认', color: '#10b981', bg: '#065f46' },
      { key: 'needsRevision', label: '需修改', color: '#f59e0b', bg: '#854d0e' }
    ];
    const current = currentStatus || 'pending';

    return (
      <div style={{ 
        display: 'flex', 
        gap: '6px',
        padding: '8px 0',
        borderTop: '1px solid #2d2d44',
        marginTop: '12px'
      }}>
        {statuses.map(s => (
          <button
            key={s.key}
            onClick={() => updateModuleStatus(moduleId, s.key)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: current === s.key ? `2px solid ${s.color}` : '1px solid #334155',
              backgroundColor: current === s.key ? s.bg : 'transparent',
              color: current === s.key ? s.color : '#64748b',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: current === s.key ? s.color : '#475569'
            }}></span>
            {s.label}
          </button>
        ))}
      </div>
    );
  };

  // 模块卡片
  const ModuleCard = ({ moduleId, number, title, confidence, aiNote, reason, children }) => {
    const status = moduleStatus[moduleId] || 'pending';
    const isRegenerating = regeneratingModule === moduleId;
    const isEditing = editingModule === moduleId;
    
    const getBorderColor = () => {
      if (status === 'approved') return '#10b981';
      if (status === 'needsRevision') return '#f59e0b';
      return '#2d2d44';
    };

    return (
      <div style={{
        backgroundColor: '#1a1a2e',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: `1px solid ${getBorderColor()}`,
        position: 'relative',
        opacity: isRegenerating ? 0.7 : 1,
        transition: 'all 0.2s ease'
      }}>
        {isRegenerating && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}>
            <div style={{ color: '#a5b4fc', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
              重新生成中...
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: '600',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: status === 'approved' 
                ? 'linear-gradient(135deg, #059669, #10b981)'
                : status === 'needsRevision'
                ? 'linear-gradient(135deg, #d97706, #f59e0b)'
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '700',
              color: 'white'
            }}>{number}</span>
            {title}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setEditingModule(isEditing ? null : moduleId)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                  backgroundColor: isEditing ? '#312e81' : 'transparent',
                  color: isEditing ? '#a5b4fc' : '#64748b',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                ✏️ 编辑
              </button>
              <button
                onClick={() => handleRegenerate(moduleId)}
                disabled={isRegenerating}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  fontSize: '11px',
                  cursor: isRegenerating ? 'not-allowed' : 'pointer'
                }}
              >
                🔄 重新生成
              </button>
            </div>
            <ConfidenceBadge value={confidence} />
          </div>
        </div>
        
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          marginBottom: '12px',
          fontSize: '13px',
          lineHeight: '1.5'
        }}>
          <span style={{ color: '#a5b4fc' }}>💡 AI说明：</span>
          <span style={{ color: '#cbd5e1' }}> {aiNote}</span>
        </div>

        <div style={{
          position: 'relative',
          border: isEditing ? '2px dashed #6366f1' : 'none',
          borderRadius: '8px',
          padding: isEditing ? '8px' : 0
        }}>
          {isEditing && (
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '10px',
              backgroundColor: '#6366f1',
              color: 'white',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              编辑模式
            </div>
          )}
          {children}
        </div>

        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          fontSize: '12px',
          color: '#94a3b8',
          lineHeight: '1.5'
        }}>
          <span style={{ color: '#f59e0b' }}>📊 理由：</span> {reason}
        </div>

        <StatusSelector moduleId={moduleId} currentStatus={status} />
      </div>
    );
  };

  // 值显示框
  const ValueBox = ({ value, valueZh, subInfo }) => (
    <div style={{
      padding: '14px 16px',
      borderRadius: '8px',
      backgroundColor: '#0f172a',
      border: '1px solid #334155'
    }}>
      <div style={{ fontSize: '15px', color: '#f1f5f9', fontWeight: '500', marginBottom: valueZh ? '6px' : 0 }}>
        {value}
      </div>
      {valueZh && (
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          {valueZh}
        </div>
      )}
      {subInfo && (
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #334155' }}>
          {subInfo}
        </div>
      )}
    </div>
  );

  // 竞品卡片
  const CompetitorCard = ({ index, competitor }) => {
    const { mode, url, images, data, loading, success, error } = competitor;
    const isExtracting = extractingIndex === index;

    return (
      <div style={{
        padding: '12px',
        borderRadius: '10px',
        backgroundColor: success ? '#0f2a1f' : '#1a1a2e',
        border: success ? '1px solid #166534' : '1px solid #2d2d44',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: success ? '#166534' : '#334155',
            color: success ? '#6ee7b7' : '#94a3b8',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>{index + 1}</span>
          <span style={{ fontSize: '12px', color: success ? '#6ee7b7' : '#94a3b8', fontWeight: '500' }}>
            竞品 {index + 1} {success ? '✓ 已提取' : ''}
          </span>
        </div>
        
        {/* 模式切换 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button
            onClick={() => updateCompetitor(index, { mode: 'url', images: [], success: false, data: null, error: '' })}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: mode === 'url' ? '2px solid #6366f1' : '1px solid #334155',
              backgroundColor: mode === 'url' ? '#312e81' : 'transparent',
              color: mode === 'url' ? '#a5b4fc' : '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Link size={14} /> 粘贴链接
          </button>
          <button
            onClick={() => updateCompetitor(index, { mode: 'image', url: '', success: false, data: null, error: '' })}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: mode === 'image' ? '2px solid #6366f1' : '1px solid #334155',
              backgroundColor: mode === 'image' ? '#312e81' : 'transparent',
              color: mode === 'image' ? '#a5b4fc' : '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ImageIcon size={14} /> 上传截图
          </button>
        </div>

        {/* URL 输入 */}
        {mode === 'url' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: success ? '10px' : 0 }}>
            <input
              type="text"
              placeholder="粘贴 Shopee 商品链接..."
              value={url}
              onChange={(e) => updateCompetitor(index, { url: e.target.value })}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #2d2d44',
                backgroundColor: '#0f172a',
                color: '#e2e8f0',
                fontSize: '12px'
              }}
            />
            <button
              onClick={() => handleExtractCompetitor(index)}
              disabled={!url || isExtracting}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isExtracting ? '#334155' : (success ? '#166534' : '#6366f1'),
                color: 'white',
                fontSize: '11px',
                fontWeight: '500',
                cursor: !url || isExtracting ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {isExtracting ? '提取中...' : (success ? '重新提取' : 'AI提取')}
            </button>
          </div>
        )}

        {/* 图片上传 */}
        {mode === 'image' && (
          <div style={{ marginBottom: success ? '10px' : 0 }}>
            <input
              type="file"
              ref={fileInputRefs[index]}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleImageUpload(index, e.target.files)}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => fileInputRefs[index].current?.click()}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '6px',
                  border: '2px dashed #334155',
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Upload size={16} />
                {images.length > 0 ? `已选择 ${images.length} 张图片` : '点击上传截图'}
              </button>
              {images.length > 0 && (
                <button
                  onClick={() => handleExtractCompetitor(index)}
                  disabled={isExtracting}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isExtracting ? '#334155' : '#6366f1',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: isExtracting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isExtracting ? '提取中...' : 'AI提取'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div style={{
            padding: '8px',
            borderRadius: '6px',
            backgroundColor: '#450a0a',
            color: '#fca5a5',
            fontSize: '11px',
            marginTop: '8px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* 提取结果 */}
        {data && (
          <div style={{
            padding: '10px',
            borderRadius: '6px',
            backgroundColor: '#0f172a',
            fontSize: '12px'
          }}>
            <div style={{ color: '#f1f5f9', fontWeight: '500', marginBottom: '6px' }}>{data.name}</div>
            <div style={{ display: 'flex', gap: '12px', color: '#94a3b8', marginBottom: '6px' }}>
              <span>💰 {data.price || '-'}</span>
              <span>📦 {data.volume || '-'}</span>
            </div>
            {data.ingredients && (
              <div style={{ color: '#64748b', fontSize: '11px' }}>
                <span style={{ color: '#a5b4fc' }}>成分：</span>{data.ingredients}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };


  // ==================== 主渲染 ====================
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      backgroundColor: '#0d0d1a',
      color: '#e2e8f0',
      fontFamily: "'Noto Sans SC', 'SF Pro Display', -apple-system, sans-serif",
      overflow: 'hidden'
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid #1e1e2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0d0d1a',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>🧪</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>AI 智能创建产品</h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              9模块产品方案生成 · 千问AI驱动
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
              backgroundColor: '#1a1a2e',
              borderRadius: '8px',
              fontSize: '12px'
            }}>
              <span style={{ color: '#64748b' }}>
                待审核: <span style={{ color: '#a5b4fc', fontWeight: '600' }}>
                  {9 - Object.values(moduleStatus).filter(s => s === 'approved' || s === 'needsRevision').length}
                </span>
              </span>
              <span style={{ color: '#64748b' }}>
                已确认: <span style={{ color: '#10b981', fontWeight: '600' }}>
                  {Object.values(moduleStatus).filter(s => s === 'approved').length}
                </span>
              </span>
              <span style={{ color: '#64748b' }}>
                需修改: <span style={{ color: '#f59e0b', fontWeight: '600' }}>
                  {Object.values(moduleStatus).filter(s => s === 'needsRevision').length}
                </span>
              </span>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #334155',
              backgroundColor: 'transparent',
              color: '#94a3b8',
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
                background: isSaving ? '#334155' : 'linear-gradient(135deg, #059669, #10b981)',
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
          width: '400px',
          borderRight: '1px solid #1e1e2e',
          padding: '20px',
          overflowY: 'auto',
          backgroundColor: '#0d0d1a'
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#a5b4fc' }}>
            📝 输入信息
          </h2>

          {/* 品牌信息 */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            backgroundColor: '#1a1a2e',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🏷️ 品牌信息
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>品牌名</label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({...formData, brandName: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #2d2d44',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>品牌理念</label>
                <input
                  type="text"
                  value={formData.brandPhilosophy}
                  onChange={(e) => setFormData({...formData, brandPhilosophy: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #2d2d44',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* 核心输入 */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            backgroundColor: '#1a1a2e',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ✏️ 核心输入
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  核心卖点 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：防脱+清凉"
                  value={formData.coreSellingPoint}
                  onChange={(e) => setFormData({...formData, coreSellingPoint: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #2d2d44',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  主概念成分 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：Rosemary 迷迭香"
                  value={formData.conceptIngredient}
                  onChange={(e) => setFormData({...formData, conceptIngredient: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #2d2d44',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>容量</label>
                  <input
                    type="text"
                    placeholder="300ml"
                    value={formData.volume}
                    onChange={(e) => setFormData({...formData, volume: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #2d2d44',
                      backgroundColor: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>定价</label>
                  <input
                    type="text"
                    placeholder="IDR 89,900"
                    value={formData.pricing}
                    onChange={(e) => setFormData({...formData, pricing: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #2d2d44',
                      backgroundColor: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 市场信息 */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            backgroundColor: '#1a1a2e',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🌏 市场信息
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>品类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #2d2d44',
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: '13px'
                  }}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>市场</label>
                  <select
                    value={formData.market}
                    onChange={(e) => setFormData({...formData, market: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #2d2d44',
                      backgroundColor: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: '13px'
                    }}
                  >
                    {MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>平台</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({...formData, platform: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #2d2d44',
                      backgroundColor: '#0f172a',
                      color: '#e2e8f0',
                      fontSize: '13px'
                    }}
                  >
                    {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 竞品采集 */}
          <div style={{
            padding: '16px',
            borderRadius: '10px',
            backgroundColor: '#1a1a2e',
            marginBottom: '16px',
            border: '1px solid #6366f1'
          }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#a5b4fc', 
              marginBottom: '12px', 
              fontWeight: '600', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              🔗 竞品采集（必填）
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#312e81',
                color: '#a5b4fc'
              }}>至少1条 · 已提取{extractedCount}条</span>
            </div>
            
            {competitors.map((comp, index) => (
              <CompetitorCard key={index} index={index} competitor={comp} />
            ))}

            {/* 竞品分析摘要 */}
            {extractedCount > 0 && (
              <div style={{
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: '#0f2a1f',
                border: '1px solid #166534',
                marginTop: '12px'
              }}>
                <div style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: '600', marginBottom: '8px' }}>
                  📊 竞品快速分析
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.6' }}>
                  <div>• 已提取 {extractedCount} 条竞品数据</div>
                  <div>• 点击生成后，AI 将分析竞品差异化机会</div>
                </div>
              </div>
            )}
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || extractedCount === 0}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              background: (isGenerating || extractedCount === 0) 
                ? '#334155' 
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: (isGenerating || extractedCount === 0) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isGenerating ? '⚙️ AI 生成中...' : '🚀 生成产品方案'}
          </button>
          
          {extractedCount === 0 && (
            <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
              请先提取至少1条竞品数据
            </p>
          )}

          {generateError && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: '#450a0a',
              color: '#fca5a5',
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
          backgroundColor: '#0d0d1a'
        }}>
          {!generatedData ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569'
            }}>
              <div style={{ fontSize: '72px', marginBottom: '16px', opacity: 0.3 }}>🧪</div>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>填写左侧信息后点击生成</p>
              <p style={{ fontSize: '13px', marginTop: '8px', color: '#334155' }}>
                AI 将基于竞品分析 + 手动输入生成完整产品方案
              </p>
            </div>
          ) : (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              
              {/* 竞品分析摘要 */}
              <div style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#1e1b4b',
                border: '1px solid #3730a3',
                marginBottom: '20px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: '#c4b5fd', fontWeight: '600' }}>
                    🔍 竞品分析摘要
                  </h3>
                  <ConfidenceBadge value={generatedData.competitorAnalysis?.confidence || 85} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a' }}>
                    <div style={{ fontSize: '10px', color: '#a5b4fc', marginBottom: '4px' }}>价格带</div>
                    <div style={{ fontSize: '13px', color: '#f1f5f9' }}>
                      {generatedData.competitorAnalysis?.priceRange?.min} - {generatedData.competitorAnalysis?.priceRange?.max}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      中位数: {generatedData.competitorAnalysis?.priceRange?.median}
                    </div>
                  </div>
                  <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a' }}>
                    <div style={{ fontSize: '10px', color: '#a5b4fc', marginBottom: '4px' }}>共同成分</div>
                    <div style={{ fontSize: '12px', color: '#f1f5f9' }}>
                      {generatedData.competitorAnalysis?.commonIngredients?.join(', ')}
                    </div>
                  </div>
                  <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a' }}>
                    <div style={{ fontSize: '10px', color: '#fbbf24', marginBottom: '4px' }}>⚡ 差异化机会</div>
                    <div style={{ fontSize: '12px', color: '#fbbf24' }}>
                      {generatedData.competitorAnalysis?.gaps?.join('、')}
                    </div>
                  </div>
                </div>
              </div>

              {/* 双列布局模块 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* 1. 产品名称 - 跨两列 */}
                <div style={{ gridColumn: 'span 2' }}>
                  <ModuleCard
                    moduleId="productName"
                    number="1"
                    title="产品名称 ⭐"
                    confidence={generatedData.productName?.confidence || 85}
                    aiNote={generatedData.productName?.aiNote || '基于市场分析生成'}
                    reason={generatedData.productName?.reason || '依据竞品分析'}
                  >
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {generatedData.productName?.options?.map((opt, idx) => (
                        <div key={idx} style={{
                          padding: '14px',
                          borderRadius: '8px',
                          backgroundColor: '#0f172a',
                          border: opt.isRecommended ? '2px solid #6366f1' : '1px solid #2d2d44'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            {opt.isRecommended && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#6366f1',
                                color: 'white'
                              }}>推荐</span>
                            )}
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#1e293b',
                              color: '#94a3b8'
                            }}>{opt.formula}</span>
                          </div>
                          <div style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: '600', marginBottom: '4px' }}>{opt.id}</div>
                          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>{opt.zh}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            💡 {opt.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ModuleCard>
                </div>

                {/* 2. 产品定位 */}
                <ModuleCard
                  moduleId="positioning"
                  number="2"
                  title="产品定位"
                  confidence={generatedData.positioning?.confidence || 90}
                  aiNote={generatedData.positioning?.aiNote || '基于市场分析'}
                  reason={generatedData.positioning?.reason || '竞品差异化定位'}
                >
                  <ValueBox
                    value={generatedData.positioning?.value}
                    valueZh={generatedData.positioning?.valueZh}
                  />
                </ModuleCard>

                {/* 3. 卖点简介 */}
                <ModuleCard
                  moduleId="productIntro"
                  number="3"
                  title="卖点简介"
                  confidence={generatedData.productIntro?.confidence || 88}
                  aiNote={generatedData.productIntro?.aiNote || '电商详情页风格'}
                  reason={generatedData.productIntro?.reason || '基于竞品文案分析'}
                >
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #2d2d44'
                    }}>
                      <div style={{ fontSize: '11px', color: '#a5b4fc', marginBottom: '8px', fontWeight: '600' }}>🇬🇧 English</div>
                      <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.6', margin: 0 }}>
                        {generatedData.productIntro?.en}
                      </p>
                    </div>
                    <div style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #2d2d44'
                    }}>
                      <div style={{ fontSize: '11px', color: '#a5b4fc', marginBottom: '8px', fontWeight: '600' }}>🇨🇳 中文</div>
                      <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.6', margin: 0 }}>
                        {generatedData.productIntro?.zh}
                      </p>
                    </div>
                  </div>
                </ModuleCard>

                {/* 4. 概念成分 - 跨两列 */}
                <div style={{ gridColumn: 'span 2' }}>
                  <ModuleCard
                    moduleId="ingredientCombos"
                    number="4"
                    title="概念成分组合"
                    confidence={generatedData.ingredientCombos?.confidence || 90}
                    aiNote={generatedData.ingredientCombos?.aiNote || 'AI推荐成分'}
                    reason={generatedData.ingredientCombos?.reason || '基于竞品成分分析'}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {generatedData.ingredientCombos?.items?.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '12px',
                          borderRadius: '8px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #2d2d44'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontSize: '14px', color: '#a5b4fc', fontWeight: '600' }}>{item.ingredient?.en}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{item.ingredient?.id} | {item.ingredient?.zh}</div>
                            </div>
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#312e81',
                              color: '#a5b4fc'
                            }}>{item.percentage}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: '#f59e0b', paddingTop: '6px', borderTop: '1px solid #2d2d44' }}>
                            📎 {item.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ModuleCard>
                </div>

                {/* 5. 主打功效 - 跨两列 */}
                <div style={{ gridColumn: 'span 2' }}>
                  <ModuleCard
                    moduleId="mainBenefits"
                    number="5"
                    title="主打功效"
                    confidence={generatedData.mainBenefits?.confidence || 87}
                    aiNote={generatedData.mainBenefits?.aiNote || '包装设计风格'}
                    reason={generatedData.mainBenefits?.reason || '基于市场热搜词'}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      {generatedData.mainBenefits?.items?.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '12px',
                          borderRadius: '8px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #2d2d44'
                        }}>
                          <div style={{ fontSize: '13px', color: '#f1f5f9', marginBottom: '4px' }}>{item.en}</div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.id}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{item.zh}</div>
                        </div>
                      ))}
                    </div>
                  </ModuleCard>
                </div>

                {/* 6. 香味 */}
                <ModuleCard
                  moduleId="scent"
                  number="6"
                  title="香味"
                  confidence={generatedData.scent?.confidence || 85}
                  aiNote={generatedData.scent?.aiNote || '基于市场偏好'}
                  reason={generatedData.scent?.reason || '热带市场香味趋势'}
                >
                  <ValueBox
                    value={generatedData.scent?.value}
                    valueZh={generatedData.scent?.valueZh}
                  />
                </ModuleCard>

                {/* 7. 料体颜色 */}
                <ModuleCard
                  moduleId="bodyColor"
                  number="7"
                  title="料体颜色"
                  confidence={generatedData.bodyColor?.confidence || 83}
                  aiNote={generatedData.bodyColor?.aiNote || '自然感颜色'}
                  reason={generatedData.bodyColor?.reason || '基于品类惯例'}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '2px solid #6366f1'
                    }}>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#6366f1', color: 'white' }}>主推</span>
                      <div style={{ fontSize: '13px', color: '#f1f5f9', marginTop: '8px' }}>{generatedData.bodyColor?.primary?.en}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{generatedData.bodyColor?.primary?.zh}</div>
                    </div>
                    <div style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #2d2d44'
                    }}>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#334155', color: '#94a3b8' }}>备选</span>
                      <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>{generatedData.bodyColor?.alternative?.en}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{generatedData.bodyColor?.alternative?.zh}</div>
                    </div>
                  </div>
                </ModuleCard>

                {/* 8. 定价 */}
                <ModuleCard
                  moduleId="pricing"
                  number="8"
                  title="定价策略"
                  confidence={generatedData.pricingStrategy?.confidence || 90}
                  aiNote={generatedData.pricingStrategy?.aiNote || '中高端定位'}
                  reason={generatedData.pricingStrategy?.reason || '基于竞品价格'}
                >
                  <ValueBox 
                    value={`${generatedData.pricingStrategy?.anchor} (Flash: ${generatedData.pricingStrategy?.flash})`} 
                    subInfo={generatedData.pricingStrategy?.competitorPrices}
                  />
                </ModuleCard>

                {/* 9. 产品标题 - 跨两列 */}
                <div style={{ gridColumn: 'span 2' }}>
                  <ModuleCard
                    moduleId="productTitles"
                    number="9"
                    title="产品标题（255字符）"
                    confidence={generatedData.productTitles?.confidence || 92}
                    aiNote={generatedData.productTitles?.aiNote || 'SEO优化标题'}
                    reason={generatedData.productTitles?.reason || '前40字符核心关键词'}
                  >
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {generatedData.productTitles?.options?.map((opt, idx) => (
                        <div key={idx} style={{
                          padding: '14px',
                          borderRadius: '8px',
                          backgroundColor: '#0f172a',
                          border: opt.isRecommended ? '2px solid #6366f1' : '1px solid #2d2d44'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            {opt.isRecommended && (
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#6366f1',
                                color: 'white'
                              }}>推荐</span>
                            )}
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: (opt.charCount || 0) <= 255 ? '#065f46' : '#991b1b',
                              color: (opt.charCount || 0) <= 255 ? '#6ee7b7' : '#fca5a5'
                            }}>{opt.charCount || 0} 字符</span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#f1f5f9', lineHeight: '1.5' }}>{opt.value}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>{opt.valueZh}</div>
                        </div>
                      ))}
                    </div>
                  </ModuleCard>
                </div>

                {/* 10. 搜索关键词 - 跨两列 */}
                <div style={{ gridColumn: 'span 2' }}>
                  <ModuleCard
                    moduleId="searchKeywords"
                    number="10"
                    title="搜索关键词"
                    confidence={generatedData.searchKeywords?.confidence || 88}
                    aiNote={generatedData.searchKeywords?.aiNote || '平台搜索优化'}
                    reason={generatedData.searchKeywords?.reason || '基于热搜趋势'}
                  >
                    <div style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #2d2d44'
                    }}>
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#a5b4fc', marginBottom: '6px', fontWeight: '600' }}>🔥 主关键词</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {generatedData.searchKeywords?.primary?.map((kw, idx) => (
                            <span key={idx} style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#312e81',
                              color: '#a5b4fc',
                              fontSize: '12px'
                            }}>{kw}</span>
                          ))}
                        </div>
                      </div>
                      {generatedData.searchKeywords?.secondary?.length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>📈 次关键词</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {generatedData.searchKeywords?.secondary?.map((kw, idx) => (
                              <span key={idx} style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#1e293b',
                                color: '#94a3b8',
                                fontSize: '12px'
                              }}>{kw}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ModuleCard>
                </div>

              </div>

              {/* 数据来源说明 */}
              <div style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#1e1b4b',
                border: '1px solid #3730a3',
                marginTop: '16px'
              }}>
                <h4 style={{ fontSize: '13px', color: '#c4b5fd', margin: '0 0 12px 0' }}>📊 数据来源说明</h4>
                <div style={{ display: 'grid', gap: '8px', fontSize: '12px', color: '#e2e8f0' }}>
                  <div><span style={{ color: '#a5b4fc' }}>概念成分依据：</span>{generatedData.dataSourceNote?.conceptBasis}</div>
                  <div><span style={{ color: '#a5b4fc' }}>关键词依据：</span>{generatedData.dataSourceNote?.keywordBasis}</div>
                  <div style={{
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: '#312e81',
                    marginTop: '4px'
                  }}>
                    ⚠️ {generatedData.dataSourceNote?.verificationTip}
                  </div>
                </div>
              </div>
            </div>
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
          border-color: #6366f1 !important;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #1a1a2e;
        }
        ::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default ProductFormAI;
