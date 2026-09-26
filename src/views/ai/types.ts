// AI 模块配置
export interface AIConfig {
  apiUrl: string
  model: string
}

// 对话消息
export interface Message {
  msgId: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  createdAt?: number
}

// 工具定义
export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required: string[]
  }
}

// SSE chunk 数据
export interface SSEChunk {
  id: string
  choices: Array<{
    index: number
    delta: {
      content?: string
      reasoning_content?: string
      tool_calls?: ToolCall[]
    }
    finish_reason?: string
  }>
  model: string
}

// 工具调用片段
export interface ToolCall {
  id?: string
  index: number
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

// 工具调用缓存
export interface ToolCallBuffer {
  name: string
  arguments: string
}

// 对话会话
export interface ChatSession {
  convId: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  pinned?: number
  isLoading?: boolean
  abortController?: AbortController
  hasNewMessages?: boolean  // 是否有未审查的新消息
}

// 技术概念
export interface Concept {
  name: string
  summary: string
  details: string
  codeExample?: string
}

// 校验常量
export const ILLEGAL_CHARS = /[\\/:*?"<>|]/
export const MAX_TITLE_LENGTH = 50