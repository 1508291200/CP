<template>
  <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold text-[var(--color-text-title)]">关系概述</h3>
      <button
        v-if="can('cp:create') && !editing"
        class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
        @click="startEdit"
      >编辑</button>
    </div>

    <!-- 关系元信息 -->
    <div class="flex flex-wrap gap-3 mb-4 text-xs text-[var(--color-text-secondary)]">
      <span v-if="cp?.status">状态：
        <span :class="statusClass">{{ statusLabel }}</span>
      </span>
      <span v-if="cp?.description" class="truncate max-w-[300px]">{{ cp.description }}</span>
    </div>

    <!-- 关系描述文本 -->
    <div v-if="!editing">
      <p
        v-if="overview"
        class="text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-wrap"
      >{{ overview }}</p>
      <p v-else class="text-sm text-[var(--color-text-disabled)] italic">
        还没有关系概述，点击编辑添加
      </p>
    </div>

    <!-- 编辑模式 -->
    <div v-else>
      <textarea
        v-model="editText"
        rows="5"
        placeholder="描述这对 CP 的关系，故事，以及你的感受..."
        class="w-full px-3 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)] resize-none"
        autofocus
      />
      <p class="text-xs text-[var(--color-text-disabled)] mt-1 mb-3">富文本编辑器将在 Phase 6 启用</p>
      <div class="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" @click="cancelEdit">取消</Button>
        <Button size="sm" :loading="saving" @click="saveOverview">保存</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CpItem } from '@/types'
import Button from '@/components/base/Button.vue'
import { usePermission } from '@/composables/usePermission'
import { useCpStore } from '@/stores/cp'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ cp?: CpItem | null }>()

const { can }   = usePermission()
const cpStore   = useCpStore()
const toast     = useToast()

const editing  = ref(false)
const saving   = ref(false)
// 关系概述存在 cp.description 字段（扩展字段，Phase 7 可独立）
const overview = computed(() => props.cp?.description ?? '')
const editText = ref('')

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:   { label: '进行中', cls: 'text-[var(--color-success)]' },
  archived: { label: '已归档', cls: 'text-[var(--color-text-disabled)]' },
  completed:{ label: '完结',   cls: 'text-[var(--color-medium)]' },
}

const statusLabel = computed(() => STATUS_MAP[props.cp?.status ?? '']?.label ?? '')
const statusClass = computed(() => STATUS_MAP[props.cp?.status ?? '']?.cls ?? '')

function startEdit() {
  editText.value = overview.value
  editing.value  = true
}

function cancelEdit() {
  editing.value = false
}

async function saveOverview() {
  if (!props.cp) return
  saving.value = true
  try {
    await cpStore.updateCp(props.cp.id, { description: editText.value })
    editing.value = false
    toast.success('已保存 ✓')
  } catch {
    toast.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>
