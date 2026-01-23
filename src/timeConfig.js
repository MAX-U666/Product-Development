// 时间配置（统一出口）
// 说明：项目里曾出现 timeUtils / utils / timeConfig 多个文件并存。
// 为了避免构建期因导入路径不同而报错，这里作为“唯一公共入口”，
// 把外部组件需要的函数都从 timeUtils 重新导出。

export {
  // 展示层
  formatBeijingTime,
  getCurrentBeijingMonth,
  calculateDaysDiff,

  // 兼容旧命名
  formatTime,
  getCurrentTime,
  getCurrentMonth,
  getCurrentBeijingISO,
  getCurrentTimeISO,
  getCurrentBeijingTimeISO
} from './timeUtils'
