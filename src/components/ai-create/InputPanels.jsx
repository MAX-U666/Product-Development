// src/components/ai-create/InputPanels.jsx
// 左侧输入区的各个面板组件
import React from 'react';
import { CATEGORIES, MARKETS, PLATFORMS, AI_PROVIDERS } from './constants';

// AI 模型选择面板
export function AIConfigPanel({ aiConfig, onChange }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: '#FFFFFF',
      marginBottom: '12px',
      border: '1px solid #f97316'
    }}>
      <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        🤖 AI 模型
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>提取模型（竞品分析）</label>
          <select
            value={aiConfig.extract_provider}
            onChange={(e) => onChange({...aiConfig, extract_provider: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e5ea',
              backgroundColor: '#FAFAFA',
              color: '#1d1d1f',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {AI_PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>生成模型（方案生成）</label>
          <select
            value={aiConfig.generate_provider}
            onChange={(e) => onChange({...aiConfig, generate_provider: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e5ea',
              backgroundColor: '#FAFAFA',
              color: '#1d1d1f',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {AI_PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div style={{ 
          padding: '8px 10px', 
          borderRadius: '6px', 
          backgroundColor: '#fff7ed', 
          fontSize: '11px', 
          color: '#ea580c',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          💡 当前：{AI_PROVIDERS.find(p => p.value === aiConfig.generate_provider)?.desc || ''}
        </div>
      </div>
    </div>
  );
}

// 品牌信息面板
export function BrandInfoPanel({ formData, onChange }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: '#FFFFFF',
      marginBottom: '12px'
    }}>
      <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        🏷️ 品牌信息
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>品牌名</label>
          <input
            type="text"
            value={formData.brandName}
            onChange={(e) => onChange({...formData, brandName: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e5ea',
              backgroundColor: '#FAFAFA',
              color: '#1d1d1f',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>品牌理念</label>
          <input
            type="text"
            value={formData.brandPhilosophy}
            onChange={(e) => onChange({...formData, brandPhilosophy: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e5ea',
              backgroundColor: '#FAFAFA',
              color: '#1d1d1f',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// 核心输入面板
export function CoreInputPanel({ formData, onChange }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: '#FFFFFF',
      marginBottom: '12px'
    }}>
      <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        ✏️ 核心输入
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>
            核心卖点 <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="如：防脱+清凉"
            value={formData.coreSellingPoint}
            onChange={(e) => onChange({...formData, coreSellingPoint: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e5ea',
              backgroundColor: '#FAFAFA',
              color: '#1d1d1f',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>
            主概念成分 <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="如：Rosemary 迷迭香"
            value={formData.conceptIngredient}
            onChange={(e) => onChange({...formData, conceptIngredient: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e5ea',
              backgroundColor: '#FAFAFA',
              color: '#1d1d1f',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>容量</label>
            <input
              type="text"
              placeholder="300ml"
              value={formData.volume}
              onChange={(e) => onChange({...formData, volume: e.target.value})}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e5ea',
                backgroundColor: '#FAFAFA',
                color: '#1d1d1f',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>定价</label>
            <input
              type="text"
              placeholder="IDR 89,900"
              value={formData.pricing}
              onChange={(e) => onChange({...formData, pricing: e.target.value})}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e5ea',
                backgroundColor: '#FAFAFA',
                color: '#1d1d1f',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 市场信息面板
export function MarketInfoPanel({ formData, onChange }) {
  return (
    <div style={{
      padding: '16px',
      borderRadius: '10px',
      backgroundColor: '#FFFFFF',
      marginBottom: '12px'
    }}>
      <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        🌏 市场信息
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>品类</label>
          <select
            value={formData.category}
            onChange={(e) => onChange({...formData, category: e.target.value})}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e5ea',
              backgroundColor: '#FAFAFA',
              color: '#1d1d1f',
              fontSize: '13px'
            }}
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>市场</label>
            <select
              value={formData.market}
              onChange={(e) => onChange({...formData, market: e.target.value})}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e5ea',
                backgroundColor: '#FAFAFA',
                color: '#1d1d1f',
                fontSize: '13px'
              }}
            >
              {MARKETS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#6e6e73', display: 'block', marginBottom: '4px' }}>平台</label>
            <select
              value={formData.platform}
              onChange={(e) => onChange({...formData, platform: e.target.value})}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #e5e5ea',
                backgroundColor: '#FAFAFA',
                color: '#1d1d1f',
                fontSize: '13px'
              }}
            >
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
