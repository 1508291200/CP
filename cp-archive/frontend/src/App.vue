<template>
  <RouterView />
  <!-- Toast 容器 -->
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
        <div
          v-for="toast in uiStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] shadow-[var(--shadow-modal)] text-sm font-medium text-white min-w-[240px] max-w-[360px]"
          :class="{
            'bg-[var(--color-success)]': toast.type === 'success',
            'bg-[var(--color-danger)]': toast.type === 'error',
            'bg-[var(--color-primary)]': toast.type === 'info',
            'bg-[var(--color-warning)]': toast.type === 'warning',
          }"
        >
          <span class="flex-1">{{ toast.message }}</span>
          <button
            class="opacity-70 hover:opacity-100 transition-opacity"
            @click="uiStore.removeToast(toast.id)"
          >
            ✕
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
</script>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: all var(--duration-normal) var(--easing-out);
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
