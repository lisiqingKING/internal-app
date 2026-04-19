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
export { useMemory } from './composables/useMemory'
export { useStream } from './composables/useStream'
export { useToolHandler } from './composables/useToolHandler'
export { useChatHistory } from './composables/useChatHistory'