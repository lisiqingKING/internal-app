<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('cancel')">
      <div class="modal-dialog">
        <div class="modal-header">重命名对话</div>
        <input
          ref="inputRef"
          v-model="localValue"
          class="modal-input"
          :class="{ error: error }"
          placeholder="输入新名称"
          :maxlength="MAX_TITLE_LENGTH"
          @input="onInput"
          @keydown.enter="emit('confirm', localValue.trim())"
        />
        <div v-if="error" class="modal-error">{{ error }}</div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="emit('cancel')">取消</button>
          <button class="modal-btn confirm" :disabled="!canConfirm" @click="emit('confirm', localValue.trim())">确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ILLEGAL_CHARS, MAX_TITLE_LENGTH } from '../types'

const props = defineProps<{
  modelValue: string
  error: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:error': [value: string]
  confirm: [title: string]
  cancel: []
}>()

const inputRef = ref<HTMLInputElement>()
const localValue = ref(props.modelValue)

const canConfirm = computed(() => {
  const val = localValue.value.trim()
  return val.length > 0 && !ILLEGAL_CHARS.test(val) && val.length <= MAX_TITLE_LENGTH
})

watch(() => props.modelValue, v => { localValue.value = v })

function onInput() {
  const val = localValue.value
  if (val.length === 0) {
    emit('update:error', '名称不能为空')
  } else if (ILLEGAL_CHARS.test(val)) {
    emit('update:error', '不允许包含 \\ / : * ? " < > |')
  } else if (val.length > MAX_TITLE_LENGTH) {
    emit('update:error', `名称不能超过 ${MAX_TITLE_LENGTH} 个字符`)
  } else {
    emit('update:error', '')
  }
  emit('update:modelValue', localValue.value)
}

defineExpose({
  focus: () => nextTick(() => inputRef.value?.focus())
})
</script>
