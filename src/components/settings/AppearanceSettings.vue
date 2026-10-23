<template>
  <div class="appearance-settings">
    <div class="section-header">
      <h2>外观</h2>
      <p>选择你喜欢的视觉风格</p>
    </div>

    <div class="settings-group">
      <div class="group-title">主题</div>
      <div class="theme-cards">
        <button
          :class="['theme-card', { active: theme === 'system' }]"
          @click="setTheme('system')"
        >
          <div class="theme-preview system-preview">
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
            <span class="theme-name">跟随系统</span>
            <span class="theme-desc">自动适配</span>
          </div>
          <div v-if="theme === 'system'" class="check-icon">
            <Check :size="14" />
          </div>
        </button>

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
            <Check :size="14" />
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
            <Check :size="14" />
          </div>
        </button>
      </div>

      <div class="setting-row">
        <span class="setting-label">毛玻璃效果</span>
        <SettingsToggle v-model="blurEnabled" />
      </div>
    </div>

    <div class="settings-group">
      <div class="group-title">应用皮肤</div>

      <div class="skin-cards">
        <!-- 上传卡片 -->
        <button class="skin-card upload-card" @click="pickCustomSkin">
          <div class="skin-preview upload-preview">
            <Plus :size="24" />
          </div>
        </button>

        <!-- 默认主题卡片 -->
        <button
          :class="['skin-card', { active: currentSkin === '' }]"
          @click="selectDefault"
        >
          <div class="skin-preview default-preview">
            <span class="default-text">默认主题</span>
          </div>
        </button>

        <!-- 内置皮肤 -->
        <button
          v-for="skin in skinOptions"
          :key="skin.name"
          :class="['skin-card', { active: currentSkin === skin.name }]"
          @click="selectSkin(skin)"
        >
          <div class="skin-preview" :style="skin.previewUrl ? { backgroundImage: `url(${skin.previewUrl})` } : {}"></div>
        </button>

        <!-- 自定义皮肤 -->
        <button
          v-for="skin in customSkins"
          :key="skin.id"
          :class="['skin-card', { active: currentSkin === skin.id }]"
          @click="selectCustomSkin(skin)"
        >
          <div class="skin-preview" :style="skin.previewUrl ? { backgroundImage: `url(${skin.previewUrl})` } : {}"></div>
          <span class="delete-btn" @click.stop="deleteCustomSkin(skin.id)">
            <X :size="10" />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Check, Plus, X } from 'lucide-vue-next'
import SettingsToggle from './SettingsToggle.vue'

const settings = window.bridge.getModules(['settings']).settings
const wallpaper = window.bridge.getModules(['wallpaper']).wallpaper
const bridge = window.bridge

const theme = ref<'light' | 'dark' | 'system'>('system')
const currentSkin = ref<string>('')
const blurEnabled = ref(false)

watch(blurEnabled, async (val) => {
  await settings.set('wallpaperBlur', String(val))
})

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
  { name: 'skin-01.jpg', label: '壁纸 1' },
  { name: 'skin-02.jpg', label: '壁纸 2' },
  { name: 'skin-03.jpg', label: '壁纸 3' },
  { name: 'skin-04.jpg', label: '壁纸 4' },
  { name: 'skin-05.jpg', label: '壁纸 5' }
])

const customSkins = ref<CustomSkin[]>([])

const handleThemeChange = (newTheme: string) => {
  if (newTheme === 'light' || newTheme === 'dark') {
    theme.value = newTheme
    applyTheme(newTheme)
  }
}

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

onMounted(async () => {
  const savedTheme = await settings.get('theme')
  if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
    theme.value = savedTheme
    applyTheme(savedTheme)
  }

  const savedWallpaper = await settings.get('wallpaper')
  if (savedWallpaper) {
    try {
      const data = JSON.parse(savedWallpaper)
      if (data.type === 'builtin') {
        currentSkin.value = data.name || ''
      } else if (data.type === 'custom' && data.id) {
        currentSkin.value = data.id
      }
    } catch {}
  }

  await loadCustomSkins()

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

  bridge.on(bridge.channels.settings.themeChanged, handleThemeChange)
  bridge.on(bridge.channels.wallpaper.wallpaperChanged, handleWallpaperChange)

  const savedBlur = await settings.get('wallpaperBlur')
  blurEnabled.value = savedBlur === 'true'
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

function applyTheme(newTheme: 'light' | 'dark' | 'system') {
  if (newTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } else if (newTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

async function setTheme(newTheme: 'light' | 'dark' | 'system') {
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
    await settings.set('wallpaper', JSON.stringify({ type: 'builtin', name: 'skin-01.jpg' }))
  }
  saveCustomSkins()
}

async function selectDefault() {
  currentSkin.value = ''
  await settings.set('wallpaper', JSON.stringify({ type: 'builtin', name: '' }))
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
        await settings.set('wallpaper', JSON.stringify({ type: 'custom', id, path: result.path }))
        await saveCustomSkins()
      }
    }
  } catch (e) {
    console.error('[pickCustomSkin]', e)
  }
}
</script>

<style lang="scss" scoped>
.appearance-settings {
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 560px;
}

.section-header {
  padding-bottom: 4px;

  h2 {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 4px;
  }

  p {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.theme-cards {
  display: grid;
  grid-template-columns: repeat(3, 180px);
  gap: 12px;
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--color-text-tertiary);
  }

  &.active {
    border-color: var(--color-accent);
    background: rgba(16, 185, 129, 0.06);
  }
}

.theme-preview {
  width: 140px;
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
  background: #1c1c1e;
  border: 1px solid #2d2d3d;
}

.system-preview {
  background: linear-gradient(135deg, #1c1c1e 50%, #ffffff 50%);
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
  gap: 5px;
}

.preview-bar {
  height: 6px;
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
  gap: 3px;
  margin-top: 4px;
}

.preview-line {
  height: 4px;
  border-radius: 2px;
}

.preview-line.long { width: 90%; }
.preview-line.medium { width: 65%; }
.preview-line.short { width: 40%; }

.light-preview .preview-line { background: #cbd5e1; }
.dark-preview .preview-line { background: #4a4a52; }

.theme-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  align-self: stretch;
  gap: 6px;
}

.theme-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.theme-desc {
  font-size: 0.68rem;
  color: var(--color-text-secondary);
  text-align: right;
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  border-radius: 50%;
  color: white;
}

.skin-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.skin-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: transparent;
  border: 1.5px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-surface);
  }

  &.active {
    border-color: var(--color-accent);
    background: rgba(16, 185, 129, 0.06);
  }
}

.skin-preview {
  width: 80px;
  aspect-ratio: 16/10;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
}

.upload-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  color: var(--color-text-tertiary);
}

.default-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.default-text {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.skin-card:hover .upload-preview {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.delete-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
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
  background: rgba(239, 68, 68, 0.8);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid var(--color-divider);
}

.setting-label {
  font-size: 0.88rem;
  color: var(--color-text-primary);
}
</style>
