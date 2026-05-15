<template>
  <span
    class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-[var(--radius-tag)] font-medium"
    :style="{ backgroundColor: bgColor, color: textColor }"
  >
    <slot>{{ label }}</slot>
    <button
      v-if="closable"
      class="ml-0.5 hover:opacity-70 leading-none"
      @click.stop="$emit('close')"
    >✕</button>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label?: string
  color?: string
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), { color: '#7B5EA7' })
defineEmits<{ close: [] }>()

// 根据色值生成半透明背景
const bgColor = computed(() => `${props.color}1A`)   // 10% opacity
const textColor = computed(() => props.color)
</script>
