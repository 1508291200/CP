<template>
  <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6">
    <!-- 头部：头像 + 基本信息 -->
    <div class="flex items-start gap-4 mb-4">
      <div class="w-20 h-20 rounded-full flex-shrink-0 overflow-hidden bg-[var(--color-primary-bg)]">
        <img v-if="character.avatarUrl" :src="character.avatarUrl" :alt="character.name" class="w-full h-full object-cover" />
        <div v-else class="w-full h-full flex items-center justify-center text-2xl">👤</div>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-base font-bold text-[var(--color-text-title)]">{{ character.name }}</h3>
          <span v-if="character.roleLabel" class="text-xs px-2 py-0.5 rounded-[var(--radius-tag)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
            {{ character.roleLabel }}
          </span>
        </div>

        <div v-if="character.aliases?.length" class="text-xs text-[var(--color-text-secondary)] mb-2">
          又名：{{ character.aliases.join(' / ') }}
        </div>

        <div v-if="character.birthday" class="text-xs text-[var(--color-text-secondary)]">
          🎂 {{ character.birthday }}
        </div>
      </div>

      <!-- 编辑按钮 -->
      <div v-if="can('cp:create')" class="flex gap-1 flex-shrink-0">
        <button
          class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)] px-2 py-1 rounded-[var(--radius-btn)] transition-colors"
          @click="$emit('edit', character)"
        >编辑</button>
        <button
          class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] border border-[var(--color-border)] px-2 py-1 rounded-[var(--radius-btn)] transition-colors"
          @click="handleDelete"
        >删除</button>
      </div>
    </div>

    <!-- 简介 -->
    <p v-if="character.bio" class="text-sm text-[var(--color-text-body)] leading-relaxed mb-4 whitespace-pre-wrap">
      {{ character.bio }}
    </p>

    <!-- 自定义字段 -->
    <div v-if="hasCustomFields">
      <button
        class="flex items-center gap-1 text-xs text-[var(--color-primary)] mb-2"
        @click="showExtra = !showExtra"
      >
        {{ showExtra ? '收起 ∧' : '更多详情 ∨' }}
      </button>

      <Transition name="expand">
        <div v-if="showExtra" class="space-y-2">
          <div
            v-for="field in customFields"
            :key="field.key"
            class="flex items-start gap-2"
          >
            <span class="text-xs font-medium text-[var(--color-text-secondary)] w-20 flex-shrink-0 pt-0.5">{{ field.key }}</span>
            <span class="text-xs text-[var(--color-text-body)] flex-1">{{ field.value }}</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Character } from '@/types'
import { usePermission } from '@/composables/usePermission'
import { useCharacterStore } from '@/stores/character'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ character: Character }>()
const emit  = defineEmits<{
  edit:    [character: Character]
  deleted: [id: string]
}>()

const { can }   = usePermission()
const charStore = useCharacterStore()
const toast     = useToast()
const showExtra = ref(false)

interface CustomField { key: string; value: string }

const customFields = computed<CustomField[]>(() => {
  const fields = props.character.customFields as CustomField[] | null
  if (!fields || !Array.isArray(fields)) return []
  return fields
})

const hasCustomFields = computed(() => customFields.value.length > 0)

async function handleDelete() {
  if (!confirm(`确认删除人物「${props.character.name}」？`)) return
  try {
    await charStore.deleteCharacter(props.character.cpId, props.character.id)
    toast.success('已删除')
    emit('deleted', props.character.id)
  } catch {
    toast.error('删除失败')
  }
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all var(--duration-normal) var(--easing-out);
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to { opacity: 0; max-height: 0; }
.expand-enter-to,
.expand-leave-from { opacity: 1; max-height: 400px; }
</style>
