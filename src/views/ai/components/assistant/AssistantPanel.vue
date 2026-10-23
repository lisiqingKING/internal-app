<template>
  <section class="assistant-panel" :class="[`layout-${layout}`, { fullscreen }]" :style="panelStyle">
    <!-- 左边缘：面板宽度拖拽条 -->
    <div
      v-if="!fullscreen"
      class="panel-resize-handle"
      role="separator"
      aria-orientation="vertical"
      :aria-valuenow="width"
      @mousedown="startWidthResize"
    ></div>

    <header class="panel-header">
      <!-- 区域开关：两个区可以同时展开（分栏视图），所以是两个独立的开关而非互斥的 Tab -->
      <div class="region-switches">
        <button
          class="region-chip conv-region-btn"
          :class="{ active: !conversationsCollapsed }"
          :title="conversationsCollapsed ? '展开辅助会话区' : '收起辅助会话区'"
          @click="toggleConversations"
        >
          <MessageCircle :size="13" />
          <span class="region-chip-text">对话</span>
        </button>
        <button
          class="region-chip notes-region-btn"
          :class="{ active: !notesCollapsed }"
          :title="notesCollapsed ? '展开笔记区' : '收起笔记区'"
          @click="toggleNotes"
        >
          <StickyNote :size="13" />
          <span class="region-chip-text">笔记</span>
        </button>
      </div>

      <div class="panel-actions">
        <!-- 图标表示当前布局：左右分栏=竖分割线，上下分栏=横分割线 -->
        <button
          class="panel-btn layout-btn"
          :title="layout === 'horizontal' ? '切换为上下分栏' : '切换为左右分栏'"
          @click="toggleLayout"
        >
          <Columns2 v-if="layout === 'horizontal'" :size="14" />
          <Rows2 v-else :size="14" />
        </button>
        <button class="panel-btn search-btn" title="搜索" @click="toggleSearch">
          <Search :size="14" />
        </button>
        <button class="panel-btn fullscreen-btn" title="全屏" @click="toggleFullscreen">
          <Maximize2 :size="14" />
        </button>
        <button class="panel-btn close-btn" title="关闭" @click="requestClose">
          <X :size="14" />
        </button>
      </div>
    </header>

    <div ref="bodyRef" class="panel-body">
      <!-- 收起时用 v-show 而不是 v-if：组件保持挂载，输入草稿与滚动位置不丢 -->
      <div v-show="!conversationsCollapsed" class="region region-main" :style="regionStyles.main">
        <slot name="conversations" />
      </div>

      <!-- 只剩一个区时没有可分割的空间，分隔条一并隐藏 -->
      <div
        v-show="!conversationsCollapsed && !notesCollapsed"
        class="split-handle"
        role="separator"
        @mousedown="startSplitResize"
      ></div>

      <div v-show="!notesCollapsed" class="region region-side" :style="regionStyles.side">
        <slot name="notes" />
      </div>

      <!-- 搜索面板覆盖在内容区之上（不遮头部，布局/全屏/关闭始终可用） -->
      <div v-if="searchOpen" class="search-overlay">
        <slot name="search" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { Columns2, Maximize2, MessageCircle, Rows2, Search, StickyNote, X } from 'lucide-vue-next'
import {
  ASSISTANT_PANEL,
  clampPanelWidth,
  clampSplitRatio,
} from '../../composables/assistant/useAssistantPanel'

const panel = inject(ASSISTANT_PANEL)
if (!panel) throw new Error('AssistantPanel 必须在提供 ASSISTANT_PANEL 的父组件内使用')

const {
  fullscreen,
  layout,
  width,
  splitRatio,
  searchOpen,
  conversationsCollapsed,
  notesCollapsed,
  toggleLayout,
  toggleFullscreen,
  toggleSearch,
  toggleConversations,
  toggleNotes,
  saveWidth,
  requestClose,
} = panel

const bodyRef = ref<HTMLElement | null>(null)

const panelStyle = computed(() => ({
  width: fullscreen.value ? '100%' : `${width.value}px`,
}))

/**
 * 两个区的尺寸。左右分栏用宽度、上下分栏用高度。
 * 收起一个区时，剩下的那个占满全部空间（分隔条同时隐藏）。
 */
