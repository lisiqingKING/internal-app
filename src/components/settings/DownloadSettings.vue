<template>
  <div class="content-header">
    <h2>下载</h2>
    <p>管理下载文件的存储位置</p>
  </div>

  <div class="form-section">
    <div class="form-item">
      <label>存储位置</label>
      <div class="path-row">
        <span class="path-text" :title="downloadDir">{{ downloadDir || '未设置' }}</span>
        <button class="icon-btn" @click="selectDownloadDir" title="修改">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
        </button>
        <button class="icon-btn" @click="openDownloadDir" title="打开">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="toggle-item">
      <div class="toggle-info">
        <span class="toggle-label">下载时询问保存位置</span>
      </div>
      <button
        :class="['toggle-btn', { active: downloadAskSaveDir }]"
        @click="toggleDownloadAskSaveDir"
      >
        <span class="toggle-thumb"></span>
      </button>
    </div>

    <div class="toggle-item">
      <div class="toggle-info">
        <span class="toggle-label">下载完成时弹出通知</span>
      </div>
      <button
        :class="['toggle-btn', { active: downloadNotifyOnComplete }]"
        @click="toggleDownloadNotifyOnComplete"
      >
        <span class="toggle-thumb"></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

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

async function toggleDownloadAskSaveDir() {
  downloadAskSaveDir.value = !downloadAskSaveDir.value
  await settings.set('download_ask_save_dir', String(downloadAskSaveDir.value))
}

async function toggleDownloadNotifyOnComplete() {
  downloadNotifyOnComplete.value = !downloadNotifyOnComplete.value
  await settings.set('download_notify_on_complete', String(downloadNotifyOnComplete.value))
}
</script>

<style scoped>
.content-header {
  margin-bottom: 28px;
}

.content-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 6px;
}

.content-header p {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.form-section {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.path-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.path-text {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.icon-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--card-border);
}

.toggle-item:last-child {
  border-bottom: none;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.toggle-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.toggle-btn {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: var(--input-border);
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.toggle-btn.active {
  background: var(--color-accent);
}

.toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}
</style>
