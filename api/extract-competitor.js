/**
 * /api/extract-competitor
 * 
 * V4 版本：
 * - 支持 Shopee API 直接获取商品数据
 * - 从 URL 解析 shop_id 和 item_id
 * - 调用 Shopee 内部 API 获取完整数据
 */

import { readJson, sendJson, requirePost, normalizeProvider } from "./_utils.js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`MISSING_ENV:${name}`);
  return v;
}

function safeParseJson(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ========== 从 Shopee URL 解析 ID ==========

function parseShopeeUrl(url) {
  // Shopee URL 格式：
  // https://shopee.co.id/产品名-i.{shop_id}.{item_id}
  // https://shopee.co.id/product/{shop_id}/{item_id}
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // 判断是否是 Shopee
    if (!hostname.includes('shopee.')) {
      return null;
    }
    
    // 获取国家代码
    const countryMatch = hostname.match(/shopee\.(\w+)/);
    const country = countryMatch ? countryMatch[1] : 'co.id';
    
    const pathname = urlObj.pathname;
    
    // 格式1: /产品名-i.{shop_id}.{item_id}
    const match1 = pathname.match(/-i\.(\d+)\.(\d+)/);
    if (match1) {
      return {
        platform: 'shopee',
        country,
        shopId: match1[1],
        itemId: match1[2]
      };
    }
    
    // 格式2: /product/{shop_id}/{item_id}
    const match2 = pathname.match(/\/product\/(\d+)\/(\d+)/);
    if (match2) {
      return {
        platform: 'shopee',
        country,
        shopId: match2[1],
        itemId: match2[2]
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

// ========== 调用 Shopee API ==========

async function fetchShopeeProduct(shopId, itemId, country = 'co.id') {
  // Shopee API 地址根据国家不同
  const apiDomains = {
    'co.id': 'shopee.co.id',
    'com.my': 'shopee.com.my',
    'co.th': 'shopee.co.th',
    'ph': 'shopee.ph',
    'vn': 'shopee.vn',
    'sg': 'shopee.sg',
    'tw': 'shopee.tw',
    'com.br': 'shopee.com.br',
  };
  
  const domain = apiDomains[country] || 'shopee.co.id';
  const apiUrl = `https://${domain}/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`;
  
  console.log(`📡 调用 Shopee API: ${apiUrl}`);
  
  const res = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Referer': `https://${domain}/`,
      'af-ac-enc-dat': 'null',
    },
  });
  
  if (!res.ok) {
    throw new Error(`Shopee API 请求失败: ${res.status}`);
  }
  
  const json = await res.json();
  
  if (json.error || !json.data) {
    throw new Error(`Shopee API 返回错误: ${json.error_msg || JSON.stringify(json)}`);
  }
  
  return json.data;
}

// ========== 解析 Shopee 数据 ==========

function parseShopeeData(data, url) {
  const item = data;
  
  // 价格处理（Shopee 价格单位是 100000，即除以 100000 得到实际价格）
  // 实际上印尼的价格单位是除以 100000 后再乘以 1（即直接除以 100000）
  const priceUnit = 100000;
  const price = item.price ? Math.round(item.price / priceUnit) : 0;
  const originalPrice = item.price_before_discount ? Math.round(item.price_before_discount / priceUnit) : 0;
  const priceMin = item.price_min ? Math.round(item.price_min / priceUnit) : price;
  const priceMax = item.price_max ? Math.round(item.price_max / priceUnit) : price;
  
  // 格式化价格
  const formatPrice = (p) => p > 0 ? `Rp ${p.toLocaleString('id-ID')}` : '';
  
  // 评分
  const rating = item.item_rating?.rating_star 
    ? item.item_rating.rating_star.toFixed(1) 
    : '';
  
  // 评论数
  const reviewCount = item.item_rating?.rating_count?.[0] || item.cmt_count || 0;
  
  // 销量
  const sales = item.sold || item.historical_sold || 0;
  const salesText = sales >= 1000 
    ? `${(sales / 1000).toFixed(1)}rb terjual` 
    : `${sales} terjual`;
  
  // 提取卖点（从描述中）
  const description = item.description || '';
  const sellingPoints = extractSellingPoints(description, item.name);
  
  // 提取成分（从描述中）
  const ingredients = extractIngredients(description);
  
  // 规格/容量
  const volume = extractVolume(item.name, description);
  
  // 品牌
  const brand = item.brand || extractBrand(item.name) || '';
  
  return {
    name: item.name || '',
    brand: brand,
    price: formatPrice(priceMin || price),
    original_price: originalPrice > price ? formatPrice(originalPrice) : '',
    price_min: formatPrice(priceMin),
    price_max: formatPrice(priceMax),
    volume: volume,
    sales: salesText,
    rating: rating,
    review_count: reviewCount > 0 ? reviewCount.toLocaleString() : '',
    
    title: item.name || '',
    title_keywords: extractKeywords(item.name),
    
    selling_points: sellingPoints,
    ingredients: ingredients,
    
    // 图片
    image: item.image ? `https://down-id.img.susercontent.com/file/${item.image}` : '',
    images: (item.images || []).map(img => `https://down-id.img.susercontent.com/file/${img}`),
    
    // 店铺信息
    shop_name: item.shop_name || '',
    shop_id: item.shopid,
    item_id: item.itemid,
    
    // 分类
    categories: (item.categories || []).map(c => c.display_name),
    
    // 库存
    stock: item.stock || 0,
    
    // 描述（用于 AI 分析）
    description: description.slice(0, 2000),
    
    source_url: url,
    
    // 原始数据（用于调试）
    _raw_price: item.price,
    _raw_price_min: item.price_min,
  };
}

// ========== 辅助函数 ==========

function extractSellingPoints(description, name) {
  const points = [];
  
  // 从描述中提取要点
  const lines = description.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    // 找以 ✓ ✔ ★ • - 等开头的行
    if (/^[✓✔★•\-\d\.]+/.test(trimmed) && trimmed.length > 5 && trimmed.length < 100) {
      points.push(trimmed.replace(/^[✓✔★•\-\d\.]+\s*/, ''));
    }
  }
  
  // 如果描述中没有，从标题中提取关键词
  if (points.length === 0) {
    const keywords = ['Moisturizing', 'Whitening', 'Anti-Aging', 'Hydrating', 'Natural', 
                      'Organic', 'BPOM', 'Halal', 'Original', 'Premium'];
    const nameLower = (name + ' ' + description).toLowerCase();
    for (const kw of keywords) {
      if (nameLower.includes(kw.toLowerCase())) {
        points.push(kw);
      }
    }
  }
  
  return points.slice(0, 5);
}

