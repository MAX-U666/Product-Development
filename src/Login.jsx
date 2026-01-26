import React, { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { fetchData } from './api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // 从数据库加载用户
  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const data = await fetchData('users')
      console.log('加载用户数据:', data)
      setUsers(data || [])
    } catch (err) {
      console.error('加载用户失败:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  function handleLogin() {
    const u = String(username || '').trim().toLowerCase()
    const p = String(password || '').trim()

    // 查找匹配的用户
    const user = users.find(x => 
      String(x.username || '').trim().toLowerCase() === u && 
      String(x.password || '').trim() === p
    )

    if (user) {
      // 保存到 localStorage
      localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email
      }))
      onLogin?.(user)
      return
    }

    // 提示错误
    const exists = users.some(x => 
      String(x.username || '').trim().toLowerCase() === u
    )
    alert(exists ? '密码错误' : '用户名不存在')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLogin()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Package className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">产品开发管理系统</h1>
          <p className="text-gray-600">请登录您的账户</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="请输入密码"
            />
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            登录
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
    
  
          <p className="text-xs text-gray-400 mt-2">
            数据库已加载 {users.length} 个用户
          </p>
        </div>
      </div>
    </div>
  )
}
