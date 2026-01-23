// 时区工具函数

// 格式化北京时间
export function formatBeijingTime(time) {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

// 简短格式（月-日 时:分）
export function formatBeijingTimeShort(time) {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
}

// 计算时长
export function calculateDuration(start, end) {
  if (!start) return '-'
  const endTime = end ? new Date(end) : new Date()
  const startTime = new Date(start)
  const hours = Math.floor((endTime - startTime) / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  
  if (days > 0) return `${days}天${remainHours}小时`
  return `${hours}小时`
}

// 获取当前北京时间的ISO字符串
export function getCurrentBeijingTimeISO() {
  return new Date().toISOString()
}
