import React from 'react'

export default function Dashboard({ products, currentUser, onRefresh }) {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
          数据总览
        </h2>
        <p style={{ color: '#666' }}>
          欢迎回来，{currentUser?.name || '用户'}！角色：{currentUser?.role}
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          padding: '20px', 
          background: 'white', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            产品总数
          </h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6' }}>
            {products?.length || 0}
          </p>
        </div>

        <div style={{ 
          padding: '20px', 
          background: 'white', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            进行中
          </h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
            {products?.filter(p => p.status !== '可做货').length || 0}
          </p>
        </div>

        <div style={{ 
          padding: '20px', 
          background: 'white', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            已完成
          </h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#8b5cf6' }}>
            {products?.filter(p => p.status === '可做货').length || 0}
          </p>
        </div>
      </div>

      <div style={{ 
        padding: '20px', 
        background: 'white', 
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>
            最近产品
          </h3>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              style={{ 
                padding: '6px 12px', 
                background: '#3b82f6', 
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              刷新
            </button>
          )}
        </div>

        {!products || products.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            border: '2px dashed #e5e7eb',
            borderRadius: '8px',
            color: '#999'
          }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>📦 暂无产品数据</p>
            <p style={{ fontSize: '14px' }}>
              点击顶部"新建产品"按钮创建第一个产品
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products.slice(0, 10).map(product => (
              <div 
                key={product.id}
                style={{ 
                  padding: '15px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                <div>
                  <h4 style={{ fontWeight: '600', marginBottom: '5px', fontSize: '15px' }}>
                    {product.category || product.product_name || '未命名产品'}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#666' }}>
                    {product.develop_month ? `${product.develop_month} · ` : ''}
                    阶段{product.stage || 1}
                    {product.order_count ? ` · ${product.order_count}单` : ''}
                  </p>
                </div>
                <span style={{ 
                  padding: '4px 12px',
                  background: product.status === '可做货' ? '#dcfce7' : '#fef3c7',
                  color: product.status === '可做货' ? '#15803d' : '#a16207',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {product.status || '进行中'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
