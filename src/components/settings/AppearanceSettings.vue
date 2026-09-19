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

  <div class="skin-section">
    <div class="section-header">
      <h3>应用皮肤</h3>
      <button class="add-btn" @click="pickCustomSkin">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
        上传
      </button>
    </div>
    <div class="skin-cards">
      <button
        v-for="skin in skinOptions"
        :key="skin.name"
        :class="['skin-card', { active: currentSkin === skin.name }]"
        @click="selectSkin(skin)"
      >
        <div class="skin-preview" :style="skin.previewUrl ? { backgroundImage: `url(${skin.previewUrl})` } : {}"></div>
        <span class="skin-name">{{ skin.label }}</span>
      </button>
      <div
        v-for="skin in customSkins"
        :key="skin.id"
        :class="['skin-card', 'custom-skin', { active: currentSkin === skin.id }]"
        @click="selectCustomSkin(skin)"
      >
        <div class="skin-preview" :style="skin.previewUrl ? { backgroundImage: `url(${skin.previewUrl})` } : {}"></div>
        <span class="skin-name">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" class="local-icon">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          本地
        </span>
        <span class="delete-btn" @click.stop="deleteCustomSkin(skin.id)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const settings = window.bridge.getModules(['settings']).settings
const wallpaper = window.bridge.getModules(['wallpaper']).wallpaper
const bridge = window.bridge

const theme = ref<'light' | 'dark'>('dark')
const currentSkin = ref<string>('')

interface BuiltinSkin {
  name: string
  label: string
  previewUrl?: string
}

interface CustomSkin {
  id: string
  path: string
  previewUrl: string
}

type WallpaperData = {
  type: 'builtin'
  name: string
} | {
  type: 'custom'
  id: string
  path: string
}

const skinOptions = ref<BuiltinSkin[]>([
  { name: 'cosmic.jpg', label: '星空' },
  { name: 'mountain.jpg', label: '山水' },
  { name: 'city.jpg', label: '城市' },
  { name: 'abstract.jpg', label: '抽象' },
  { name: 'anime.jpg', label: '动漫' }
])

const customSkins = ref<CustomSkin[]>([])

onMounted(async () => {
  const savedTheme = await settings.get('theme')
  if (savedTheme === 'light' || savedTheme === 'dark') {
    theme.value = savedTheme
    applyTheme(savedTheme)
  }

  const savedWallpaper = await settings.get('wallpaper')
  if (savedWallpaper) {
    try {
      const data = JSON.parse(savedWallpaper)
      if (data.type === 'builtin' && data.name) {
        currentSkin.value = data.name
      } else if (data.type === 'custom' && data.id) {
        currentSkin.value = data.id
      }
    } catch {}
  }

  // 加载自定义皮肤列表
  await loadCustomSkins()

  // 加载内置皮肤预览图
  for (const skin of skinOptions.value) {
    try {
      const url = await wallpaper.getBuiltinSkinImage(skin.name)
      if (url) {
        skin.previewUrl = url
      }
    } catch (e) {
      console.error('[load skin preview]', skin.name, e)
    }
  }

  // 监听主题变化
  const handleThemeChange = (newTheme: string) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      theme.value = newTheme
      applyTheme(newTheme)
    }
  }
  bridge.on(bridge.channels.settings.themeChanged, handleThemeChange)

  // 监听壁纸变化
  const handleWallpaperChange = async (data: WallpaperData) => {
    if (data.type === 'custom' && data.id && data.path) {
      const preview = await wallpaper.getWallpaperImage(data.path)
      const skin: CustomSkin = { id: data.id, path: data.path, previewUrl: preview }
      const existing = customSkins.value.find(s => s.id === data.id)
      if (!existing) {
        customSkins.value.push(skin)
      }
      currentSkin.value = data.id
      saveCustomSkins()
    } else if (data.type === 'builtin' && data.name) {
      currentSkin.value = data.name
    }
  }
  bridge.on(bridge.channels.wallpaper.wallpaperChanged, handleWallpaperChange)
})

onUnmounted(() => {
  bridge.off(bridge.channels.settings.themeChanged, handleThemeChange)
  bridge.off(bridge.channels.wallpaper.wallpaperChanged, handleWallpaperChange)
})

async function loadCustomSkins() {
  customSkins.value = []
  try {
    const data = await settings.get('customSkins')
    if (data) {
      const skins = JSON.parse(data)
      for (const s of skins) {
        try {
          const preview = await wallpaper.getWallpaperImage(s.path)
          if (preview) {
            customSkins.value.push({ id: s.id, path: s.path, previewUrl: preview })
          }
        } catch (e) {
          console.error('[load custom skin]', s.id, e)
        }
      }
    }
  } catch (e) {
    console.error('[loadCustomSkins]', e)
  }
}

async function saveCustomSkins() {
  await settings.set('customSkins', JSON.stringify(customSkins.value.map(s => ({ id: s.id, path: s.path }))))
}

function applyTheme(newTheme: 'light' | 'dark') {
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

async function setTheme(newTheme: 'light' | 'dark') {
  theme.value = newTheme
  applyTheme(newTheme)
  await settings.set('theme', newTheme)
}

async function selectSkin(skin: BuiltinSkin) {
  try {
    currentSkin.value = skin.name
    await settings.set('wallpaper', JSON.stringify({ type: 'builtin', name: skin.name }))
    const colorInfo = await wallpaper.getBuiltinSkinColor(skin.name)
    const newTheme = colorInfo?.isLight ? 'light' : 'dark'
    await settings.set('theme', newTheme)
  } catch (e) {
    console.error('[selectSkin] error:', e)
  }
}

async function selectCustomSkin(skin: CustomSkin) {
  try {
    currentSkin.value = skin.id
    await settings.set('wallpaper', JSON.stringify({ type: 'custom', id: skin.id, path: skin.path }))
    await settings.set('theme', 'dark')
  } catch (e) {
    console.error('[selectCustomSkin] error:', e)
  }
}

async function deleteCustomSkin(id: string) {
  customSkins.value = customSkins.value.filter(s => s.id !== id)
  if (currentSkin.value === id) {
    currentSkin.value = ''
    await settings.set('wallpaper', JSON.stringify({ type: 'builtin', name: 'cosmic.jpg' }))
  }
  saveCustomSkins()
}

async function pickCustomSkin() {
  try {
    const result = await wallpaper.pickWallpaper()
    if (result && result.path) {
      const id = `custom-${Date.now()}`
      const preview = await wallpaper.getWallpaperImage(result.path)
      if (preview) {
        customSkins.value.push({ id, path: result.path, previewUrl: preview })
        currentSkin.value = id
        // 直接设置当前壁纸，让容器应用效果
        await settings.set('wallpaper', JSON.stringify({ type: 'custom', id, path: result.path }))
        // 保存列表
        await saveCustomSkins()
      }
    }
  } catch (e) {
    console.error('[pickCustomSkin]', e)
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

.skin-section {
  margin-top: 36px;
  max-width: 480px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.skin-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.skin-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skin-card:hover {
  background: var(--input-bg);
}

.skin-card.active {
  border-color: var(--color-accent);
  background: rgba(99, 102, 241, 0.06);
}

.skin-preview {
  width: 100%;
  aspect-ratio: 16/10;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  background-color: var(--input-bg);
}

.skin-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.skin-card.active .skin-name {
  color: var(--color-accent);
  font-weight: 500;
}

.local-icon {
  opacity: 0.7;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.skin-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.8);
}
</style>
