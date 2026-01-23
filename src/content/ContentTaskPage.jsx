// src/content/ContentTaskPage.jsx
import { useEffect, useState } from 'react'
import { formatBeijingTime } from '../timeUtils'
import { fetchContentTasksByProduct, createContentTask } from '../api'
import ContentVersionList from './ContentVersionList'
import ContentFinalView from './ContentFinalView'

export default function ContentTaskPage({ productId, createdBy = null }) {
  const [tasks, setTasks] = useState([])
  const [activeTask, setActiveTask] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    setErr('')
    const rows = await fetchContentTasksByProduct(productId)
    setTasks(rows)
    setActiveTask(rows[0] || null)
  }

  useEffect(() => { load().catch(e => setErr(String(e))) }, [productId])

  async function onCreateTask() {
    setErr('')
    const t = await createContentTask({ productId, createdBy })
    setTasks([t, ...tasks])
    setActiveTask(t)
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>内容任务</h2>
      {err ? <div style={{ color: 'crimson' }}>{err}</div> : null}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={onCreateTask}>+ 创建内容任务</button>
        <div style={{ opacity: 0.7 }}>产品ID：{productId}</div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
        <div style={{ width: 320 }}>
          <h3>任务列表</h3>
          {tasks.length === 0 ? <div>暂无任务</div> : null}
          {tasks.map(t => (
            <div
              key={t.id}
              onClick={() => setActiveTask(t)}
              style={{
                padding: 10,
                marginBottom: 8,
                border: '1px solid #ddd',
                cursor: 'pointer',
                background: activeTask?.id === t.id ? '#f6f6f6' : 'white',
              }}
            >
              <div><b>状态：</b>{t.status}</div>
              <div><b>创建：</b>{formatBeijingTime(t.created_at)}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{t.id}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          {!activeTask ? (
            <div>请选择一个任务</div>
          ) : (
            <>
              <ContentFinalView taskId={activeTask.id} />
              <div style={{ height: 12 }} />
              <ContentVersionList taskId={activeTask.id} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
