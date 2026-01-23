// src/content/ContentVersionNew.jsx
import { useState } from 'react'
import { createContentVersion } from '../api'
import { defaultImageBrief } from './imageBriefSchema'

export default function ContentVersionNew({ taskId, versionNo, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [copy, setCopy] = useState('')
  const [imageBrief, setImageBrief] = useState(JSON.stringify(defaultImageBrief(), null, 2))
  const [err, setErr] = useState('')

  async function onSubmit() {
    setErr('')
    let briefObj = null
    try { briefObj = JSON.parse(imageBrief) } catch { setErr('图片需求表不是合法 JSON'); return }

    const payload = {
      task_id: taskId,
      version_no: versionNo,
      is_final: false,
      status: 'draft',
      title,
      copy,
      image_brief: briefObj,
    }

    await createContentVersion(payload)
    await onCreated?.()
  }

  return (
    <div style={{ border: '2px solid #333', padding: 12, marginTop: 12 }}>
      <h4>新建版本 v{versionNo}</h4>
      {err ? <div style={{ color: 'crimson' }}>{err}</div> : null}

      <div style={{ marginTop: 8 }}>
        <div>标题</div>
        <textarea value={title} onChange={e => setTitle(e.target.value)} rows={2} style={{ width: '100%' }} />
      </div>

      <div style={{ marginTop: 8 }}>
        <div>文案（可 Markdown）</div>
        <textarea value={copy} onChange={e => setCopy(e.target.value)} rows={8} style={{ width: '100%' }} />
      </div>

      <div style={{ marginTop: 8 }}>
        <div>图片需求表（JSON）</div>
        <textarea value={imageBrief} onChange={e => setImageBrief(e.target.value)} rows={10} style={{ width: '100%' }} />
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button onClick={onSubmit}>保存版本</button>
        <button onClick={onClose}>取消</button>
      </div>
    </div>
  )
}
