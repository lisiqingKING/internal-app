<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

function applyTheme(theme: string) {
  document.documentElement.classList.toggle('dark', theme !== 'light')
}

function initBridge() {
  const electronApis = window.bridge.getModules(['history', 'ai', 'logs', 'settings', 'favorites'])
  window.electronApis = electronApis

  electronApis.settings.get('theme').then((theme: string) => {
    applyTheme(theme || 'dark')
  }).catch(() => applyTheme('dark'))

  electronApis.settings.onThemeChanged((theme: string) => {
    console.log('[theme] received theme-changed:', theme, 'html has .dark?', document.documentElement.classList.contains('dark'))
    applyTheme(theme)
  })
}

// bridge 在 preload 阶段就已注入，script setup 同步执行时通常已就绪
// 先尝试直接初始化，失败则等 onMounted 后再试
if (window?.bridge) {
  initBridge()
}

onMounted(() => {
  if (!window?.bridge) {
    let retries = 0
    const timer = setInterval(() => {
      if (window?.bridge) {
        clearInterval(timer)
        initBridge()
      } else if (++retries > 100) {
        clearInterval(timer)
        console.error('[bridge] failed to initialize after 5s')
      }
    }, 50)
  }
})
</script>

<style>
html, body {
  background: transparent;
}
</style>