const regionStyles = computed(() => {
  const size = (percent: string) =>
    layout.value === 'horizontal' ? { width: percent } : { height: percent }

  if (notesCollapsed.value) {
    return { main: size('100%'), side: size('100%') }
  }
  if (conversationsCollapsed.value) {
    return { main: size('0%'), side: size('100%') }
  }
  const mainPercent = `${(splitRatio.value * 100).toFixed(2)}%`
  const sidePercent = `${((1 - splitRatio.value) * 100).toFixed(2)}%`
  return { main: size(mainPercent), side: size(sidePercent) }
})

// ===== 左边缘：宽度拖拽 =====

let resizingWidth = false
let widthStartX = 0
let widthStartValue = 0

function startWidthResize(e: MouseEvent) {
  resizingWidth = true
  widthStartX = e.clientX
  widthStartValue = width.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onWidthMove(e: MouseEvent) {
  if (!resizingWidth) return
  width.value = clampPanelWidth(widthStartValue + (widthStartX - e.clientX))
}

function onWidthEnd() {
  if (!resizingWidth) return
  resizingWidth = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  void saveWidth()
}

useEventListener(window, 'mousemove', onWidthMove)
useEventListener(window, 'mouseup', onWidthEnd)

// 视口变化后宽度可能越界，重新钳制
useEventListener(window, 'resize', () => {
  width.value = clampPanelWidth(width.value)
})

// ===== 内部分栏：辅助会话区与笔记区之间的分隔条 =====

let resizingSplit = false
let splitStart = 0
let splitStartRatio = 0

function startSplitResize(e: MouseEvent) {
  resizingSplit = true
  splitStart = layout.value === 'horizontal' ? e.clientX : e.clientY
  splitStartRatio = splitRatio.value
  document.body.style.cursor = layout.value === 'horizontal' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
}

function onSplitMove(e: MouseEvent) {
  if (!resizingSplit) return
  const el = bodyRef.value
  if (!el) return
  const size = layout.value === 'horizontal' ? el.clientWidth : el.clientHeight
  if (size <= 0) return
  const current = layout.value === 'horizontal' ? e.clientX : e.clientY
  splitRatio.value = clampSplitRatio(splitStartRatio + (current - splitStart) / size)
}

function onSplitEnd() {
  if (!resizingSplit) return
  resizingSplit = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

useEventListener(window, 'mousemove', onSplitMove)
useEventListener(window, 'mouseup', onSplitEnd)
</script>

<style scoped>
.assistant-panel {
  position: relative;
  flex-shrink: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--color-divider);
  background: var(--color-bg-secondary);
}

.assistant-panel.fullscreen {
  border-left: none;
}

.panel-resize-handle {
  position: absolute;
  left: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 5;
  transition: background 0.15s;
}

.panel-resize-handle:hover,
.panel-resize-handle:active {
  background: var(--color-accent);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

/* 区域开关：两个区可以同时展开，所以是两个独立开关，不是互斥 Tab */
.region-switches {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.region-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: none;
  color: var(--color-text-tertiary);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.region-chip:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

/* 高亮 = 该区当前展开 */
.region-chip.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
}

.region-chip:focus-visible,
.panel-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.panel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.panel-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.panel-body {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.layout-horizontal .panel-body {
  flex-direction: row;
}

.layout-vertical .panel-body {
  flex-direction: column;
}

.region {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 会话区一档底色，笔记区另一档：色差本身就是分区信号 */
.region-main {
  flex: 0 1 auto;
  min-width: 0;
  background: var(--color-bg-secondary);
}

.region-side {
  flex: 0 0 auto;
  background: var(--color-bg-primary);
}

/* 分隔条：一条常驻的 1px 分界线 + 6px 拖拽热区，hover 时线变强调色 */
.split-handle {
  flex-shrink: 0;
  position: relative;
  background: transparent;
}

.split-handle::after {
  content: '';
  position: absolute;
  background: var(--color-divider);
  transition: background 0.15s;
}

.layout-horizontal .split-handle {
  width: 6px;
  cursor: col-resize;
}

.layout-horizontal .split-handle::after {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
}

.layout-vertical .split-handle {
  height: 6px;
  cursor: row-resize;
}

.layout-vertical .split-handle::after {
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  transform: translateY(-50%);
}

.split-handle:hover,
.split-handle:active {
  background: var(--color-accent-muted);
}

.split-handle:hover::after,
.split-handle:active::after {
  background: var(--color-accent);
}

.search-overlay {
  position: absolute;
  inset: 0;
  background: var(--color-bg-secondary);
  z-index: 10;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
