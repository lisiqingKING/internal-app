<template>
  <div class="inspiration-panel">
    <div class="panel-header">
      <span class="panel-title">灵感大全</span>
      <button class="close-btn" @click="emit('close')">
        <X :size="14" />
      </button>
    </div>

    <div class="panel-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="panel-content">
      <!-- 模板列表 -->
      <div v-if="activeTab === 'templates'" class="template-grid">
        <div
          v-for="tpl in templates"
          :key="tpl.id"
          class="template-card"
          @click="emit('use-prompt', tpl.prompt)"
        >
          <div class="tpl-icon">{{ tpl.icon }}</div>
          <div class="tpl-title">{{ tpl.title }}</div>
          <div class="tpl-desc">{{ tpl.description }}</div>
        </div>
      </div>

      <!-- 提示词库 -->
      <div v-else class="prompt-list">
        <div
          v-for="prompt in prompts"
          :key="prompt.id"
          class="prompt-item"
          @click="emit('use-prompt', prompt.content)"
        >
          <div class="prompt-title">{{ prompt.title }}</div>
          <div class="prompt-preview">{{ prompt.preview }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'

const emit = defineEmits<{
  'use-prompt': [prompt: string]
  'close': []
}>()

interface Tab {
  id: 'templates' | 'prompts'
  label: string
}

const tabs: Tab[] = [
  { id: 'templates', label: '灵感模板' },
  { id: 'prompts', label: '提示词库' },
]

const activeTab = ref<'templates' | 'prompts'>('templates')

interface Template {
  id: string
  icon: string
  title: string
  description: string
  prompt: string
}

const templates: Template[] = [
  {
    id: '1',
    icon: '✍️',
    title: '写作助手',
    description: '文章撰写、改写、润色',
    prompt: '请帮我撰写一篇关于',
  },
  {
    id: '2',
    icon: '💻',
    title: '代码助手',
    description: '写代码、debug、优化',
    prompt: '请帮我写一段代码，实现',
  },
  {
    id: '3',
    icon: '🔍',
    title: '数据分析',
    description: '数据处理、图表分析',
    prompt: '请分析以下数据，',
  },
  {
    id: '4',
    icon: '📚',
    title: '学习辅导',
    description: '知识点讲解、答疑',
    prompt: '请解释一下',
  },
  {
    id: '5',
    icon: '🌐',
    title: '翻译助手',
    description: '多语言翻译、文案本地化',
    prompt: '请翻译以下内容：',
  },
  {
    id: '6',
    icon: '📝',
    title: '总结归纳',
    description: '长文摘要、要点提炼',
    prompt: '请总结以下内容的要点：',
  },
]

interface Prompt {
  id: string
  title: string
  preview: string
  content: string
}

const prompts: Prompt[] = [
  {
    id: '1',
    title: '技术文档写作',
    preview: '用简洁专业的语言...',
    content: '请用简洁、专业的语言撰写技术文档，适合有一定技术背景的读者。',
  },
  {
    id: '2',
    title: '代码审查',
    preview: '检查代码中的潜在问题...',
    content: '请审查以下代码，指出潜在问题并提供改进建议。',
  },
  {
    id: '3',
    title: '需求分析',
    preview: '将用户需求转化为技术方案...',
    content: '请分析以下用户需求，转化为技术实现方案，包括技术选型和实现步骤。',
  },
  {
    id: '4',
    title: '创意头脑风暴',
    preview: '针对某个主题进行创意发散...',
    content: '请针对以下主题进行创意头脑风暴，提供10个不同角度的想法。',
  },
]
</script>

<style scoped>
.inspiration-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--color-divider);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.close-btn:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.panel-tabs {
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  border-bottom: 1px solid var(--color-divider);
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tab-btn:hover {
  background: var(--color-surface);
}

.tab-btn.active {
  background: var(--color-accent-muted);
  color: var(--color-accent);
  font-weight: 500;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.template-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.template-card {
  padding: 14px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.template-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.tpl-icon {
  font-size: 18px;
  margin-bottom: 6px;
}

.tpl-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 3px;
}

.tpl-desc {
  font-size: 11px;
  color: var(--color-text-tertiary);
  line-height: 1.3;
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-item {
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.prompt-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-accent);
}

.prompt-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.prompt-preview {
  font-size: 12px;
  color: var(--color-text-tertiary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
