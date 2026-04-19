import type { SSEChunk } from '../types'

export function useStream() {
  async function* parseSSE(response: Response): AsyncGenerator<SSEChunk> {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()!

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6)
        if (jsonStr.trim() === '[DONE]') return
        try {
          yield JSON.parse(jsonStr) as SSEChunk
        } catch (e) {
          // ignore parse error
        }
      }
    }
  }

  return { parseSSE }
}