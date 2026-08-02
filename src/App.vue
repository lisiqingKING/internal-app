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

  window.bridge.on('settings:theme-changed', (_event: any, theme: string) => {
    applyTheme(theme)
  })
}

onMounted(() => {
  if (window?.bridge) {
    initBridge()
  } else {
    // bridge 可能还没就绪，轮询等待
    const timer = setInterval(() => {
      if (window?.bridge) {
        clearInterval(timer)
        initBridge()
      }
    }, 50)
  }
})
</script>
