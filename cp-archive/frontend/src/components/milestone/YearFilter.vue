<template>
  <div class="flex items-center gap-1 flex-wrap">
    <button
      class="px-3 py-1 text-xs rounded-[var(--radius-btn)] border transition-all"
      :class="modelValue === null
        ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'"
      @click="$emit('update:modelValue', null)"
    >全部</button>

    <button
      v-for="year in years"
      :key="year"
      class="px-3 py-1 text-xs rounded-[var(--radius-btn)] border transition-all"
      :class="modelValue === year
        ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'"
      @click="$emit('update:modelValue', year)"
    >{{ year }}</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  years:       number[]
  modelValue:  number | null
}>()

defineEmits<{ 'update:modelValue': [year: number | null] }>()
</script>