function extractIngredients(description) {
  const ingredients = [];
  const descLower = description.toLowerCase();
  
  // 常见成分关键词
  const commonIngredients = [
    { name: 'Niacinamide', benefit: '美白提亮' },
    { name: 'Hyaluronic Acid', benefit: '保湿补水' },
    { name: 'Vitamin C', benefit: '抗氧化美白' },
    { name: 'Vitamin E', benefit: '滋润抗氧化' },
    { name: 'Retinol', benefit: '抗皱紧致' },
    { name: 'Salicylic Acid', benefit: '去角质控油' },
    { name: 'Aloe Vera', benefit: '舒缓镇静' },
    { name: 'Collagen', benefit: '弹润紧致' },
    { name: 'Centella Asiatica', benefit: '修护舒缓' },
    { name: 'Green Tea', benefit: '抗氧化' },
    { name: 'Charcoal', benefit: '深层清洁' },
    { name: 'Kemiri', benefit: '滋养发根' },
    { name: 'Minyak Kemiri', benefit: '护发生发' },
    { name: 'Ginseng', benefit: '滋补养护' },
    { name: 'Argan Oil', benefit: '滋润修护' },
    { name: 'Tea Tree', benefit: '控油祛痘' },
    { name: 'Glycerin', benefit: '保湿锁水' },
  ];
  
  for (const ing of commonIngredients) {
    if (descLower.includes(ing.name.toLowerCase())) {
      ingredients.push(ing);
    }
  }
  
  return ingredients.slice(0, 6);
}

