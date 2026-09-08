import { ref, nextTick } from 'vue'

const NEAR_BOTTOM_THRESHOLD = 80

/**
 * 粘底滚动：判断用户是否停在底部，停在底部则新内容自动跟随。
 * 同时提供虚拟滚动测量完成后的 resize 兜底滚底。
 */
export function useStickyScroll() {
  const scrollRef = ref<HTMLElement>()
  const isNearBottom = ref(true)

  function onScroll() {
    const el = scrollRef.value
    if (!el) return
    isNearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD
  }

  async function scrollToBottom() {
    await nextTick()
    const el = scrollRef.value
    if (!el) return
    const stick = () => {
      if (!isNearBottom.value) return
      el.scrollTop = el.scrollHeight
    }
    stick()
    requestAnimationFrame(stick)
    requestAnimationFrame(stick)
    setTimeout(stick, 100)
    setTimeout(stick, 300)
    setTimeout(stick, 600)
  }

  /** 强制滚动到底部，切换会话时使用 */
  async function forceScrollToBottom() {
    await nextTick()
    const el = scrollRef.value
    if (!el) return
    const doScroll = () => { el.scrollTop = el.scrollHeight }
    doScroll()
    requestAnimationFrame(doScroll)
    requestAnimationFrame(doScroll)
    setTimeout(doScroll, 100)
    setTimeout(doScroll, 300)
    setTimeout(doScroll, 600)
  }

  /** 虚拟滚动 item 高度测量完成后，如果粘底则跟随到底部 */
  function onResize() {
    if (!isNearBottom.value) return
    nextTick(() => {
      const el = scrollRef.value
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  return {
    scrollRef,
    isNearBottom,
    onScroll,
    scrollToBottom,
    forceScrollToBottom,
    onResize,
  }
}
