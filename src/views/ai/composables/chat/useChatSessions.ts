import { computed, onUnmounted } from 'vue'
import { useChatHistory } from './useChatHistory'
import { createChatService, type ChatService } from './useChatService'

/**
 * 会话管理：整合会话 CRUD 与每个会话的 ChatService 实例。
 */
export function useChatSessions() {
  const {
    sessions,
    currentSessionId,
    loadingMore,
    hasMore,
    init,
    loadMore,
    createSession: createHistorySession,
    getCurrentSession,
    switchSession: switchHistorySession,
    deleteSession: deleteHistorySession,
    updateCurrentMessages,
    togglePin,
    updateSessionTitle,
  } = useChatHistory()

  const services = new Map<string, ChatService>()

  function getOrCreateService(convId: string): ChatService | null {
    const session = sessions.value.find(s => s.convId === convId)
    if (!session) return null
    if (!services.has(convId)) {
      services.set(convId, createChatService(session))
    }
    return services.get(convId)!
  }

  const currentService = computed<ChatService | null>(() => {
    if (!currentSessionId.value) return null
    return getOrCreateService(currentSessionId.value)
  })

  async function initSessions() {
    await init()
    if (sessions.value.length > 0) {
      switchHistorySession(sessions.value[0].convId)
    }
  }

  async function createSession() {
    const session = await createHistorySession()
    switchHistorySession(session.convId)
    getOrCreateService(session.convId)
    return session
  }

  function switchSession(convId: string) {
    switchHistorySession(convId)
    getOrCreateService(convId)?.syncFromSession()
  }

  async function deleteSession(convId: string) {
    services.get(convId)?.dispose()
    services.delete(convId)
    await deleteHistorySession(convId)
  }

  function disposeAll() {
    for (const service of services.values()) {
      service.dispose()
    }
    services.clear()
  }

  onUnmounted(disposeAll)

  return {
    sessions,
    currentSessionId,
    currentService,
    loadingMore,
    hasMore,
    initSessions,
    loadMore,
    createSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    togglePin,
    updateCurrentMessages,
    getCurrentSession,
    disposeAll,
  }
}
