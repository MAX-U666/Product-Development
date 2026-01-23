import { useEffect, useMemo, useState } from 'react'
import ContentTaskPage from './ContentTaskPage'

export default function ContentManage({ products = [], currentUser }) {
  const options = useMemo(() => {
    return (products || []).map(p => ({
      id: p.id,
      name: p.category || p.product_name || p.name || p.id,
    }))
  }, [products])

  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (!selectedId && options[0]?.id) {
      setSelectedId(options[0].id)
    }
  }, [options, selectedId])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">内容管理</h2>

      <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
        <div className="text-sm text-gray-600">选择产品：</div>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          {options.map(o => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <div className="text-xs text-gray-400 ml-auto">
          当前用户：{currentUser?.role} - {currentUser?.name}
        </div>
      </div>

      {selectedId ? (
        <div className="bg-white rounded-xl shadow p-4">
          <ContentTaskPage productId={selectedId} createdBy={currentUser?.id || null} />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
          暂无产品，请先创建产品
        </div>
      )}
    </div>
  )
}
