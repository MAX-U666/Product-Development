// src/components/ai-create/CompetitorCard.jsx
// 竞品卡片组件 - 含详细的提取结果展示
import React from 'react';
import { Link, Upload, Image as ImageIcon } from 'lucide-react';

export default function CompetitorCard({ 
  index, 
  competitor, 
  isExtracting,
  onUpdateCompetitor,
  onExtract,
  onImageUpload,
  fileInputRef,
  platform = 'Shopee'
}) {
  const { mode, url, images, data, loading, success, error } = competitor;

  return (
    <div style={{
      padding: '12px',
      borderRadius: '10px',
      backgroundColor: success ? '#f0fdf4' : '#FFFFFF',
      border: success ? '2px solid #10b981' : '1px solid #e5e5ea',
      marginBottom: '10px'
    }}>
      {/* 头部标识 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: success ? '#10b981' : '#d2d2d7',
          color: success ? 'white' : '#6e6e73',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>{index + 1}</span>
        <span style={{ 
          fontSize: '12px', 
          color: success ? '#10b981' : '#6e6e73', 
          fontWeight: '500' 
        }}>
          竞品 {index + 1} {success ? '✓ 已提取' : ''}
        </span>
      </div>
      
      {/* 模式切换 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <button
          onClick={() => onUpdateCompetitor(index, { mode: 'url', images: [], success: false, data: null, error: '' })}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '6px',
            border: mode === 'url' ? '2px solid #f97316' : '1px solid #d2d2d7',
            backgroundColor: mode === 'url' ? '#fff7ed' : 'transparent',
            color: mode === 'url' ? '#ea580c' : '#86868b',
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
          onClick={() => onUpdateCompetitor(index, { mode: 'image', url: '', success: false, data: null, error: '' })}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '6px',
            border: mode === 'image' ? '2px solid #f97316' : '1px solid #d2d2d7',
            backgroundColor: mode === 'image' ? '#fff7ed' : 'transparent',
            color: mode === 'image' ? '#ea580c' : '#86868b',
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder={`粘贴 ${platform} 商品链接...`}
            value={url}
            onChange={(e) => onUpdateCompetitor(index, { url: e.target.value })}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e5ea',
              backgroundColor: '#FAFAFA',
              color: '#1d1d1f',
              fontSize: '12px'
            }}
          />
          <button
            onClick={() => onExtract(index)}
            disabled={!url || isExtracting}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isExtracting ? '#d2d2d7' : (success ? '#10b981' : '#f97316'),
              color: 'white',
              fontSize: '12px',
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
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => onImageUpload(index, e.target.files)}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => fileInputRef?.current?.click()}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '6px',
                border: '2px dashed #d2d2d7',
                backgroundColor: 'transparent',
                color: '#86868b',
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
                onClick={() => onExtract(index)}
                disabled={isExtracting}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isExtracting ? '#d2d2d7' : '#f97316',
                  color: 'white',
                  fontSize: '12px',
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
          padding: '10px',
          borderRadius: '6px',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          fontSize: '12px',
          marginTop: '10px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '6px'
        }}>
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {/* ========== 提取结果 - 详细展示 ========== */}
      {data && (
        <ExtractedDataDisplay data={data} />
      )}
    </div>
  );
}

