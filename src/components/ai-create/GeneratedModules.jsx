// src/components/ai-create/GeneratedModules.jsx
// 右侧生成结果的各个模块展示
import React from 'react';
import ModuleCard, { ValueBox, ConfidenceBadge } from './ModuleCard';

export default function GeneratedModules({
  generatedData,
  formData,
  moduleStatus,
  editingModule,
  regeneratingModule,
  onEdit,
  onRegenerate,
  onStatusChange
}) {
  if (!generatedData) return null;

  const commonProps = (moduleId) => ({
    moduleStatus: moduleStatus[moduleId],
    isEditing: editingModule === moduleId,
    isRegenerating: regeneratingModule === moduleId,
    onEdit: () => onEdit(editingModule === moduleId ? null : moduleId),
    onRegenerate: () => onRegenerate(moduleId),
    onStatusChange: onStatusChange
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* 竞品分析摘要 */}
      <CompetitorAnalysisSummary data={generatedData.competitorAnalysis} />

      {/* 双列布局模块 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* 1. 产品名称 - 跨两列 */}
        <div style={{ gridColumn: 'span 2' }}>
          <ProductNameModule 
            data={generatedData.productName} 
            {...commonProps('productName')}
          />
        </div>

        {/* 2. 产品定位 */}
        <PositioningModule 
          data={generatedData.positioning} 
          {...commonProps('positioning')}
        />

        {/* 3. 卖点简介 */}
        <ProductIntroModule 
          data={generatedData.productIntro} 
          {...commonProps('productIntro')}
        />

        {/* 4. 概念成分 - 跨两列 */}
        <div style={{ gridColumn: 'span 2' }}>
          <IngredientsModule 
            data={generatedData.ingredientCombos} 
            {...commonProps('ingredientCombos')}
          />
        </div>

        {/* 5. 主打功效 - 跨两列 */}
        <div style={{ gridColumn: 'span 2' }}>
          <BenefitsModule 
            data={generatedData.mainBenefits} 
            {...commonProps('mainBenefits')}
          />
        </div>

        {/* 6. 香味 */}
        <ScentModule 
          data={generatedData.scent} 
          {...commonProps('scent')}
        />

        {/* 7. 料体颜色 */}
        <BodyColorModule 
          data={generatedData.bodyColor} 
          {...commonProps('bodyColor')}
        />

        {/* 8. 定价 */}
        <PricingModule 
          data={generatedData.pricingStrategy} 
          fallbackPricing={formData.pricing}
          {...commonProps('pricing')}
        />

        {/* 9. 产品标题 - 跨两列 */}
        <div style={{ gridColumn: 'span 2' }}>
          <ProductTitlesModule 
            data={generatedData.productTitles} 
            {...commonProps('productTitles')}
          />
        </div>

        {/* 10. 搜索关键词 - 跨两列 */}
        <div style={{ gridColumn: 'span 2' }}>
          <KeywordsModule 
            data={generatedData.searchKeywords} 
            {...commonProps('searchKeywords')}
          />
        </div>

      </div>

      {/* 数据来源说明 */}
      <DataSourceNote data={generatedData.dataSourceNote} />
    </div>
  );
}

// 竞品分析摘要
function CompetitorAnalysisSummary({ data }) {
  if (!data) return null;
  
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: '#fff7ed',
      border: '1px solid #fed7aa',
      marginBottom: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: '#ea580c', fontWeight: '600' }}>
          🔍 竞品分析摘要
        </h3>
        <ConfidenceBadge value={data.confidence || 85} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#FAFAFA' }}>
          <div style={{ fontSize: '10px', color: '#ea580c', marginBottom: '4px' }}>价格带</div>
          <div style={{ fontSize: '13px', color: '#1d1d1f' }}>
            {data.priceRange?.min} - {data.priceRange?.max}
          </div>
          <div style={{ fontSize: '11px', color: '#86868b' }}>
            中位数: {data.priceRange?.median}
          </div>
        </div>
        <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#FAFAFA' }}>
          <div style={{ fontSize: '10px', color: '#ea580c', marginBottom: '4px' }}>共同成分</div>
          <div style={{ fontSize: '12px', color: '#1d1d1f' }}>
            {data.commonIngredients?.join(', ')}
          </div>
        </div>
        <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#FAFAFA' }}>
          <div style={{ fontSize: '10px', color: '#f59e0b', marginBottom: '4px' }}>⚡ 差异化机会</div>
          <div style={{ fontSize: '12px', color: '#f59e0b' }}>
            {data.gaps?.join('、')}
          </div>
        </div>
      </div>
    </div>
  );
}

