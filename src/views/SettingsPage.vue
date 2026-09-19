<template>
  <div class="settings-container">
    <SettingsSidebar v-model="activeMenu" />

    <main class="content">
      <HelpGuideSettings v-if="activeMenu === 'help'" />
      <AppearanceSettings v-else-if="activeMenu === 'appearance'" />
      <DownloadSettings v-else-if="activeMenu === 'downloads'" />
      <AiSettings v-else-if="activeMenu === 'ai'" />
      <AboutSettings v-else-if="activeMenu === 'about'" />
    </main>
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

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}
</style>
