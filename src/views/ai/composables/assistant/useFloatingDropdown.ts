import { ref, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export interface FloatingDropdown {
  /** 浮层是否展开 */
  open: Ref<boolean>
  /** 浮层定位样式（position: fixed，挂在 body 上） */
  style: Ref<Record<string, string>>
  /** 切换展开状态；anchorEl 为触发元素 */
  toggle: (anchorEl: HTMLElement) => void
  /** 收起浮层 */
  close: () => void
}

/**
 * 挂在 body 上的浮层下拉。
 *
 * 不能就地渲染：辅助面板的区域都带 overflow: hidden，内联的下拉会被裁掉；
 * 用 fixed 定位 + Teleport 挂在 body 上，浮层才不会被面板裁剪。
 */
export function useFloatingDropdown(): FloatingDropdown {
  const open = ref(false)
  const style = ref<Record<string, string>>({})
  let anchorEl: HTMLElement | null = null

  function update() {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    style.value = {
      position: 'fixed',
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      minWidth: `${rect.width}px`,
      maxWidth: '420px',
    }
  }

  function toggle(el: HTMLElement) {
    anchorEl = el
    if (open.value) {
      open.value = false
      return
    }
    update()
    open.value = true
  }

  function close() {
    open.value = false
  }

  // 面板宽度可拖拽、页面可滚动，浮层要跟着触发元素走
  useEventListener(window, 'resize', () => {
    if (open.value) update()
  })
  useEventListener(window, 'scroll', () => {
    if (open.value) update()
  }, true)

  return { open, style, toggle, close }
}
