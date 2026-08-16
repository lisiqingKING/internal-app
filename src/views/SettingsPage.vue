<template>
  <div class="settings-container">
    <!-- 左侧菜单 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </div>
        <span class="sidebar-title">设置</span>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in menuItems"
          :key="item.id"
          :class="['nav-item', { active: activeMenu === item.id }]"
          @click="activeMenu = item.id"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <span class="version">lsqapp v1.0.0</span>
      </div>
    </aside>

    <!-- 右侧内容 -->
    <main class="content">
      <!-- 外观 -->
      <template v-if="activeMenu === 'appearance'">
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

      <!-- AI 配置 -->
      <template v-if="activeMenu === 'ai'">
        <div class="content-header">
          <h2>AI 配置</h2>
          <p>配置大模型接口</p>
        </div>

        <div class="form-section">
          <div class="form-item">
            <label>Provider</label>
            <select v-model="aiForm.providerType">
              <option value="openai">OpenAI 兼容</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>
          <div class="form-item">
            <label>API Key</label>
            <div class="input-with-toggle">
              <input v-model="aiForm.apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="请输入你的 API Key" />
              <button class="toggle-visibility" @click="showApiKey = !showApiKey" type="button">
                <svg v-if="showApiKey" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="form-item">
            <label>API URL</label>
            <input v-model="aiForm.apiUrl" placeholder="https://token-plan-cn.xiaomimimo.com/v1" />
          </div>
          <div class="form-item">
            <label>Model</label>
            <input v-model="aiForm.model" placeholder="mimo-v2.5-pro" />
          </div>
          <button class="save-btn" @click="saveAiConfig">
            {{ aiSaved ? '已保存' : '保存' }}
          </button>
        </div>
      </template>

      <!-- 关于 -->
      <template v-if="activeMenu === 'about'">
        <div class="content-header">
          <h2>关于</h2>
          <p>应用信息</p>
        </div>

        <div class="about-card">
          <div class="about-logo">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:var(--color-accent)" />
                  <stop offset="100%" style="stop-color:var(--color-indigo-400)" />
                </linearGradient>
              </defs>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="about-info">
            <h3>lsqapp</h3>
            <p>Electron + Vite + Vue 3 桌面浏览器</p>
            <span class="about-version">版本 1.0.0</span>
          </div>
        </div>

        <div class="update-section">
          <div class="update-status" v-if="updateStatus">{{ updateStatus }}</div>
          <button class="update-btn" @click="checkForUpdates" :disabled="checking">
            {{ checking ? '检查中...' : '检查更新' }}
          </button>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

document.title = '设置'

const settings = window.bridge.getModules(['settings']).settings

const theme = ref<'light' | 'dark'>('dark')
const activeMenu = ref('appearance')

// AI 配置表单
const aiForm = ref({
  providerType: 'openai',
  apiKey: '',
  apiUrl: '',
  model: ''
})
const aiSaved = ref(false)
const showApiKey = ref(false)

// 检查更新
const updater = window.bridge.getModules(['updater']).updater
const checking = ref(false)
const updateStatus = ref('')

function checkForUpdates() {
  checking.value = true
  updateStatus.value = ''
  updater.checkForUpdates()
}

// 监听更新事件
window.bridge.on('updater.updateAvailable', (_event: any, data: { version: string }) => {
  checking.value = false
  updateStatus.value = `发现新版本: ${data.version}`
})

window.bridge.on('updater.updateNotAvailable', () => {
  checking.value = false
  updateStatus.value = '已是最新版本'
})

window.bridge.on('updater.updateError', (_event: any, data: { error: string }) => {
  checking.value = false
  updateStatus.value = `检查失败: ${data.error}`
})

const menuItems = [
  {
    id: 'appearance',
    label: '外观',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>'
  },
  {
    id: 'ai',
    label: 'AI 配置',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
  },
  {
    id: 'about',
    label: '关于',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
  }
]

onMounted(async () => {
  const savedTheme = await settings.get('theme')
  if (savedTheme === 'light' || savedTheme === 'dark') {
    theme.value = savedTheme
    applyTheme(savedTheme)
  }

  // 加载 AI 配置（带默认值）
  aiForm.value.providerType = await settings.get('ai_provider_type') || 'openai'
  aiForm.value.apiKey = await settings.get('ai_api_key') || 'tp-c2c397g9aktqbph1cpe4n9ejroyi6oaqjmeeowaflb22572n'
  aiForm.value.apiUrl = await settings.get('ai_api_url') || 'https://token-plan-cn.xiaomimimo.com/v1'
  aiForm.value.model = await settings.get('ai_model') || 'mimo-v2.5-pro'
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

async function saveAiConfig() {
  await settings.set('ai_provider_type', aiForm.value.providerType)
  await settings.set('ai_api_key', aiForm.value.apiKey)
  await settings.set('ai_api_url', aiForm.value.apiUrl)
  await settings.set('ai_model', aiForm.value.model)
  aiSaved.value = true
  setTimeout(() => aiSaved.value = false, 2000)
}
</script>

<style scoped>
/* ── 更新区域 ── */
.update-section {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  max-width: 400px;
}

.update-status {
  flex: 1;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.update-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.update-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.update-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-container {
  display: flex;
  height: 100vh;
  background: var(--page-bg);
  color: var(--color-text-primary);
}

/* ── 左侧菜单 ── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-right: 1px solid var(--card-border);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
}

.sidebar-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-accent), var(--color-indigo-400));
  border-radius: 10px;
  color: white;
}

.sidebar-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background: var(--card-hover-bg);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: rgba(99, 102, 241, 0.12);
  color: var(--color-accent);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--card-border);
}

.version {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
}

/* ── 右侧内容 ── */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
}

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

/* ── 主题选择 ── */
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

/* 主题预览 - 模拟窗口 */
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

/* ── AI 配置 ── */
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

.form-item input {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-item input:focus {
  border-color: var(--color-accent);
}

.form-item input::placeholder {
  color: var(--input-placeholder);
}

.form-item select {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  cursor: pointer;
}

.form-item select:focus {
  border-color: var(--color-accent);
}

.input-with-toggle {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-toggle input {
  flex: 1;
  padding-right: 40px;
}

.toggle-visibility {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-visibility:hover {
  color: var(--color-text-primary);
}

.save-btn {
  align-self: flex-start;
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.save-btn:hover {
  opacity: 0.9;
}

/* ── 关于 ── */
.about-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  max-width: 400px;
}

.about-logo {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-hover-bg);
  border-radius: 16px;
  flex-shrink: 0;
}

.about-info h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 4px;
}

.about-info p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
}

.about-version {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  background: var(--card-hover-bg);
  padding: 3px 8px;
  border-radius: 4px;
}
</style>
