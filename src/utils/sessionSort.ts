import type { ChatSession } from '@/views/ai/types'

/**
 * 会话列表排序：置顶优先，再按创建时间倒序
 */
export function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return (b.pinned || 0) - (a.pinned || 0)
    return b.createdAt - a.createdAt
  })
}