// 提取结果详细展示组件
function ExtractedDataDisplay({ data }) {
  return (
    <div style={{
      marginTop: '12px',
      borderRadius: '10px',
      backgroundColor: '#FAFAFA',
      border: '1px solid #e5e5ea',
      overflow: 'hidden'
    }}>
      {/* 头部：图片 + 基础信息 */}
      <div style={{
        padding: '12px',
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid #e5e5ea',
        backgroundColor: '#fff'
      }}>
        {/* 产品图片 */}
        {data.imageUrl && (
          <img 
            src={data.imageUrl} 
            alt={data.name}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid #e5e5ea',
              flexShrink: 0
            }}
          />
        )}
        
        {/* 基础信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 产品名称 */}
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#1d1d1f',
            marginBottom: '6px',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {data.name || '未获取到名称'}
          </div>
          
          {/* 品牌 */}
          {data.brand && (
            <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '6px' }}>
              品牌: <span style={{ color: '#6e6e73', fontWeight: '500' }}>{data.brand}</span>
            </div>
          )}
          
          {/* 价格 + 规格 */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '10px', 
            fontSize: '12px'
          }}>
            {data.price && (
              <span style={{ 
                color: '#ea580c', 
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                💰 {data.price}
                {data.originalPrice && data.originalPrice !== data.price && (
                  <span style={{ 
                    color: '#86868b', 
                    textDecoration: 'line-through',
                    fontWeight: '400',
                    fontSize: '11px'
                  }}>
                    {data.originalPrice}
                  </span>
                )}
              </span>
            )}
            {data.volume && (
              <span style={{ color: '#6e6e73' }}>📦 {data.volume}</span>
            )}
          </div>
          
          {/* 销售数据 */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '10px', 
            fontSize: '11px',
            color: '#86868b',
            marginTop: '6px'
          }}>
            {data.rating && (
              <span>⭐ {data.rating}</span>
            )}
            {data.reviewCount && (
              <span>💬 {typeof data.reviewCount === 'number' ? data.reviewCount.toLocaleString() : data.reviewCount}</span>
            )}
            {data.sales && (
              <span>🛒 {data.sales}</span>
            )}
          </div>
        </div>
      </div>

      {/* 标题/关键词 */}
      {data.title && (
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid #e5e5ea',
          backgroundColor: '#fff'
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: '#3b82f6', 
            marginBottom: '6px',
            fontWeight: '600'
          }}>
            📝 完整标题
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#1d1d1f',
            lineHeight: '1.5'
          }}>
            {data.title}
          </div>
          {data.titleKeywords && data.titleKeywords.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {data.titleKeywords.map((kw, i) => (
                <span key={i} style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#eff6ff',
                  color: '#3b82f6',
                  fontSize: '11px'
                }}>{kw}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 核心卖点 */}
      {data.sellingPoints && data.sellingPoints.length > 0 && (
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid #e5e5ea',
          backgroundColor: '#fff'
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: '#10b981', 
            marginBottom: '6px',
            fontWeight: '600'
          }}>
            ⭐ 核心卖点
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '16px',
            fontSize: '12px',
            color: '#1d1d1f',
            lineHeight: '1.6'
          }}>
            {data.sellingPoints.slice(0, 5).map((sp, i) => (
              <li key={i} style={{ marginBottom: '3px' }}>
                {typeof sp === 'string' ? sp : sp.point || sp.text || JSON.stringify(sp)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 兼容旧的 benefits 字段 */}
      {!data.sellingPoints?.length && data.benefits && data.benefits.length > 0 && (
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid #e5e5ea',
          backgroundColor: '#fff'
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: '#10b981', 
            marginBottom: '6px',
            fontWeight: '600'
          }}>
            ⭐ 产品卖点
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '16px',
            fontSize: '12px',
            color: '#1d1d1f',
            lineHeight: '1.6'
          }}>
            {data.benefits.slice(0, 5).map((b, i) => (
              <li key={i} style={{ marginBottom: '3px' }}>
                {typeof b === 'string' ? b : b.text || JSON.stringify(b)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 主打成分 */}
      {data.ingredients && (
        <div style={{
          padding: '10px 12px',
          backgroundColor: '#fff'
        }}>
          <div style={{ 
            fontSize: '11px', 
            color: '#8b5cf6', 
            marginBottom: '6px',
            fontWeight: '600'
          }}>
            🧪 成分信息
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#6e6e73',
            lineHeight: '1.5'
          }}>
            {typeof data.ingredients === 'string' 
              ? data.ingredients 
              : Array.isArray(data.ingredients) 
                ? data.ingredients.map(i => typeof i === 'string' ? i : i.name || i).join(', ')
                : JSON.stringify(data.ingredients)
            }
          </div>
        </div>
      )}

      {/* 如果数据不完整的提示 */}
      {!data.sellingPoints?.length && !data.benefits?.length && !data.ingredients && (
        <div style={{
          padding: '10px 12px',
          backgroundColor: '#fff7ed',
          fontSize: '11px',
          color: '#ea580c'
        }}>
          ⚠️ 仅提取到基础信息，完整分析请使用「竞品分析」功能
        </div>
      )}
    </div>
  );
}
