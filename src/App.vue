<template>
  <router-view />
</template>

<script setup lang="ts">

// 这里可以放置全局的状态管理或逻辑
if(window?.bridge) {
  console.log('Electron bridge is available')
  const electronApis = window.bridge.getModules(['history', 'ai'])
  // 将 Electron APIs 暴露到全局，方便调试和使用
  window.electronApis = electronApis
  console.log('Electron APIs:', electronApis)
} else {
  console.warn('Electron bridge is not available')
}

</script>