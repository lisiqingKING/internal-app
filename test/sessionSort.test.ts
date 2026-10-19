import { describe, it, expect } from 'vitest'
import type { ChatSession } from '../src/views/ai/types'
import { PINNED_CATEGORY_ID } from '../src/views/ai/types'
import { sortSessions } from '../src/utils/sessionSort'

describe('sortSessions', () => {
  const makeSession = (partial: Partial<ChatSession>): ChatSession => ({
    convId: '',
    title: '',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    categoryId: null,
    ...partial,
  })

  it('should return empty array as-is', () => {
    expect(sortSessions([])).toEqual([])
  })

  it('should sort by createdAt descending when no pinned', () => {
    const sessions = [
      makeSession({ convId: 'a', createdAt: 100 }),
      makeSession({ convId: 'b', createdAt: 300 }),
      makeSession({ convId: 'c', createdAt: 200 }),
    ]
    const result = sortSessions(sessions)
    expect(result.map(s => s.convId)).toEqual(['b', 'c', 'a'])
  })

  it('should place pinned sessions first', () => {
    const sessions = [
      makeSession({ convId: 'a', createdAt: 100 }),
      makeSession({ convId: 'b', createdAt: 300, categoryId: PINNED_CATEGORY_ID }),
      makeSession({ convId: 'c', createdAt: 200 }),
    ]
    const result = sortSessions(sessions)
    expect(result.map(s => s.convId)).toEqual(['b', 'c', 'a'])
  })

  it('should sort pinned by createdAt descending within pinned group', () => {
    const sessions = [
      makeSession({ convId: 'a', createdAt: 100, categoryId: PINNED_CATEGORY_ID }),
      makeSession({ convId: 'b', createdAt: 300, categoryId: PINNED_CATEGORY_ID }),
      makeSession({ convId: 'c', createdAt: 200 }),
    ]
    const result = sortSessions(sessions)
    expect(result.map(s => s.convId)).toEqual(['b', 'a', 'c'])
  })

  it('should not mutate original array', () => {
    const sessions = [
      makeSession({ convId: 'a', createdAt: 100 }),
      makeSession({ convId: 'b', createdAt: 200 }),
    ]
    const original = [...sessions]
    sortSessions(sessions)
    expect(sessions).toEqual(original)
  })
})
