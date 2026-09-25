<template>
  <div class="settings-container">
    <SettingsSidebar v-model="activeMenu" />

    <div class="content-panel">
      <div class="content">
        <HelpGuideSettings v-if="activeMenu === 'help'" />
        <AppearanceSettings v-else-if="activeMenu === 'appearance'" />
        <DownloadSettings v-else-if="activeMenu === 'downloads'" />
        <AiSettings v-else-if="activeMenu === 'ai'" />
        <AboutSettings v-else-if="activeMenu === 'about'" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SettingsSidebar from '@/components/settings/SettingsSidebar.vue'
import HelpGuideSettings from '@/components/settings/HelpGuideSettings.vue'
import AppearanceSettings from '@/components/settings/AppearanceSettings.vue'
import DownloadSettings from '@/components/settings/DownloadSettings.vue'
import AiSettings from '@/components/settings/AiSettings.vue'
import AboutSettings from '@/components/settings/AboutSettings.vue'

document.title = '设置'

const activeMenu = ref('help')
</script>

<style scoped>
.settings-container {
  display: flex;
  height: 100vh;
  background: transparent;
  color: var(--color-text-primary);
}

.content-panel {
  flex: 1;
  margin: 16px 16px 16px 0;
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid var(--card-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
}

.content::-webkit-scrollbar {
  width: 8px;
}

.content::-webkit-scrollbar-track {
  background: transparent;
}

.content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}

.content::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}
</style>
