<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium transition-all select-none',
      'disabled:opacity-60 disabled:cursor-not-allowed',
      sizeClass,
      variantClass,
    ]"
    v-bind="$attrs"
  >
    <span v-if="loading" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
})

const sizeClass = computed(() => ({
  sm: 'text-xs px-3 py-1.5 rounded-[var(--radius-btn)]',
  md: 'text-sm px-5 py-2.5 rounded-[var(--radius-btn)]',
  lg: 'text-base px-6 py-3 rounded-[var(--radius-btn)]',
}[props.size]))

const variantClass = computed(() => ({
  primary:   'bg-[var(--color-primary)] text-white hover:opacity-90 active:opacity-80',
  secondary: 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white',
  ghost:     'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-page)] hover:text-[var(--color-text-body)]',
  danger:    'bg-[var(--color-danger)] text-white hover:opacity-90',
}[props.variant]))
</script>