// 1. 产品名称模块
function ProductNameModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="productName"
      number="1"
      title="产品名称 ⭐"
      confidence={data?.confidence || 85}
      aiNote={data?.aiNote || '基于市场分析生成'}
      reason={data?.reason || '依据竞品分析'}
      {...props}
    >
      <div style={{ display: 'grid', gap: '10px' }}>
        {data?.options?.map((opt, idx) => (
          <div key={idx} style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: '#FAFAFA',
            border: opt.isRecommended ? '2px solid #f97316' : '1px solid #e5e5ea'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {opt.isRecommended && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#f97316',
                  color: 'white'
                }}>推荐</span>
              )}
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#f0f0f0',
                color: '#6e6e73'
              }}>{opt.formula}</span>
            </div>
            <div style={{ fontSize: '16px', color: '#1d1d1f', fontWeight: '600', marginBottom: '4px' }}>{opt.id}</div>
            <div style={{ fontSize: '13px', color: '#6e6e73', marginBottom: '8px' }}>{opt.zh}</div>
            <div style={{ fontSize: '11px', color: '#86868b' }}>
              💡 {opt.reason}
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}

// 2. 产品定位模块
function PositioningModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="positioning"
      number="2"
      title="产品定位"
      confidence={data?.confidence || 90}
      aiNote={data?.aiNote || '基于市场分析'}
      reason={data?.reason || '竞品差异化定位'}
      {...props}
    >
      <ValueBox
        value={data?.value}
        valueZh={data?.valueZh}
      />
    </ModuleCard>
  );
}

// 3. 卖点简介模块
function ProductIntroModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="productIntro"
      number="3"
      title="卖点简介"
      confidence={data?.confidence || 88}
      aiNote={data?.aiNote || '电商详情页风格'}
      reason={data?.reason || '基于竞品文案分析'}
      {...props}
    >
      <div style={{ display: 'grid', gap: '10px' }}>
        <div style={{
          padding: '14px',
          borderRadius: '8px',
          backgroundColor: '#FAFAFA',
          border: '1px solid #e5e5ea'
        }}>
          <div style={{ fontSize: '11px', color: '#ea580c', marginBottom: '8px', fontWeight: '600' }}>🇬🇧 English</div>
          <p style={{ fontSize: '13px', color: '#1d1d1f', lineHeight: '1.6', margin: 0 }}>
            {data?.en}
          </p>
        </div>
        <div style={{
          padding: '14px',
          borderRadius: '8px',
          backgroundColor: '#FAFAFA',
          border: '1px solid #e5e5ea'
        }}>
          <div style={{ fontSize: '11px', color: '#ea580c', marginBottom: '8px', fontWeight: '600' }}>🇨🇳 中文</div>
          <p style={{ fontSize: '13px', color: '#1d1d1f', lineHeight: '1.6', margin: 0 }}>
            {data?.zh}
          </p>
        </div>
      </div>
    </ModuleCard>
  );
}

// 4. 概念成分模块
function IngredientsModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="ingredientCombos"
      number="4"
      title="概念成分组合"
      confidence={data?.confidence || 90}
      aiNote={data?.aiNote || 'AI推荐成分'}
      reason={data?.reason || '基于竞品成分分析'}
      {...props}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {data?.items?.map((item, idx) => (
          <div key={idx} style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#FAFAFA',
            border: '1px solid #e5e5ea'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#ea580c', fontWeight: '600' }}>{item.ingredient?.en}</div>
                <div style={{ fontSize: '11px', color: '#86868b' }}>{item.ingredient?.id} | {item.ingredient?.zh}</div>
              </div>
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: '#fff7ed',
                color: '#ea580c'
              }}>{item.percentage}</span>
            </div>
            <div style={{ fontSize: '10px', color: '#f59e0b', paddingTop: '6px', borderTop: '1px solid #e5e5ea' }}>
              📎 {item.source}
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}

// 5. 主打功效模块
function BenefitsModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="mainBenefits"
      number="5"
      title="主打功效"
      confidence={data?.confidence || 87}
      aiNote={data?.aiNote || '包装设计风格'}
      reason={data?.reason || '基于市场热搜词'}
      {...props}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {data?.items?.map((item, idx) => (
          <div key={idx} style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#FAFAFA',
            border: '1px solid #e5e5ea'
          }}>
            <div style={{ fontSize: '13px', color: '#1d1d1f', marginBottom: '4px' }}>{item.en}</div>
            <div style={{ fontSize: '12px', color: '#6e6e73' }}>{item.id}</div>
            <div style={{ fontSize: '12px', color: '#86868b' }}>{item.zh}</div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}

// 6. 香味模块
function ScentModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="scent"
      number="6"
      title="香味"
      confidence={data?.confidence || 85}
      aiNote={data?.aiNote || '基于市场偏好'}
      reason={data?.reason || '热带市场香味趋势'}
      {...props}
    >
      <ValueBox
        value={data?.value}
        valueZh={data?.valueZh}
      />
    </ModuleCard>
  );
}

