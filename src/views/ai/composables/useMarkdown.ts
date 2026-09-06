import { marked } from 'marked'
import hljs from 'highlight.js'

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  const langLabel = lang || 'text'
  return `<pre class="code-block" data-lang="${langLabel}"><code class="hljs language-${language}">${highlighted}</code></pre>`
}
marked.use({ renderer, gfm: true, breaks: true })

export function useMarkdown() {
  function renderMarkdown(content: string): string {
    return marked.parse(content) as string
  }
  return { renderMarkdown }
}
