// src/CompetitorAnalysisDetail.jsx
// 竞品分析报告详情弹窗

import React, { useState } from 'react';
import { 
  X, TrendingUp, AlertTriangle, Lightbulb, Target, 
  DollarSign, Package, ChevronDown, ChevronUp, 
  ExternalLink, Copy, Check
} from 'lucide-react';

export default function CompetitorAnalysisDetail({ analysis, onClose, onUseForProduct }) {
  const [expandedCompetitor, setExpandedCompetitor] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!analysis) return null;

  // 解析竞品数据
  const competitors = analysis.competitors || [];
  const painPoints = analysis.pain_points_summary || [];
  const opportunities = analysis.opportunities || [];
  const recommendations = analysis.recommendations || {};
  const summary = analysis.summary || {};

  // 复制报告摘要
  const handleCopy = () => {
    const text = `
【${analysis.title}】
品类：${analysis.category} | 市场：${analysis.market}

📊 核心结论：
${summary.conclusion || '无'}

😣 主要痛点：
${painPoints.map((p, i) => `${i + 1}. ${p.category}: ${p.description}`).join('\n')}

💡 差异化机会：
${opportunities.map((o, i) => `${i + 1}. ${o.dimension}: ${o.suggestion || o.suggestions?.join(', ')}`).join('\n')}

🎯 建议定位：${recommendations.positioning || '无'}
💰 建议定价：${recommendations.pricing || '无'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        backgroundColor: '#F5F5F7',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* 头部 */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700' }}>
                📊 {analysis.title}
              </h2>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px', opacity: 0.9 }}>
                <span>🏷️ {analysis.category}</span>
                <span>🌏 {analysis.market}</span>
                <span>🛒 {analysis.platform || 'Shopee'}</span>
                <span>📅 {new Date(analysis.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制摘要'}
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 核心结论 */}
          {summary.conclusion && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              🎯 <strong>核心结论：</strong>{summary.conclusion}
            </div>
          )}
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          
          {/* 价格分析 */}
          <Section icon="💰" title="价格带分析">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <PriceCard 
                label="最低价" 
                value={summary.priceAnalysis?.min || analysis.price_min || '-'} 
                color="#10B981" 
              />
              <PriceCard 
                label="平均价" 
                value={summary.priceAnalysis?.median || analysis.price_avg || '-'} 
                color="#3B82F6" 
                highlight 
              />
              <PriceCard 
                label="最高价" 
                value={summary.priceAnalysis?.max || analysis.price_max || '-'} 
                color="#EF4444" 
              />
            </div>
            {(summary.priceAnalysis?.suggestion || recommendations.pricing) && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#FEF3C7',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#92400E'
              }}>
                💡 <strong>定价建议：</strong>
                {summary.priceAnalysis?.suggestion || recommendations.pricing}
              </div>
            )}
          </Section>

          {/* 竞品列表 */}
          {competitors.length > 0 && (
            <Section icon="📦" title={`竞品详情 (${competitors.length}个)`}>
              {competitors.map((comp, index) => (
                <CompetitorCard
                  key={index}
                  competitor={comp}
                  index={index}
                  isExpanded={expandedCompetitor === index}
                  onToggle={() => setExpandedCompetitor(
                    expandedCompetitor === index ? null : index
                  )}
                />
              ))}
            </Section>
          )}

          {/* 差评痛点 */}
          {painPoints.length > 0 && (
            <Section icon="😣" title="差评痛点汇总">
              <div style={{ display: 'grid', gap: '10px' }}>
                {painPoints.map((point, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: '#FEF2F2',
                      borderRadius: '10px',
                      borderLeft: '4px solid #EF4444'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '6px'
                    }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#DC2626' 
                      }}>
                        {point.category}
                      </span>
                      {point.frequency && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#FECACA',
                          color: '#991B1B'
                        }}>
                          {point.frequency}
                        </span>
                      )}
                      {point.count && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#FECACA',
                          color: '#991B1B'
                        }}>
                          出现 {point.count} 次
                        </span>
                      )}
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '13px', 
                      color: '#1F2937',
                      lineHeight: '1.5'
                    }}>
                      {point.description}
                    </p>
                    {point.opportunity && (
                      <p style={{ 
                        margin: '8px 0 0 0', 
                        fontSize: '12px', 
                        color: '#059669' 
                      }}>
                        💡 机会: {point.opportunity}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 差异化机会 */}
          {opportunities.length > 0 && (
            <Section icon="🚀" title="差异化机会">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {opportunities.map((opp, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: '#ECFDF5',
                      borderRadius: '10px',
                      borderLeft: `4px solid ${opp.priority === '高' ? '#10B981' : '#3B82F6'}`
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#1F2937' 
                      }}>
                        {opp.dimension}
                      </span>
                      {opp.priority && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: opp.priority === '高' ? '#10B981' : '#3B82F6',
                          color: 'white'
                        }}>
                          优先级: {opp.priority}
                        </span>
                      )}
                    </div>
                    {opp.suggestion && (
                      <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>
                        {opp.suggestion}
                      </p>
                    )}
                    {opp.suggestions && Array.isArray(opp.suggestions) && (
                      <ul style={{ 
                        margin: 0, 
                        paddingLeft: '16px', 
                        fontSize: '13px', 
                        color: '#374151' 
                      }}>
                        {opp.suggestions.map((s, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 产品开发建议 */}
          {(recommendations.positioning || recommendations.pricing || recommendations.differentiators) && (
            <Section icon="🎯" title="产品开发建议">
              <div style={{
                padding: '16px',
                backgroundColor: '#F5F3FF',
                borderRadius: '12px',
                border: '1px solid #C4B5FD'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  {recommendations.positioning && (
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#7C3AED' }}>
                        📍 建议定位
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', color: '#1F2937' }}>
                        {recommendations.positioning}
                      </p>
                    </div>
                  )}
                  {recommendations.pricing && (
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#7C3AED' }}>
                        💰 建议定价
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', color: '#1F2937' }}>
                        {recommendations.pricing}
                      </p>
                    </div>
                  )}
                  {recommendations.differentiators && recommendations.differentiators.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#7C3AED' }}>
                        ⭐ 核心差异点
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#1F2937' }}>
                        {recommendations.differentiators.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recommendations.pitfalls && recommendations.pitfalls.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#DC2626' }}>
                        ⚠️ 规避的坑
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#1F2937' }}>
                        {recommendations.pitfalls.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* 底部操作 */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E5E5EA',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #E5E5EA',
              backgroundColor: 'white',
              color: '#6B7280',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            关闭
          </button>
          <button
            onClick={() => onUseForProduct?.(analysis)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Target size={16} />
            基于此分析创建产品
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 子组件 ====================

function Section({ icon, title, children }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '16px',
      border: '1px solid #E5E5EA'
    }}>
      <h3 style={{ 
        margin: '0 0 14px 0', 
        fontSize: '15px', 
        fontWeight: '600', 
        color: '#1F2937',
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

function PriceCard({ label, value, color, highlight }) {
  return (
    <div style={{
      padding: '14px',
      borderRadius: '10px',
      backgroundColor: highlight ? '#EFF6FF' : '#F9FAFB',
      border: highlight ? '2px solid #3B82F6' : '1px solid #E5E5EA',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: '700', color }}>
        {value}
      </div>
    </div>
  );
}

function CompetitorCard({ competitor, index, isExpanded, onToggle }) {
  // 兼容不同的数据结构
  const name = competitor.basicData?.name || competitor.name || competitor.title || `竞品 ${index + 1}`;
  const price = competitor.basicData?.price || competitor.price || '-';
  const brand = competitor.basicData?.brand || competitor.brand || '';
  const rating = competitor.basicData?.rating || competitor.rating || '';
  const sales = competitor.basicData?.sales || competitor.sales || '';
  const sellingPoints = competitor.sellingPoints || competitor.selling_points || [];
  const ingredients = competitor.ingredients || [];
  const painPoints = competitor.painPoints || competitor.pain_points || [];
  const url = competitor.url || competitor.source_url || '';

  return (
    <div style={{
      backgroundColor: '#F9FAFB',
      borderRadius: '10px',
      marginBottom: '10px',
      border: '1px solid #E5E5EA',
      overflow: 'hidden'
    }}>
      {/* 头部（可点击展开） */}
      <div
        onClick={onToggle}
        style={{
          padding: '14px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#1F2937',
            marginBottom: '4px'
          }}>
            {name}
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6B7280' }}>
            {price && <span>💰 {price}</span>}
            {brand && <span>🏷️ {brand}</span>}
            {rating && <span>⭐ {rating}</span>}
            {sales && <span>🛒 {sales}</span>}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>

      {/* 展开详情 */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #E5E5EA' }}>
          {/* 卖点 */}
          {sellingPoints.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6B7280' }}>
                ⭐ 核心卖点
              </h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#374151' }}>
                {sellingPoints.slice(0, 5).map((sp, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    {typeof sp === 'string' ? sp : sp.text || sp.point || JSON.stringify(sp)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 成分 */}
          {ingredients.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6B7280' }}>
                🧪 主打成分
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ingredients.slice(0, 5).map((ing, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#E0E7FF',
                      color: '#4338CA',
                      fontSize: '11px'
                    }}
                  >
                    {typeof ing === 'string' ? ing : ing.name || JSON.stringify(ing)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 痛点 */}
          {painPoints.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6B7280' }}>
                😣 差评痛点
              </h4>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#DC2626' }}>
                {painPoints.slice(0, 3).map((pp, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    {pp.category}: {pp.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 链接 */}
          {url && (
            <div style={{ marginTop: '12px' }}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: '#3B82F6',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ExternalLink size={12} />
                查看原链接
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