// 7. 料体颜色模块
function BodyColorModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="bodyColor"
      number="7"
      title="料体颜色"
      confidence={data?.confidence || 83}
      aiNote={data?.aiNote || '自然感颜色'}
      reason={data?.reason || '基于品类惯例'}
      {...props}
    >
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{
          flex: 1,
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: '#FAFAFA',
          border: '2px solid #f97316'
        }}>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f97316', color: 'white' }}>主推</span>
          <div style={{ fontSize: '13px', color: '#1d1d1f', marginTop: '8px' }}>{data?.primary?.en}</div>
          <div style={{ fontSize: '11px', color: '#6e6e73' }}>{data?.primary?.zh}</div>
        </div>
        <div style={{
          flex: 1,
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: '#FAFAFA',
          border: '1px solid #e5e5ea'
        }}>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#d2d2d7', color: '#6e6e73' }}>备选</span>
          <div style={{ fontSize: '13px', color: '#6e6e73', marginTop: '8px' }}>{data?.alternative?.en}</div>
          <div style={{ fontSize: '11px', color: '#86868b' }}>{data?.alternative?.zh}</div>
        </div>
      </div>
    </ModuleCard>
  );
}

// 8. 定价模块
function PricingModule({ data, fallbackPricing, ...props }) {
  return (
    <ModuleCard
      moduleId="pricing"
      number="8"
      title="定价策略"
      confidence={data?.confidence || 90}
      aiNote={data?.aiNote || '中高端定位'}
      reason={data?.reason || '基于竞品价格'}
      {...props}
    >
      <ValueBox 
        value={data?.anchor || fallbackPricing || '待定'}
        valueZh={data?.flash ? `Flash: ${data.flash}` : null}
        subInfo={data?.competitorPrices}
      />
    </ModuleCard>
  );
}

// 9. 产品标题模块
function ProductTitlesModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="productTitles"
      number="9"
      title="产品标题（255字符）"
      confidence={data?.confidence || 92}
      aiNote={data?.aiNote || 'SEO优化标题'}
      reason={data?.reason || '前40字符核心关键词'}
      {...props}
    >
      <div style={{ display: 'grid', gap: '10px' }}>
        {data?.options?.map((opt, idx) => (
          <div key={idx} style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: '#FAFAFA',
            border: opt.isRecommended ? '2px solid #f97316' : '1px solid #e5e5ea'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {opt.isRecommended && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#f97316',
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
            <div style={{ fontSize: '14px', color: '#1d1d1f', lineHeight: '1.5' }}>{opt.value}</div>
            <div style={{ fontSize: '12px', color: '#86868b', marginTop: '8px' }}>{opt.valueZh}</div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}

// 10. 搜索关键词模块
function KeywordsModule({ data, ...props }) {
  return (
    <ModuleCard
      moduleId="searchKeywords"
      number="10"
      title="搜索关键词"
      confidence={data?.confidence || 88}
      aiNote={data?.aiNote || '平台搜索优化'}
      reason={data?.reason || '基于热搜趋势'}
      {...props}
    >
      <div style={{
        padding: '14px',
        borderRadius: '8px',
        backgroundColor: '#FAFAFA',
        border: '1px solid #e5e5ea'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: '#ea580c', marginBottom: '6px', fontWeight: '600' }}>🔥 主关键词</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {data?.primary?.map((kw, idx) => (
              <span key={idx} style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: '#fff7ed',
                color: '#ea580c',
                fontSize: '12px'
              }}>{kw}</span>
            ))}
          </div>
        </div>
        {data?.secondary?.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', color: '#6e6e73', marginBottom: '6px', fontWeight: '600' }}>📈 次关键词</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {data?.secondary?.map((kw, idx) => (
                <span key={idx} style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#f0f0f0',
                  color: '#6e6e73',
                  fontSize: '12px'
                }}>{kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModuleCard>
  );
}

// 数据来源说明
function DataSourceNote({ data }) {
  if (!data) return null;
  
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: '#fff7ed',
      border: '1px solid #fed7aa',
      marginTop: '16px'
    }}>
      <h4 style={{ fontSize: '13px', color: '#ea580c', margin: '0 0 12px 0' }}>📊 数据来源说明</h4>
      <div style={{ display: 'grid', gap: '8px', fontSize: '12px', color: '#1d1d1f' }}>
        <div><span style={{ color: '#ea580c' }}>概念成分依据：</span>{data.conceptBasis}</div>
        <div><span style={{ color: '#ea580c' }}>关键词依据：</span>{data.keywordBasis}</div>
        <div style={{
          padding: '10px',
          borderRadius: '6px',
          backgroundColor: '#fef3c7',
          marginTop: '4px'
        }}>
          ⚠️ {data.verificationTip}
        </div>
      </div>
    </div>
  );
}