function extractVolume(name, description) {
  const text = name + ' ' + description;
  
  // 匹配容量模式
  const patterns = [
    /(\d+)\s*(ml|ML|mL)/i,
    /(\d+)\s*(g|gr|gram)/i,
    /(\d+)\s*(oz|OZ)/i,
    /(\d+)\s*(pcs|PCS|Pcs)/i,
  ];
  
  for (const p of patterns) {
    const match = text.match(p);
    if (match) {
      return match[0];
    }
  }
  
  return '';
}

function extractBrand(name) {
  // 常见品牌
  const brands = ['BIOAQUA', 'LAIKOU', 'IMAGES', 'SOME BY MI', 'COSRX', 'SKINTIFIC',
                  'WARDAH', 'EMINA', 'GARNIER', 'POND\'S', 'NIVEA', 'VASELINE',
                  'LOREAL', 'MAYBELLINE', 'INNISFREE', 'NATURE REPUBLIC', 'ETUDE',
                  'THE ORDINARY', 'CERAVE', 'LOLA ROSE', 'ZADA', 'SCARLETT'];
  
  const nameLower = name.toLowerCase();
  for (const brand of brands) {
    if (nameLower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  // 尝试提取第一个单词作为品牌
  const firstWord = name.split(/[\s\-\/]/)[0];
  if (firstWord && firstWord.length > 2 && firstWord.length < 20) {
    return firstWord;
  }
  
  return '';
}

function extractKeywords(name) {
  // 移除品牌和常见词，提取关键词
  const stopWords = ['dan', 'untuk', 'dengan', 'the', 'and', 'for', 'with', 'original', 'ori'];
  const words = name.split(/[\s\-\/\|]+/).filter(w => 
    w.length > 2 && 
    !stopWords.includes(w.toLowerCase()) &&
    !/^\d+$/.test(w)
  );
  
  return words.slice(0, 8);
}

// ========== AI 调用函数 ==========

async function callGemini(prompt) {
  const key = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`GEMINI_ERROR:${json?.error?.message || res.status}`);
  }

  return json?.candidates?.[0]?.content?.parts?.map(p => p?.text).filter(Boolean).join("") || "";
}

async function callQwen(prompt) {
  const key = requireEnv("DASHSCOPE_API_KEY");
  const model = process.env.DASHSCOPE_MODEL || "qwen-max";
  const baseURL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  
  const json = await res.json();
  if (!res.ok) throw new Error(`QWEN_ERROR:${json.error?.message || JSON.stringify(json)}`);
  return json.choices?.[0]?.message?.content?.trim() || "";
}

// ========== 主处理函数 ==========

export default async function handler(req, res) {
  try {
    if (!requirePost(req, res)) return;

    const body = await readJson(req);
    const provider = normalizeProvider(body?.ai_config?.extract_provider) || "gemini";
    const url = body?.url;

    if (!url || typeof url !== "string") {
      sendJson(res, 400, { success: false, error: "MISSING_URL" });
      return;
    }

    console.log(`📤 提取竞品: ${url}`);

    // 1. 尝试解析 Shopee URL
    const shopeeInfo = parseShopeeUrl(url);
    
    if (shopeeInfo) {
      console.log(`🛒 识别为 Shopee 链接: shop=${shopeeInfo.shopId}, item=${shopeeInfo.itemId}`);
      
      try {
        // 调用 Shopee API
        const shopeeData = await fetchShopeeProduct(shopeeInfo.shopId, shopeeInfo.itemId, shopeeInfo.country);
        const parsed = parseShopeeData(shopeeData, url);
        
        console.log(`✅ Shopee API 成功: ${parsed.name}, 价格: ${parsed.price}`);
        
        // 如果需要深度分析，调用 AI
        if (body?.deep_analysis) {
          const aiAnalysis = await analyzeWithAI(parsed, provider);
          Object.assign(parsed, aiAnalysis);
        }
        
        sendJson(res, 200, {
          success: true,
          provider: 'shopee_api',
          data: parsed,
        });
        return;
        
      } catch (apiError) {
        console.log(`⚠️ Shopee API 失败: ${apiError.message}，降级到 HTML 抓取`);
        // 继续使用 HTML 抓取方式
      }
    }

    // 2. 非 Shopee 或 API 失败，使用 HTML 抓取 + AI 分析
    const html = await fetchHtml(url);
    console.log(`📥 HTML 长度: ${html.length}`);

    const prompt = buildAnalysisPrompt(url, html);
    
    let raw = "";
    if (provider === "qwen") {
      raw = await callQwen(prompt);
    } else {
      raw = await callGemini(prompt);
    }

    const obj = safeParseJson(raw);
    
    if (!obj) {
      sendJson(res, 200, {
        success: true,
        provider,
        data: { name: "", price: "", raw_analysis: raw, source_url: url },
        raw_response: raw
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      provider,
      data: normalizeResult(obj, url),
    });

  } catch (e) {
    console.error("❌ Extract error:", e.message);
    sendJson(res, 500, { success: false, error: e.message });
  }
}

// ========== HTML 抓取 ==========

async function fetchHtml(url) {
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "accept": "text/html",
      },
    });
    let html = await r.text().catch(() => "");
    if (html.length > 100000) html = html.slice(0, 100000);
    return html;
  } catch {
    return "";
  }
}

