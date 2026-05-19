<template>
  <div class="max-w-5xl mx-auto px-6 py-6">
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="!tab" class="text-center py-20 text-[var(--color-text-secondary)]">
      找不到该 Tab
    </div>

    <template v-else>
      <!-- 标题栏 + 管理按钮 -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-[var(--color-text-title)]">{{ tab.name }}</h2>
        <button
          v-if="canInCp(props.cpId, 'custom_tab:manage')"
          class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors border border-[var(--color-border)] px-2.5 py-1 rounded-[var(--radius-btn)]"
          @click="showEditor = true"
        >⚙ 编辑</button>
      </div>

      <!-- 内容渲染：richtext -->
      <div
        v-if="tab.tabType === 'custom'"
        class="prose prose-sm max-w-none text-[var(--color-text-body)]"
        v-html="htmlContent"
      />

      <!-- 链接列表 -->
      <div v-else-if="tab.tabType === 'profile'" class="grid gap-3">
        <a
          v-for="(link, i) in links"
          :key="i"
          :href="link.url"
          target="_blank"
          rel="noopener"
          class="flex items-center gap-3 p-3 rounded-[var(--radius-card)] bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
        >
          <span class="text-lg">{{ link.icon || '🔗' }}</span>
          <div class="min-w-0">
            <div class="text-sm font-medium text-[var(--color-text-body)] truncate">{{ link.title }}</div>
            <div class="text-xs text-[var(--color-text-secondary)] truncate">{{ link.url }}</div>
          </div>
        </a>
        <div v-if="!links.length" class="text-center py-10 text-[var(--color-text-secondary)] text-sm">
          暂无链接内容
        </div>
      </div>

      <!-- 图片画廊 -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <img
          v-for="(img, i) in images"
          :key="i"
          :src="img.url"
          :alt="img.alt || ''"
          class="w-full aspect-square object-cover rounded-[var(--radius-card)] cursor-pointer hover:opacity-90 transition-opacity"
          @click="lightboxIndex = i"
        />
        <div v-if="!images.length" class="col-span-full text-center py-10 text-[var(--color-text-secondary)] text-sm">
          暂无图片
        </div>
      </div>
    </template>

    <!-- Tab 内容编辑弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showEditor" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-modal)] shadow-[var(--shadow-modal)] w-full max-w-lg p-6 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-[var(--color-text-title)]">编辑 Tab 内容</span>
              <button class="text-[var(--color-text-disabled)] hover:text-[var(--color-text-body)]" @click="showEditor = false">✕</button>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs text-[var(--color-text-secondary)]">Tab 名称</label>
              <input
                v-model="editName"
                class="w-full px-3 py-2 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs text-[var(--color-text-secondary)]">内容（JSON）</label>
              <textarea
                v-model="editContentRaw"
                rows="8"
                class="w-full px-3 py-2 text-xs font-mono rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)] resize-none"
                :class="{ 'border-red-400': jsonError }"
              />
              <p v-if="jsonError" class="text-xs text-red-400">{{ jsonError }}</p>
              <p class="text-xs text-[var(--color-text-disabled)]">
                richtext: {"html":"..."} &nbsp;|&nbsp; links: [{"title":"","url":"","icon":""}] &nbsp;|&nbsp; gallery: [{"url":"","alt":""}]
              </p>
            </div>

            <div class="flex gap-2 justify-end">
              <button class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] px-3 py-1.5 border border-[var(--color-border)] rounded-[var(--radius-btn)]" @click="showEditor = false">取消</button>
              <button class="text-sm bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-[var(--radius-btn)] hover:opacity-90 disabled:opacity-50" :disabled="saving" @click="saveTab">
                {{ saving ? '保存中…' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 简单灯箱 -->
    <Teleport to="body">
      <div v-if="lightboxIndex !== null" class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" @click="lightboxIndex = null">
        <img :src="images[lightboxIndex]?.url" class="max-h-[90vh] max-w-[90vw] object-contain rounded" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { cpApi, type CpTab } from '@/api/cp'
import { usePermission } from '@/composables/usePermission'
import { useToast } from '@/composables/useToast'
import type { CpItem } from '@/types'

const props = defineProps<{ cp?: CpItem | null; cpId: string }>()

const route   = useRoute()
const { canInCp } = usePermission()
const toast   = useToast()

const tab      = ref<CpTab | null>(null)
const loading  = ref(false)
const showEditor = ref(false)
const saving   = ref(false)
const editName = ref('')
const editContentRaw = ref('')
const jsonError = ref('')
const lightboxIndex = ref<number | null>(null)

const tabId = computed(() => route.params.tabId as string)

async function loadTab() {
  loading.value = true
  try {
    const tabs = await cpApi.listTabs(props.cpId)
    tab.value = tabs.data.find(t => t.id === tabId.value) ?? null
    if (tab.value) {
      editName.value = tab.value.name
      editContentRaw.value = JSON.stringify(tab.value.content, null, 2)
    }
  } finally {
    loading.value = false
  }
}

watch(tabId, loadTab, { immediate: true })
watch(showEditor, (v) => {
  if (v && tab.value) {
    editName.value       = tab.value.name
    editContentRaw.value = JSON.stringify(tab.value.content, null, 2)
    jsonError.value      = ''
  }
})

// 渲染逻辑
const htmlContent = computed(() => {
  const c = tab.value?.content as Record<string, unknown> | undefined
  return (c?.['html'] as string) ?? ''
})

const links = computed<Array<{ title: string; url: string; icon?: string }>>(() => {
  const c = tab.value?.content
  if (!c) return []
  return Array.isArray(c) ? c as Array<{ title: string; url: string; icon?: string }> : []
})

const images = computed<Array<{ url: string; alt?: string }>>(() => {
  const c = tab.value?.content
  if (!c) return []
  return Array.isArray(c) ? c as Array<{ url: string; alt?: string }> : []
})

async function saveTab() {
  jsonError.value = ''
  let content: Record<string, unknown> | unknown[]
  try {
    content = JSON.parse(editContentRaw.value)
  } catch {
    jsonError.value = 'JSON 格式错误'
    return
  }
  saving.value = true
  try {
    await cpApi.updateTab(props.cpId, tabId.value, {
      name:    editName.value,
      content: content as Record<string, unknown>,
    })
    await loadTab()
    showEditor.value = false
    toast.success('保存成功')
  } catch {
    toast.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadTab)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
