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
      <span v-if="cp?.status">状态：<span :class="statusClass">{{ statusLabel }}</span></span>
    </div>

    <!-- 只读展示 -->
    <div v-if="!editing">
      <div
        v-if="renderedHtml"
        class="prose-render text-sm text-[var(--color-text-body)] leading-relaxed"
        v-html="renderedHtml"
      />
      <div
        v-else-if="plainText"
        class="text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-wrap"
      >{{ plainText }}</div>
      <p v-else class="text-sm text-[var(--color-text-disabled)] italic">
        还没有任何文字，点击编辑写下第一行
      </p>
    </div>

    <!-- 编辑模式：BlockEditor -->
    <div v-else>
      <BlockEditor
        v-model="editJson"
        placeholder="记录这段关系的脉络与故事…"
      />
      <div class="flex gap-2 justify-end mt-3">
        <Button variant="ghost" size="sm" @click="cancelEdit">取消</Button>
        <Button size="sm" :loading="saving" @click="saveOverview">保存</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { generateHTML } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import type { CpItem } from '@/types'
import Button from '@/components/base/Button.vue'
import BlockEditor from '@/components/editor/BlockEditor.vue'
import { usePermission } from '@/composables/usePermission'
import { useCpStore } from '@/stores/cp'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ cp?: CpItem | null }>()

const { can }   = usePermission()
const cpStore   = useCpStore()
const toast     = useToast()

const editing  = ref(false)
const saving   = ref(false)
const editJson = ref<Record<string, unknown> | null>(null)

// 关系概述存储在 cp.themeConfig.overviewContent（JSONB 字段）中
// 保持向后兼容：cp.description 作为纯文本降级
const overviewJson = computed<Record<string, unknown> | null>(() => {
  const cfg = props.cp?.themeConfig as Record<string, unknown> | null
  const oc = cfg?.overviewContent
  return (oc && typeof oc === 'object') ? oc as Record<string, unknown> : null
})

const renderedHtml = computed<string | null>(() => {
  const json = overviewJson.value
  if (!json?.type) return null
  try {
    return generateHTML(json as Parameters<typeof generateHTML>[0], [StarterKit, Image, Link])
  } catch { return null }
})

const plainText = computed<string | null>(() => {
  if (renderedHtml.value) return null
  return props.cp?.description ?? null
})

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:    { label: '进行中', cls: 'text-[var(--color-success)]' },
  archived:  { label: '已归档', cls: 'text-[var(--color-text-disabled)]' },
  completed: { label: '完结',   cls: 'text-[var(--color-medium)]' },
}

const statusLabel = computed(() => STATUS_MAP[props.cp?.status ?? '']?.label ?? '')
const statusClass = computed(() => STATUS_MAP[props.cp?.status ?? '']?.cls ?? '')

function startEdit() {
  editJson.value = overviewJson.value
  editing.value  = true
}

function cancelEdit() { editing.value = false }

async function saveOverview() {
  if (!props.cp) return
  saving.value = true
  try {
    const currentCfg = (props.cp.themeConfig as Record<string, unknown>) ?? {}
    await cpStore.updateCp(props.cp.id, {
      themeConfig: { ...currentCfg, overviewContent: editJson.value },
    })
    editing.value = false
    toast.success('已保存 ✓')
  } catch {
    toast.error('保存失败')
  } finally {
    saving.value = false
  }
}
</script>
