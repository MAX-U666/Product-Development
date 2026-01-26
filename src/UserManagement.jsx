import React, { useEffect, useMemo, useState } from 'react'
import { fetchData, insertData, updateData, deleteData } from './api'
import { Plus, Pencil, Trash2, RefreshCcw } from 'lucide-react'

const ROLE_OPTIONS = ['管理员', '开发人员', '设计师', '内容人员', '业务人员']

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null) // user row or null
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: '业务人员',
    email: '',
  })

  const canManage = currentUser?.role === '管理员'

  async function load() {
    setLoading(true)
    try {
      const rows = await fetchData('users', { orderBy: 'id.asc' })
      setUsers(rows || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const k = String(q || '').trim().toLowerCase()
    if (!k) return users
    return users.filter(u => {
      const s = `${u.username || ''} ${u.name || ''} ${u.role || ''} ${u.email || ''}`.toLowerCase()
      return s.includes(k)
    })
  }, [q, users])

  function openCreate() {
    setEditing(null)
    setForm({ username: '', password: '', name: '', role: '业务人员', email: '' })
    setOpen(true)
  }

  function openEdit(u) {
    setEditing(u)
    setForm({
      username: u.username || '',
      password: u.password || '',
      name: u.name || '',
      role: u.role || '业务人员',
      email: u.email || '',
    })
    setOpen(true)
  }

  async function onSave() {
    if (!canManage) return alert('仅管理员可操作')

    const payload = {
      username: String(form.username || '').trim(),
      password: String(form.password || '').trim(),
      name: String(form.name || '').trim(),
      role: String(form.role || '').trim(),
      email: String(form.email || '').trim(),
    }

    if (!payload.username) return alert('用户名不能为空')
    if (!payload.password) return alert('密码不能为空')
    if (!payload.name) return alert('姓名不能为空')
    if (!payload.role) return alert('角色不能为空')

    try {
      if (editing?.id) {
        await updateData('users', editing.id, payload)
      } else {
        await insertData('users', [payload])
      }
      setOpen(false)
      await load()
    } catch (e) {
      console.error(e)
      alert('保存失败：请看控制台报错')
    }
  }

  async function onDelete(u) {
    if (!canManage) return alert('仅管理员可操作')
    const ok = window.confirm(`确定删除用户：${u.name || u.username || u.id} ？\n删除不可恢复。`)
    if (!ok) return
    try {
      await deleteData('users', u.id)
      await load()
    } catch (e) {
      console.error(e)
      alert('删除失败：请看控制台报错')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">用户管理</h2>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            title="刷新"
          >
            <RefreshCcw size={16} />
            刷新
          </button>

          {canManage && (
            <button
              onClick={openCreate}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow flex items-center gap-2"
            >
              <Plus size={16} />
              新增用户
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜索：用户名 / 姓名 / 角色 / 邮箱"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <div className="text-sm text-gray-500 whitespace-nowrap">
          共 {filtered.length} 人
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">用户名</th>
              <th className="px-6 py-3 text-left">姓名</th>
              <th className="px-6 py-3 text-left">角色</th>
              <th className="px-6 py-3 text-left">邮箱</th>
              <th className="px-6 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td className="px-6 py-6 text-gray-500" colSpan={5}>加载中...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-6 py-6 text-gray-500" colSpan={5}>暂无用户</td>
              </tr>
            ) : (
              filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-800">{u.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{u.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs">
                      {u.role || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-blue-600 hover:text-blue-800"
                        title="编辑"
                      >
                        <Pencil size={18} />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => onDelete(u)}
                          className="text-red-600 hover:text-red-800"
                          title="删除"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editing ? '编辑用户' : '新增用户'}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1 rounded-lg hover:bg-gray-100"
              >
                关闭
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <input
                value={form.username}
                onChange={e => setForm(s => ({ ...s, username: e.target.value }))}
                placeholder="用户名（username）"
                className="px-4 py-2 border rounded-lg"
              />
              <input
                value={form.password}
                onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
                placeholder="密码（password）"
                className="px-4 py-2 border rounded-lg"
              />
              <input
                value={form.name}
                onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                placeholder="姓名（name）"
                className="px-4 py-2 border rounded-lg"
              />

              <select
                value={form.role}
                onChange={e => setForm(s => ({ ...s, role: e.target.value }))}
                className="px-4 py-2 border rounded-lg"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value={form.role}>{form.role}</option>
              </select>

              <input
                value={form.email}
                onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
                placeholder="邮箱（email，可选）"
                className="px-4 py-2 border rounded-lg"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow"
              >
                保存
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              提醒：你现在的登录逻辑是直接匹配 users 表里的 username/password（明文）。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
