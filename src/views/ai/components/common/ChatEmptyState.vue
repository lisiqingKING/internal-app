<template>
  <div class="welcome-container">
    <div class="welcome-header">
      <h1>你好，我是智谱 AI</h1>
      <p>我可以帮你解答问题、撰写文章、编程辅助等</p>
    </div>

    <!-- Prompt 建议网格 -->
    <div class="prompt-suggestions">
      <div
        v-for="suggestion in suggestions"
        :key="suggestion.id"
        class="suggestion-card"
        @click="emit('use-prompt', suggestion.prompt)"
      >
        <div class="suggestion-icon">{{ suggestion.icon }}</div>
        <div class="suggestion-title">{{ suggestion.title }}</div>
        <div class="suggestion-desc">{{ suggestion.description }}</div>
      </div>
    </div>

    <!-- 新建对话按钮 -->
    <div class="start-new">
      <button class="start-btn" @click="emit('new-chat')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        新建对话
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  'new-chat': []
  'use-prompt': [prompt: string]
}>()

interface Suggestion {
  id: string
  icon: string
  title: string
  description: string
  prompt: string
}

const suggestions: Suggestion[] = [
  {
    id: '1',
    icon: '✍️',
    title: '撰写文章',
    description: '新闻、博客、论文撰写',
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
    description: '多语言翻译、本地化',
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
</script>

<style scoped>
.welcome-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  max-width: 768px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.welcome-header {
  text-align: center;
  margin-bottom: 32px;
}

.welcome-header h1 {
  font-size: 26px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--color-text-primary);
}

.welcome-header p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.prompt-suggestions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.suggestion-card {
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.suggestion-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.suggestion-icon {
  font-size: 20px;
  margin-bottom: 8px;
}

.suggestion-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.suggestion-desc {
  font-size: 11px;
  color: var(--color-text-tertiary);
  line-height: 1.4;
}

.start-new {
  margin-top: 24px;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  background: var(--color-accent);
  color: var(--color-text-inverse);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}

.start-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.start-btn:active {
  transform: translateY(0);
}
</style>
