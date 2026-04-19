import { ref } from 'vue'
import type { ToolCallBuffer, Concept } from '../types'

export function useToolHandler() {
  const buffer = ref<Record<string, ToolCallBuffer>>({})
  const extractedConcepts = ref<Concept[]>([])

  function accumulate(toolCalls: Array<{ id?: string; index: number; function: { name: string; arguments: string } }>) {
    for (const tc of toolCalls) {
      const key = tc.id || `index_${tc.index}`
      if (!buffer.value[key]) {
        buffer.value[key] = { name: tc.function.name, arguments: '' }
      }
      buffer.value[key].arguments += tc.function.arguments || ''
    }
  }

  function execute(): { results: string[]; concepts: Concept[] } {
    const results: string[] = []
    extractedConcepts.value = []

    for (const [, tc] of Object.entries(buffer.value)) {
      try {
        const rawArgs = tc.arguments.trim()
        // 检查是否看起来像完整的 JSON
        if (!rawArgs.startsWith('{') || !rawArgs.endsWith('}')) {
          console.warn('arguments 不完整:', rawArgs)
          continue
        }
        const args = JSON.parse(rawArgs)
        if (tc.name === 'extractConcepts' && args.concepts) {
          extractedConcepts.value = args.concepts
          results.push(`📚 已提取 ${args.concepts.length} 个技术概念，点击查看`)
        }
      } catch (e) {
        console.warn('工具执行失败或参数不完整:', tc.name, e)
      }
    }
    buffer.value = {}
    return { results, concepts: extractedConcepts.value }
  }

  function getConcepts(): Concept[] {
    return extractedConcepts.value
  }

  return { buffer, accumulate, execute, getConcepts }
}