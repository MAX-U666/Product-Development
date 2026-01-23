// src/content/ContentVersionList.jsx
import { useEffect, useMemo, useState } from 'react'
import { formatBeijingTime } from '../timeUtils'
import { fetchVersionsByTask, setFinalVersion, markTaskDone } from '../api'
import ContentVersionNew from './ContentVersionNew'

export default function ContentVersionList({ taskId }) {
  const [versions, setVersions] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [err, setErr] = useState('')
  const nextNo = useMemo(() => (versions.at(-1)?.version_no || 0) + 1, [versions])

  async function load() {
    setErr('')
    const rows = await fetchVersionsByTask(taskId)
    setVersions(rows)
  }
  useEffect(() => { load().catch(e => setErr(String(e))) }, [taskId])

  async function onSetFinal(v) {
    setErr('')
    await setFinalVersion({ taskId, versionId: v.id })
    await markTaskDone(taskId)
    await load()
    alert('已设为最终版本 ✅')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>内容版本（v1/v2/v3…）</h3>
        <button onClick={() => setShowNew(true)}>+ 新建版本 v{nextNo}</button>
      </div>
      {err ? <div style={{ color: 'crimson' }}>{err}</div> : null}

      {versions.length === 0 ? <div>暂无版本，先建 v1</div> : null}

      {versions.map(v => (
        <div key={v.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <b>v{v.version_no}</b> {v.is_final ? '✅ FINAL' : ''}（{v.status}）
            </div>
            <button disabled={v.is_final} onClick={() => onSetFinal(v)}>
              设为最终版本
            </button>
          </div>

          <div style={{ marginTop: 6 }}><b>标题：</b>{v.title || '-'}</div>
          <div style={{ marginTop: 6, opacity: 0.8 }}><b>创建：</b>{formatBeijingTime(v.created_at)}</div>
          <details style={{ marginTop: 8 }}>
            <summary>查看文案 / 图片需求</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{v.copy || ''}</pre>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(v.image_brief || {}, null, 2)}</pre>
          </details>
        </div>
      ))}

      {showNew ? (
        <ContentVersionNew
          taskId={taskId}
          versionNo={nextNo}
          onClose={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false)
            await load()
          }}
        />
      ) : null}
    </div>
  )
}
