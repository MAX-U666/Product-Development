// src/content/ContentFinalView.jsx
import { useEffect, useState } from 'react'
import { fetchFinalVersion } from '../api'
import { formatBeijingTime } from '../timeUtils'

export default function ContentFinalView({ taskId }) {
  const [finalV, setFinalV] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    setErr('')
    const v = await fetchFinalVersion(taskId)
    setFinalV(v)
  }

  useEffect(() => { load().catch(e => setErr(String(e))) }, [taskId])

  return (
    <div style={{ border: '2px solid #0a0', padding: 12 }}>
      <h3>最终版本（业务只读）</h3>
      {err ? <div style={{ color: 'crimson' }}>{err}</div> : null}
      {!finalV ? (
        <div>暂无最终版本（先在下方版本列表里“设为最终版本”）</div>
      ) : (
        <>
          <div><b>版本：</b>v{finalV.version_no}</div>
          <div><b>创建：</b>{formatBeijingTime(finalV.created_at)}</div>
          <div style={{ marginTop: 8 }}><b>标题：</b>{finalV.title}</div>
          <div style={{ marginTop: 8 }}><b>文案：</b></div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{finalV.copy || ''}</pre>
          <div style={{ marginTop: 8 }}><b>图片需求表：</b></div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(finalV.image_brief || {}, null, 2)}</pre>
        </>
      )}
    </div>
  )
}
