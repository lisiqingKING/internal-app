<template>
  <div class="content-header">
    <h2>外观</h2>
    <p>选择你喜欢的视觉风格</p>
  </div>

  <div class="theme-section">
    <div class="theme-cards">
      <button
        :class="['theme-card', { active: theme === 'light' }]"
        @click="setTheme('light')"
      >
        <div class="theme-preview light-preview">
          <div class="preview-sidebar"></div>
          <div class="preview-main">
            <div class="preview-bar"></div>
            <div class="preview-content">
              <div class="preview-line long"></div>
              <div class="preview-line short"></div>
              <div class="preview-line medium"></div>
            </div>
          </div>
        </div>
        <div class="theme-info">
          <span class="theme-name">浅色模式</span>
          <span class="theme-desc">明亮清爽</span>
        </div>
        <div v-if="theme === 'light'" class="check-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      </button>

      <button
        :class="['theme-card', { active: theme === 'dark' }]"
        @click="setTheme('dark')"
      >
        <div class="theme-preview dark-preview">
          <div class="preview-sidebar"></div>
          <div class="preview-main">
            <div class="preview-bar"></div>
            <div class="preview-content">
              <div class="preview-line long"></div>
              <div class="preview-line short"></div>
              <div class="preview-line medium"></div>
            </div>
          </div>
        </div>
        <div class="theme-info">
          <span class="theme-name">深色模式</span>
          <span class="theme-desc">护眼沉浸</span>
        </div>
        <div v-if="theme === 'dark'" class="check-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const settings = window.bridge.getModules(['settings']).settings

const theme = ref<'light' | 'dark'>('dark')

onMounted(async () => {
  const savedTheme = await settings.get('theme')
  if (savedTheme === 'light' || savedTheme === 'dark') {
    theme.value = savedTheme
    applyTheme(savedTheme)
  }
})

async function setTheme(newTheme: 'light' | 'dark') {
  theme.value = newTheme
  applyTheme(newTheme)
  await settings.set('theme', newTheme)
}

function applyTheme(newTheme: 'light' | 'dark') {
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
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

.theme-section {
  max-width: 480px;
}

.theme-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--input-bg);
  border: 2px solid var(--input-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-card:hover {
  border-color: var(--color-text-tertiary);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.theme-card.active {
  border-color: var(--color-accent);
  background: rgba(99, 102, 241, 0.06);
}

.theme-preview {
  width: 100%;
  height: 90px;
  border-radius: 6px;
  display: flex;
  overflow: hidden;
}

.light-preview {
  background: #ffffff;
  border: 1px solid #e2e8f0;
}

.dark-preview {
  background: #1e1e2e;
  border: 1px solid #2d2d3d;
}

.preview-sidebar {
  width: 28%;
  background: #f1f5f9;
}

.dark-preview .preview-sidebar {
  background: #252535;
}

.preview-main {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-bar {
  height: 8px;
  width: 60%;
  border-radius: 2px;
  background: #e2e8f0;
}

.dark-preview .preview-bar {
  background: #3c3c42;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.preview-line {
  height: 5px;
  border-radius: 2px;
}

.preview-line.long { width: 90%; }
.preview-line.medium { width: 65%; }
.preview-line.short { width: 40%; }

.light-preview .preview-line { background: #cbd5e1; }
.dark-preview .preview-line { background: #4a4a52; }

.theme-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.theme-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.theme-desc {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.check-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  border-radius: 50%;
  color: white;
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
