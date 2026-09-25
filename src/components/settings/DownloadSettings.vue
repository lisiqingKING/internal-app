<template>
  <div class="download-settings">
    <div class="section-header">
      <h2>下载</h2>
      <p>管理下载文件的存储位置</p>
    </div>

    <div class="settings-group">
      <div class="group-title">存储</div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">存储位置</span>
          <span class="setting-value" :title="downloadDir">{{ downloadDir || '未设置' }}</span>
        </div>
        <div class="setting-actions">
          <button class="icon-btn" @click="selectDownloadDir" title="修改">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
          </button>
          <button class="icon-btn" @click="openDownloadDir" title="打开">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="group-title">通知</div>
      <div class="setting-row">
        <span class="setting-label">下载时询问保存位置</span>
        <SettingsToggle v-model="downloadAskSaveDir" />
      </div>
      <div class="setting-row">
        <span class="setting-label">下载完成时弹出通知</span>
        <SettingsToggle v-model="downloadNotifyOnComplete" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SettingsToggle from './SettingsToggle.vue'

const settings = window.bridge.getModules(['settings']).settings
const downloads = window.bridge.getModules(['downloads']).downloads

const downloadDir = ref('')
const downloadAskSaveDir = ref(false)
const downloadNotifyOnComplete = ref(false)

onMounted(async () => {
  downloadDir.value = await downloads.getSaveDir() as string
  downloadAskSaveDir.value = await settings.get('download_ask_save_dir') === 'true'
  downloadNotifyOnComplete.value = await settings.get('download_notify_on_complete') === 'true'
})

async function selectDownloadDir() {
  const selected = await downloads.selectSaveDir(downloadDir.value || undefined) as string | null
  if (selected) {
    downloadDir.value = selected
    await settings.set('download_save_dir', selected)
  }
}

async function openDownloadDir() {
  if (downloadDir.value) {
    const windowProxy = window.bridge.getModules(['window']).window
    await windowProxy.openPath(downloadDir.value)
  }
}
</script>

<style lang="scss" scoped>
.download-settings {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 560px;
}

.section-header {
  padding-bottom: 4px;

}

.section-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.section-header p {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;

  gap: 12px;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.setting-label {
  font-size: 0.88rem;
  color: var(--color-text-primary);
}

.setting-value {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
