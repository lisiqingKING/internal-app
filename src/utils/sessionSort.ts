import type { ChatSession } from '@/views/ai/types'
import { PINNED_CATEGORY_ID } from '@/views/ai/types'

/**
 * 会话列表排序：置顶优先，再按创建时间倒序
 */
export function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => {
    const pinnedA = a.categoryId === PINNED_CATEGORY_ID ? 1 : 0
    const pinnedB = b.categoryId === PINNED_CATEGORY_ID ? 1 : 0
    if (pinnedA !== pinnedB) return pinnedB - pinnedA
    return b.createdAt - a.createdAt
  })
}
