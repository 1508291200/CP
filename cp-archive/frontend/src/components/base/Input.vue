<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-sm font-medium text-[var(--color-text-body)]">
      {{ label }}<span v-if="required" class="text-[var(--color-danger)] ml-0.5">*</span>
    </label>
    <input
      v-bind="$attrs"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :type="type"
      class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors placeholder:text-[var(--color-text-disabled)] disabled:opacity-60"
      :class="error
        ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)]'
        : 'border-[var(--color-border-input)] focus:border-[var(--color-primary)]'"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="text-xs text-[var(--color-danger)]">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
  type?: string
}

withDefaults(defineProps<Props>(), { type: 'text' })
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
