<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-[300] flex items-center justify-center p-4"
        @click.self="onOverlayClick"
      >
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        <!-- Panel -->
        <div
          class="relative bg-[var(--color-bg-card)] rounded-[var(--radius-modal)] shadow-[var(--shadow-modal)] w-full"
          :class="sizeClass"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
            <slot name="header">
              <h3 class="text-base font-semibold text-[var(--color-text-title)]">{{ title }}</h3>
            </slot>
            <button
              class="text-[var(--color-text-disabled)] hover:text-[var(--color-text-secondary)] transition-colors"
              @click="$emit('update:visible', false)"
            >✕</button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 pb-5 flex justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  visible: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
  closeOnOverlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeOnOverlay: true,
})
const emit = defineEmits<{ 'update:visible': [v: boolean] }>()

const sizeClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}[props.size]))

function onOverlayClick() {
  if (props.closeOnOverlay) emit('update:visible', false)
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity var(--duration-normal) var(--easing-out);
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: transform var(--duration-normal) var(--easing-out);
}
.modal-enter-from > div:last-child { transform: scale(0.95) translateY(8px); }
.modal-leave-to > div:last-child { transform: scale(0.95) translateY(8px); }
</style>
