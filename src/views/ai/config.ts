import type { AIConfig, ToolDefinition } from './types'

export const aiConfig: AIConfig = {
  apiUrl: '/proxy/ai/chat/completions',
  model: 'mimo-v2.5-pro'
}

export const systemPrompt = `你是一位友好的 AI 助手，可以回答各种问题。请直接回答用户的问题，不需要额外说明格式。`

export const tools: ToolDefinition[] = [
  {
    name: 'extractConcepts',
    description: '当AI回答涉及技术概念、框架、术语等知识点时使用。此工具会提取回答中提到的关键技术概念，以便用户后续查看详情。注意：闲聊、问候等非技术内容不使用此工具。',
    parameters: {
      type: 'object',
      properties: {
        concepts: {
          type: 'array',
          description: '提取的技术概念列表',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '概念名称，如"Proxy"、"Vue3响应式原理"' },
              summary: { type: 'string', description: '一句话简介，20字以内' },
              details: { type: 'string', description: '详细解释，100字以内' },
              codeExample: { type: 'string', description: '代码示例，可选' }
            }
          }
        }
      },
      required: ['concepts']
    }
  }
]