// src/components/ai-create/utils.js
// AI 创建产品 - 工具函数

// 文件转 base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 超时包装
export const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), ms))
  ]);
};

// 解析成分
export const parseIngredients = (ingredientsStr) => {
  if (!ingredientsStr) return [];
  const items = ingredientsStr.split(/[,，]/).map(s => s.trim()).filter(s => s);
  return items.slice(0, 4).map(item => ({
    ingredient: { en: item, id: item, zh: item },
    percentage: '0.5-1%',
    benefits: [{ en: 'Benefit', id: 'Manfaat', zh: '功效' }],
    source: '竞品分析'
  }));
};

// 解析功效
export const parseBenefits = (efficacyStr) => {
  if (!efficacyStr) return [];
  const items = efficacyStr.split(/[,，\n]/).map(s => s.trim()).filter(s => s);
  return items.slice(0, 4).map(item => ({
    en: item,
    id: item,
    zh: item
  }));
};

// 格式化生成数据为 UI 需要的结构
export const formatGeneratedData = (plan, explanations, competitorsData, formData) => {
  // 如果后端已返回完整格式，直接使用
  if (plan.productName && plan.positioning && plan.productIntro) {
    console.log('✅ 使用后端返回的完整数据结构');
    return {
      ...plan,
      dataSourceNote: plan.dataSourceNote || {
        conceptBasis: `基于${competitorsData.length}条竞品链接提取分析`,
        keywordBasis: '非精准搜索量数据，依据品牌常用表达、竞品高频词',
        verificationTip: '如需验证热搜量，建议用 Shopee 关键词工具拉数'
      }
    };
  }

  // 兼容旧格式
  console.log('⚠️ 使用兼容模式转换数据');
  
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
    competitorAnalysis: {
      priceRange: { 
        min: minPrice ? `IDR ${minPrice.toLocaleString()}` : '-', 
        max: maxPrice ? `IDR ${maxPrice.toLocaleString()}` : '-', 
        median: medianPrice ? `IDR ${medianPrice.toLocaleString()}` : '-'
      },
      commonIngredients: uniqueIngredients.length > 0 ? uniqueIngredients : ['未提取到成分'],
      gaps: ['待分析差异化机会'],
      confidence: 85
    },
    productName: {
      options: [{
        id: plan.title || `${formData.conceptIngredient} ${formData.coreSellingPoint} ${formData.category}`,
        zh: plan.title || '产品名称',
        formula: '成分 + 卖点 + 品类',
        reason: '基于输入信息生成',
        isRecommended: true
      }],
      aiNote: '基于竞品分析生成',
      reason: '依据竞品标题高频词分析',
      confidence: 85
    },
    positioning: {
      value: plan.positioning || '',
      valueZh: plan.positioning || '',
      aiNote: explanations?.positioning?.note || 'AI 定位建议',
      reason: explanations?.positioning?.reason || '基于竞品分析',
      confidence: Math.round((explanations?.positioning?.confidence || 0.9) * 100)
    },
    productIntro: {
      en: plan.sellingPoint || '',
      zh: plan.sellingPoint || '',
      structure: { painPoint: '', mechanism: '', experience: '', audience: '' },
      aiNote: 'AI 生成的卖点描述',
      reason: '基于竞品卖点分析',
      confidence: 88
    },
    ingredientCombos: {
      items: parseIngredients(plan.ingredients || formData.conceptIngredient),
      aiNote: 'AI 推荐的成分组合',
      reason: '基于竞品成分分析',
      confidence: 90
    },
    mainBenefits: {
      items: parseBenefits(plan.efficacy || formData.coreSellingPoint),
      aiNote: 'AI 推荐的功效表达',
      reason: '基于市场热搜词',
      confidence: 87
    },
    scent: {
      value: plan.scent || 'Fresh herbal',
      valueZh: plan.scent || '清新草本香',
      aiNote: 'AI 推荐的香味方向',
      reason: '基于市场偏好分析',
      confidence: 85
    },
    bodyColor: {
      primary: { en: plan.color || 'Translucent gel', zh: plan.color || '透明啫喱' },
      alternative: { en: 'Clear liquid', zh: '透明液体' },
      aiNote: 'AI 推荐的料体颜色',
      reason: '基于品类惯例',
      confidence: 83
    },
    pricingStrategy: {
      anchor: plan.pricing || formData.pricing || 'IDR 89,900',
      flash: 'IDR 69,900',
      bundle: 'IDR 159,000 (2 bottles)',
      competitorPrices: competitorsData.map((c, i) => `竞品#${i + 1}: ${c.price || '-'}`).join(' | '),
      aiNote: 'AI 推荐的定价策略',
      reason: '基于竞品价格分析',
      confidence: 90
    },
    productTitles: {
      options: [{
        value: plan.title || '',
        valueZh: plan.title || '',
        charCount: (plan.title || '').length,
        keywordLayout: `${formData.conceptIngredient}, ${formData.coreSellingPoint}`,
        isRecommended: true
      }],
      aiNote: 'SEO 优化的产品标题',
      reason: '前40字符包含核心关键词',
      confidence: 92
    },
    searchKeywords: {
      primary: Array.isArray(plan.keywords) ? plan.keywords.slice(0, 3) : [formData.category, formData.coreSellingPoint].filter(Boolean),
      secondary: [],
      longtail: [],
      aiNote: 'AI 推荐的搜索关键词',
      reason: '基于平台搜索趋势',
      confidence: 88
    },
    dataSourceNote: {
      conceptBasis: `基于${competitorsData.length}条竞品链接提取分析`,
      keywordBasis: '非精准搜索量数据，依据品牌常用表达、竞品高频词',
      verificationTip: '如需验证热搜量，建议用 Shopee 关键词工具拉数'
    }
  };
};

