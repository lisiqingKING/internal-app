export { default as AiChat } from './components/AiChat.vue'
export { aiConfig, tools } from './config'
export type {
  AIConfig,
  Message,
  ToolDefinition,
  SSEChunk,
  ToolCall,
  ToolCallBuffer,
  ChatSession
} from './types'
export { useChatHistory } from './composables/chat/useChatHistory'