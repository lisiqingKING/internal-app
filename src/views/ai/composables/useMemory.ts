import { ref } from 'vue'
import type { Message } from '../types'

export function useMemory() {
  const messages = ref<Message[]>([])

  function addUser(content: string) {
    messages.value.push({ role: 'user', content })
  }

  function addAssistant(content: string) {
    messages.value.push({ role: 'assistant', content })
  }

  function getMessages() {
    return messages.value
  }

  function clear() {
    messages.value = []
  }

  return {
    messages,
    addUser,
    addAssistant,
    getMessages,
    clear
  }
}