<template>
  <div class="concept-drawer" :class="{ open: visible }">
    <div class="drawer-header">
      <h3>相关概念</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="concept-tabs" v-if="concepts.length > 0">
      <button
        v-for="(concept, index) in concepts"
        :key="index"
        class="concept-tab"
        :class="{ active: activeIndex === index }"
        @click="activeIndex = index"
      >
        {{ concept.name }}
      </button>
    </div>
    <div class="concept-content" v-if="currentConcept">
      <h4>{{ currentConcept.name }}</h4>
      <p class="summary">{{ currentConcept.summary }}</p>
      <div class="details">
        <strong>详细解释：</strong>
        <p>{{ currentConcept.details }}</p>
      </div>
      <div class="code-section" v-if="currentConcept.codeExample">
        <strong>代码示例：</strong>
        <pre><code>{{ currentConcept.codeExample }}</code></pre>
      </div>
    </div>
    <div class="empty-state" v-else>
      <p>暂无概念详情</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Concept } from '../types'

const props = defineProps<{
  visible: boolean
  concepts: Concept[]
}>()

defineEmits<{
  close: []
}>()

const activeIndex = ref(0)

const currentConcept = computed(() => props.concepts[activeIndex.value] || null)
</script>

<style scoped>
.concept-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: var(--color-bg-primary);
  border-left: 1px solid var(--color-divider);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.concept-drawer.open {
  transform: translateX(0);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-divider);
}

.drawer-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s;
}

.close-btn:hover {
  background: var(--color-status-error);
  color: var(--color-text-inverse);
}

.concept-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-divider);
}

.concept-tab {
  padding: 6px 14px;
  border-radius: 16px;
  border: 1px solid var(--input-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.concept-tab:hover {
  border-color: var(--color-accent);
  color: var(--color-text-primary);
}

.concept-tab.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-text-inverse);
}

.concept-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.concept-content h4 {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 12px 0;
}

.summary {
  font-size: 14px;
  color: var(--color-accent);
  margin: 0 0 20px 0;
  padding: 10px 14px;
  background: var(--color-surface);
  border-radius: 8px;
}

.details {
  margin-bottom: 20px;
}

.details strong {
  display: block;
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.details p {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.7;
  margin: 0;
}

.code-section {
  margin-top: 20px;
}

.code-section strong {
  display: block;
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.code-section pre {
  background: var(--color-code-bg);
  padding: 14px;
  border-radius: 8px;
  overflow-x: auto;
}

.code-section code {
  font-size: 13px;
  color: var(--color-accent);
  font-family: 'Monaco', 'Menlo', monospace;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state p {
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>