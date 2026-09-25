<template>
  <button
    :class="['st-toggle', { active: modelValue }]"
    :aria-checked="modelValue"
    role="switch"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="st-thumb" />
  </button>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [v: boolean] }>()
</script>

<style lang="scss" scoped>
.st-toggle {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: none;
  background: var(--color-border);
  cursor: pointer;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
  padding: 0;
}

.st-toggle.active {
  background: var(--color-accent);
}

.st-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.st-toggle.active .st-thumb {
  transform: translateX(18px);
}
</style>