// ========== AI 深度分析 ==========

async function analyzeWithAI(productData, provider) {
  const prompt = `
分析以下商品数据，生成差评痛点和差异化机会：

商品名称: ${productData.name}
价格: ${productData.price}
描述: ${productData.description}
卖点: ${productData.selling_points?.join(', ')}
成分: ${productData.ingredients?.map(i => i.name).join(', ')}

请输出 JSON：
{
  "pain_points": [
    {"category": "分类", "description": "描述", "frequency": "高频/中频/低频"}
  ],
  "opportunities": [
    {"dimension": "维度", "suggestion": "建议"}
  ],
  "price_positioning": "价格定位",
  "target_audience": "目标人群"
}
`.trim();

  try {
    const raw = provider === 'qwen' ? await callQwen(prompt) : await callGemini(prompt);
    return safeParseJson(raw) || {};
  } catch {
    return {};
  }
}

// ========== Prompt 和结果处理 ==========

function buildAnalysisPrompt(url, html) {
  return `
分析以下商品页面，提取信息并输出 JSON：

URL: ${url}
HTML: ${html.slice(0, 50000)}

输出格式：
{
  "name": "产品名称",
  "brand": "品牌",
  "price": "价格（如 Rp 27,600）",
  "original_price": "原价",
  "volume": "规格",
  "sales": "销量",
  "rating": "评分",
  "review_count": "评论数",
  "title": "完整标题",
  "title_keywords": ["关键词"],
  "selling_points": ["卖点"],
  "ingredients": [{"name": "成分", "benefit": "功效"}],
  "pain_points": [{"category": "分类", "description": "描述", "frequency": "频率"}],
  "opportunities": [{"dimension": "维度", "suggestion": "建议"}],
  "price_positioning": "价格定位",
  "target_audience": "目标人群"
}

注意：印尼盾价格中的"."是千位分隔符，如 27.600 = 27,600
`.trim();
}

function normalizeResult(obj, url) {
  return {
    name: obj.name || "",
    brand: obj.brand || "",
    price: obj.price || "",
    original_price: obj.original_price || "",
    volume: obj.volume || "",
    sales: obj.sales || "",
    rating: obj.rating || "",
    review_count: obj.review_count || "",
    title: obj.title || obj.name || "",
    title_keywords: Array.isArray(obj.title_keywords) ? obj.title_keywords : [],
    selling_points: Array.isArray(obj.selling_points) ? obj.selling_points : [],
    ingredients: Array.isArray(obj.ingredients) ? obj.ingredients : [],
    pain_points: Array.isArray(obj.pain_points) ? obj.pain_points : [],
    opportunities: Array.isArray(obj.opportunities) ? obj.opportunities : [],
    price_positioning: obj.price_positioning || "",
    target_audience: obj.target_audience || "",
    source_url: url,
    benefits: Array.isArray(obj.selling_points) ? obj.selling_points : [],
  };
}
