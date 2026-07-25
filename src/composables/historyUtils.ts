export interface HistoryItem {
  id: number
  title: string
  url: string
  visitedAt: number
  favicon?: string
}

export interface HistoryGroup {
  label: string
  items: HistoryItem[]
}

// 按时间筛选
export function filterByTime(items: HistoryItem[], filter: string): HistoryItem[] {
  if (filter === 'all') return items

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const weekStart = todayStart - 7 * 86400000

  switch (filter) {
    case 'today':
      return items.filter(item => item.visitedAt >= todayStart)
    case 'yesterday':
      return items.filter(item => item.visitedAt >= yesterdayStart && item.visitedAt < todayStart)
    case 'week':
      return items.filter(item => item.visitedAt >= weekStart && item.visitedAt < yesterdayStart)
    case 'older':
      return items.filter(item => item.visitedAt < weekStart)
    default:
      return items
  }
}

// 按时间分组
export function groupByTime(items: HistoryItem[]): HistoryGroup[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const weekStart = todayStart - 7 * 86400000

  const groups: Record<string, HistoryItem[]> = {
    '今天': [], '昨天': [], '上周': [], '更早': []
  }

  for (const item of items) {
    if (item.visitedAt >= todayStart) groups['今天'].push(item)
    else if (item.visitedAt >= yesterdayStart) groups['昨天'].push(item)
    else if (item.visitedAt >= weekStart) groups['上周'].push(item)
    else groups['更早'].push(item)
  }

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

// 搜索历史记录
export function searchHistory(items: HistoryItem[], keyword: string): HistoryItem[] {
  if (!keyword.trim()) return items

  const lowerKeyword = keyword.toLowerCase()
  return items.filter(item =>
    item.url.toLowerCase().includes(lowerKeyword) ||
    item.title.toLowerCase().includes(lowerKeyword)
  )
}
