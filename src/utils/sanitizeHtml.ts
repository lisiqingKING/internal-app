/**
 * 笔记富文本消毒：过滤 <script> / on* 事件属性 / javascript: URL。
 * 对应需求文档 docs/ASSISTANT_PANEL.md 的 NFR-S2。
 */
const FORBIDDEN_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base']
const URL_ATTRIBUTES = ['href', 'src', 'xlink:href', 'formaction']

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')

  for (const element of Array.from(doc.body.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase()
    if (FORBIDDEN_TAGS.includes(tag)) {
      element.remove()
      continue
    }
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on')) {
        element.removeAttribute(attr.name)
        continue
      }
      if (URL_ATTRIBUTES.includes(name) && /^\s*javascript:/i.test(attr.value)) {
        element.removeAttribute(attr.name)
      }
    }
  }

  return doc.body.innerHTML
}
