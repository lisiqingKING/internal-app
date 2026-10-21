import { sanitizeHtml } from './sanitizeHtml'

/**
 * 在已消毒的 HTML 中把关键词包进 <mark>。
 * FTS 片段自带 <mark> 时原样返回（避免重复标记）。
 */
export function highlightKeyword(html: string, keyword: string): string {
  const safe = sanitizeHtml(html)
  const kw = keyword.trim()
  if (!kw) return safe
  if (safe.includes('<mark>')) return safe

  const doc = new DOMParser().parseFromString(safe, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  const needle = kw.toLowerCase()
  for (const node of nodes) {
    const text = node.nodeValue ?? ''
    const lower = text.toLowerCase()
    if (!lower.includes(needle)) continue

    const frag = doc.createDocumentFragment()
    let pos = 0
    while (pos < text.length) {
      const idx = lower.indexOf(needle, pos)
      if (idx === -1) {
        frag.appendChild(doc.createTextNode(text.slice(pos)))
        break
      }
      if (idx > pos) frag.appendChild(doc.createTextNode(text.slice(pos, idx)))
      const mark = doc.createElement('mark')
      mark.textContent = text.slice(idx, idx + kw.length)
      frag.appendChild(mark)
      pos = idx + kw.length
    }
    node.parentNode?.replaceChild(frag, node)
  }

  return doc.body.innerHTML
}
