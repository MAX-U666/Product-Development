// src/components/ai-create/ModuleCard.jsx
// 生成结果的模块卡片组件
import React from 'react';

// 置信度徽章
export function ConfidenceBadge({ value }) {
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
}

// 状态选择器
export function StatusSelector({ moduleId, currentStatus, onStatusChange }) {
  const statuses = [
    { key: 'pending', label: '待审核', color: '#86868b', bg: '#d2d2d7' },
    { key: 'approved', label: '已确认', color: '#10b981', bg: '#065f46' },
    { key: 'needsRevision', label: '需修改', color: '#f59e0b', bg: '#854d0e' }
  ];
  const current = currentStatus || 'pending';

  return (
    <div style={{ 
      display: 'flex', 
      gap: '6px',
      padding: '8px 0',
      borderTop: '1px solid #e5e5ea',
      marginTop: '12px'
    }}>
      {statuses.map(s => (
        <button
          key={s.key}
          onClick={() => onStatusChange?.(moduleId, s.key)}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            border: current === s.key ? `2px solid ${s.color}` : '1px solid #d2d2d7',
            backgroundColor: current === s.key ? s.bg : 'transparent',
            color: current === s.key ? s.color : '#86868b',
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
}

// 模块卡片
export default function ModuleCard({ 
  moduleId, 
  number, 
  title, 
  confidence, 
  aiNote, 
  reason, 
  children,
  moduleStatus,
  isEditing,
  isRegenerating,
  onEdit,
  onRegenerate,
  onStatusChange
}) {
  const status = moduleStatus || 'pending';
  
  const getBorderColor = () => {
    if (status === 'approved') return '#10b981';
    if (status === 'needsRevision') return '#f59e0b';
    return '#e5e5ea';
  };

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: `1px solid ${getBorderColor()}`,
      position: 'relative',
      opacity: isRegenerating ? 0.7 : 1,
      transition: 'all 0.2s ease'
    }}>
      {/* 重新生成遮罩 */}
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
          <div style={{ color: '#ea580c', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
            重新生成中...
          </div>
        </div>
      )}

      {/* 头部 */}
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
          color: '#1d1d1f',
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
              : 'linear-gradient(135deg, #f97316, #fb923c)',
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
              onClick={() => onEdit?.(moduleId)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d2d2d7',
                backgroundColor: isEditing ? '#fff7ed' : 'transparent',
                color: isEditing ? '#ea580c' : '#86868b',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              ✏️ 编辑
            </button>
            <button
              onClick={() => onRegenerate?.(moduleId)}
              disabled={isRegenerating}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d2d2d7',
                backgroundColor: 'transparent',
                color: '#86868b',
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
      
      {/* AI 说明 */}
      <div style={{
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        marginBottom: '12px',
        fontSize: '13px',
        lineHeight: '1.5'
      }}>
        <span style={{ color: '#ea580c' }}>💡 AI说明：</span>
        <span style={{ color: '#515154' }}> {aiNote}</span>
      </div>

      {/* 内容区（可编辑状态） */}
      <div style={{
        position: 'relative',
        border: isEditing ? '2px dashed #f97316' : 'none',
        borderRadius: '8px',
        padding: isEditing ? '8px' : 0
      }}>
        {isEditing && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '10px',
            backgroundColor: '#f97316',
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

      {/* 理由说明 */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        fontSize: '12px',
        color: '#6e6e73',
        lineHeight: '1.5'
      }}>
        <span style={{ color: '#f59e0b' }}>📊 理由：</span> {reason}
      </div>

      {/* 状态选择器 */}
      <StatusSelector 
        moduleId={moduleId} 
        currentStatus={status} 
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

// 值显示框
export function ValueBox({ value, valueZh, subInfo }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '8px',
      backgroundColor: '#FAFAFA',
      border: '1px solid #d2d2d7'
    }}>
      <div style={{ fontSize: '15px', color: '#1d1d1f', fontWeight: '500', marginBottom: valueZh ? '6px' : 0 }}>
        {value}
      </div>
      {valueZh && (
        <div style={{ fontSize: '13px', color: '#6e6e73' }}>
          {valueZh}
        </div>
      )}
      {subInfo && (
        <div style={{ fontSize: '11px', color: '#86868b', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #d2d2d7' }}>
          {subInfo}
        </div>
      )}
    </div>
  );
}