// 准备保存草稿的数据
export const prepareDraftData = (generatedData, formData, competitors, aiConfig, currentUser) => {
  const now = new Date();
  const developMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 收集竞品数据
  const competitorsData = competitors
    .filter(c => c.success && c.data)
    .map(c => ({ ...c.data, url: c.url }));

  // 提取三语名称
  const recommendedName = generatedData.productName?.options?.find(o => o.isRecommended) 
    || generatedData.productName?.options?.[0];

  // 提取定价
  const pricingValue = generatedData.pricingStrategy?.anchor 
    || generatedData.pricing?.value 
    || formData.pricing 
    || '';

  // 提取标题
  const recommendedTitle = generatedData.productTitles?.options?.find(o => o.isRecommended)
    || generatedData.productTitles?.options?.[0];

  // 提取关键词
  const keywordsArray = [
    ...(generatedData.searchKeywords?.primary || []),
    ...(generatedData.searchKeywords?.secondary || []),
    ...(generatedData.searchKeywords?.longtail || [])
  ];

  // 提取成分
  const ingredientsText = generatedData.ingredientCombos?.items
    ?.map(i => i.ingredient?.zh || i.ingredient?.en || '')
    .filter(Boolean)
    .join(', ') || '';

  // 提取功效
  const efficacyText = generatedData.mainBenefits?.items
    ?.map(i => i.zh || i.en || '')
    .filter(Boolean)
    .join('\n') || '';

  return {
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
    name_zh: recommendedName?.zh || '',
    name_en: recommendedName?.id || recommendedName?.en || '',
    name_id: recommendedName?.id || '',
    
    // 9模块简化字段
    positioning: generatedData.positioning?.valueZh || generatedData.positioning?.value || '',
    selling_point: generatedData.productIntro?.zh || generatedData.productIntro?.en || '',
    ingredients: ingredientsText,
    efficacy: efficacyText,
    scent: generatedData.scent?.valueZh || generatedData.scent?.value || '',
    texture_color: generatedData.bodyColor?.primary?.zh || generatedData.bodyColor?.primary?.en || '',
    pricing: pricingValue,
    title: recommendedTitle?.value || '',
    keywords: keywordsArray.join(', '),
    volume: formData.volume || generatedData.volume || '',
    
    // 完整AI生成方案
    ai_generated_plan: generatedData,
    
    // AI 元数据
    extract_provider: aiConfig.extract_provider,
    generate_provider: aiConfig.generate_provider,
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
    created_by: currentUser?.id || 1
  };
};
