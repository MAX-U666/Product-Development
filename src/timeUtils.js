// 时间工具函数 ——【展示层统一北京时间（Asia/Shanghai）】
// ⚠️ 仅用于展示 / 业务计算，不用于 created_at / updated_at 写入

const BEIJING_TZ = 'Asia/Shanghai'

/**
 * 将任何时间（UTC / Date / string）格式化为北京时间
 * @param {string|Date} input
 * @param {boolean} showSeconds 是否显示秒
 * @returns {string}
 */
export function formatBeijingTime(input, showSeconds = true) {
  if (!input) return '-'

  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return '-'

  return d.toLocaleString('zh-CN', {
    timeZone: BEIJING_TZ,
    hour12: false,
    ...(showSeconds ? {} : { second: undefined })
  })
}

/**
 * 获取当前北京时间的月份（YYYY-MM）
 * @returns {string} 例如 "2026-01"
 */
export function getCurrentBeijingMonth() {
  const now = new Date()

  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: BEIJING_TZ,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(now)

  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value

  return year && month ? `${year}-${month}` : ''
}

/**
 * 计算两个时间在【北京时间视角】下的天数差
 * @param {string|Date} startTime
 * @param {string|Date} endTime
 * @returns {number}
 */
export function calculateDaysDiff(startTime, endTime = new Date()) {
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0
  }

  // 转成北京时间“当天 00:00”的时间戳，再算天数
  const startBJ = new Date(start.toLocaleDateString('zh-CN', { timeZone: BEIJING_TZ }))
  const endBJ = new Date(end.toLocaleDateString('zh-CN', { timeZone: BEIJING_TZ }))

  const diffMs = endBJ - startBJ
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// ------------------------------------------------------------
// 兼容旧代码的导出（Dashboard / ProductDetail / ProductForm 等）
// ------------------------------------------------------------

/**
 * 兼容：Dashboard / ProductDetail 里常用的名称
 * - formatTime(x) => formatBeijingTime(x)
 */
export const formatTime = formatBeijingTime

/**
 * 获取当前北京时间（用于展示）
 * @returns {string}
 */
export function getCurrentTime() {
  return formatBeijingTime(new Date(), true)
}

/**
 * 兼容：Dashboard 里用的 getCurrentMonth（YYYY-MM）
 * @returns {string}
 */
export const getCurrentMonth = getCurrentBeijingMonth

/**
 * 获取当前北京时间的 ISO 字符串（用于写入 created_at 等）
 * 注意：JS 的 toISOString() 本质是 UTC，但这是最通用的存储格式。
 * 需要“展示北京时区”时，请用 formatBeijingTime。
 * @returns {string}
 */
export function getCurrentBeijingISO() {
  return new Date().toISOString()
}

// 兼容别名（有些代码会写 getCurrentTimeISO / getCurrentBeijingTimeISO）
export const getCurrentTimeISO = getCurrentBeijingISO
export const getCurrentBeijingTimeISO = getCurrentBeijingISO
