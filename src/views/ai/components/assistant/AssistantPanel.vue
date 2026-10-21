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
      <span class="panel-title">辅助面板</span>
      <div class="panel-actions">
        <button class="panel-btn layout-btn" title="切换布局" @click="toggleLayout">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
        </button>
        <button class="panel-btn search-btn" title="搜索" @click="toggleSearch">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button class="panel-btn fullscreen-btn" title="全屏" @click="toggleFullscreen">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
        <button class="panel-btn close-btn" title="关闭" @click="requestClose">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>

    <div ref="bodyRef" class="panel-body">
      <div class="region region-main" :style="mainRegionStyle">
        <slot name="conversations" />
      </div>

      <div class="split-handle" role="separator" @mousedown="startSplitResize"></div>

      <div class="region region-side">
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
  toggleLayout,
  toggleFullscreen,
  toggleSearch,
  saveWidth,
  requestClose,
} = panel

const bodyRef = ref<HTMLElement | null>(null)

const panelStyle = computed(() => ({
  width: fullscreen.value ? '100%' : `${width.value}px`,
}))

const mainRegionStyle = computed(() => {
  const percent = `${(splitRatio.value * 100).toFixed(2)}%`
  return layout.value === 'horizontal' ? { width: percent } : { height: percent }
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
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-divider);
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
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

.region-main {
  flex-shrink: 0;
}

.region-side {
  flex: 1;
}

.split-handle {
  flex-shrink: 0;
  background: var(--color-divider);
  transition: background 0.15s;
}

.layout-horizontal .split-handle {
  width: 4px;
  cursor: col-resize;
}

.layout-vertical .split-handle {
  height: 4px;
  cursor: row-resize;
}

.split-handle:hover,
.split-handle:active {
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
