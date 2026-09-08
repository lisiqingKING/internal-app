import { ref, type ComputedRef } from 'vue'
import type { Message } from '@/views/ai/types'
import type { ChatService } from './useChatService'

interface UseChatActionsOptions {
  currentService: ComputedRef<ChatService | null>
  updateCurrentMessages: (messages: Message[]) => Promise<void>
  onSent?: () => void
}

/**
 * 消息操作：发送、取消、重试、复制、删除。
 */
export function useChatActions(options: UseChatActionsOptions) {
  const { currentService, updateCurrentMessages, onSent } = options
  const inputText = ref('')
  const lastSentMessage = ref('')

  async function send(msg?: string) {
    const message = msg || inputText.value.trim()
    const service = currentService.value
    if (!message || !service || service.state.loading) return

    lastSentMessage.value = message
    inputText.value = ''
    await service.sendMessage(message)

    if (service.state.chatHistory.length > 0) {
      service.syncState()
      await updateCurrentMessages(service.state.chatHistory)
    }
    onSent?.()
  }

  function cancel() {
    currentService.value?.cancelRequest()
  }

  function retry() {
    currentService.value?.clearError()
    if (lastSentMessage.value) {
      send(lastSentMessage.value)
    }
  }

  async function copy(index: number) {
    const service = currentService.value
    if (!service) return
    const msg = service.state.chatHistory[index]
    if (!msg) return
    await navigator.clipboard.writeText(msg.content)
  }

  async function remove(index: number) {
    const service = currentService.value
    if (!service) return
    service.state.chatHistory.splice(index, 1)
    service.syncState()
    await updateCurrentMessages(service.state.chatHistory)
  }

  return {
    inputText,
    send,
    cancel,
    retry,
    copy,
    remove,
  }
}
