<template>
  <div class="max-w-2xl">
    <h2 class="text-lg font-semibold text-[var(--color-text-title)] mb-6">数据管理</h2>

    <!-- 导出区 -->
    <section class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 mb-6">
      <h3 class="font-medium text-[var(--color-text-body)] mb-4">导出备份</h3>
      <p class="text-sm text-[var(--color-text-secondary)] mb-4">导出所有数据为 JSON 文件，可用于备份或迁移。</p>

      <div class="flex flex-col gap-3 sm:flex-row">
        <Button :loading="exportingFull" @click="handleExportFull">
          ⬇ 导出全站数据
        </Button>
        <div class="flex gap-2 items-center">
          <select
            v-model="selectedCpId"
            class="flex-1 px-3 py-2 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">选择 CP…</option>
            <option v-for="cp in cpList" :key="cp.id" :value="cp.id">{{ cp.name }}</option>
          </select>
          <Button variant="ghost" :loading="exportingCp" :disabled="!selectedCpId" @click="handleExportCp">
            ⬇ 导出
          </Button>
        </div>
      </div>
    </section>

    <!-- 导入区 -->
    <section class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 mb-6">
      <h3 class="font-medium text-[var(--color-text-body)] mb-4">导入数据</h3>
      <p class="text-sm text-[var(--color-text-secondary)] mb-4">
        上传之前导出的 JSON 文件。<br/>
        <strong class="text-[var(--color-text-body)]">merge</strong> 模式按名称匹配合并；<strong class="text-[var(--color-text-body)]">overwrite</strong> 模式将清空全部数据再写入。
      </p>

      <!-- 拖放区 -->
      <div
        class="border-2 border-dashed rounded-[var(--radius-card)] p-8 text-center cursor-pointer transition-colors mb-4"
        :class="dragOver
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
          : 'border-[var(--color-border-input)] hover:border-[var(--color-primary)]'"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <div class="text-3xl mb-2">📂</div>
        <p class="text-sm text-[var(--color-text-secondary)]">
          {{ importFile ? importFile.name : '点击或拖放 JSON 文件到此处' }}
        </p>
        <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="onFileChange" />
      </div>

      <!-- 模式选择 -->
      <div class="flex gap-4 mb-4">
        <label
          v-for="m in importModes"
          :key="m.value"
          class="flex items-center gap-2 cursor-pointer"
        >
          <input type="radio" :value="m.value" v-model="importMode" class="accent-[var(--color-primary)]" />
          <span class="text-sm text-[var(--color-text-body)]">{{ m.label }}</span>
          <span class="text-xs text-[var(--color-text-disabled)]">{{ m.desc }}</span>
        </label>
      </div>

      <!-- 导入结果 -->
      <div v-if="importResult" class="mb-4 p-3 bg-[var(--color-bg-page)] rounded-[var(--radius-card)] text-sm">
        <div class="font-medium text-[var(--color-text-body)] mb-1">导入完成（{{ importResult.mode }} 模式）</div>
        <div class="grid grid-cols-3 gap-2 text-[var(--color-text-secondary)]">
          <span>关系: {{ importResult.imported.cps }}</span>
          <span>事件: {{ importResult.imported.events }}</span>
          <span>角色: {{ importResult.imported.characters }}</span>
          <span>节点: {{ importResult.imported.milestones }}</span>
          <span>标签: {{ importResult.imported.tags }}</span>
          <span>跳过: {{ importResult.skipped }}</span>
        </div>
        <div v-if="importResult.errors.length" class="mt-2 text-[var(--color-danger)] text-xs">
          {{ importResult.errors.length }} 条错误：{{ importResult.errors.slice(0, 3).join('；') }}
        </div>
      </div>

      <Button
        :loading="importing"
        :disabled="!importFile"
        @click="handleImport"
      >⬆ 开始导入</Button>
    </section>

    <!-- 危险区 -->
    <section class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-6 border border-[var(--color-danger)]/30">
      <h3 class="font-medium text-[var(--color-danger)] mb-4">⚠️ 危险操作</h3>
      <p class="text-sm text-[var(--color-text-secondary)] mb-4">
        清空全站所有关系、事件、角色、节点和标签数据。此操作<strong class="text-[var(--color-danger)]">不可撤销</strong>，请先导出备份。
      </p>

      <div v-if="!showClearConfirm">
        <Button variant="ghost" class="border-[var(--color-danger)] text-[var(--color-danger)]" @click="showClearConfirm = true">
          清空全站数据
        </Button>
      </div>
      <div v-else class="flex flex-col gap-3">
        <p class="text-sm font-medium text-[var(--color-text-body)]">请输入 <code class="bg-[var(--color-bg-page)] px-1 rounded">DELETE ALL</code> 确认：</p>
        <input
          v-model="clearConfirmText"
          type="text"
          placeholder="DELETE ALL"
          class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-danger)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none font-mono"
        />
        <div class="flex gap-2">
          <Button
            :loading="clearing"
            :disabled="clearConfirmText !== 'DELETE ALL'"
            @click="handleClearAll"
          >确认清空</Button>
          <Button variant="ghost" @click="showClearConfirm = false; clearConfirmText = ''">取消</Button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from '@/components/base/Button.vue'
import { exportFull, exportCp, importData, clearAllData, type ImportResult } from '@/api/data'
import { useCpStore } from '@/stores/cp'
import { useToast } from '@/composables/useToast'

const cpStore = useCpStore()
const toast   = useToast()

const cpList     = computed(() => cpStore.list)
const selectedCpId = ref('')
const fileInput  = ref<HTMLInputElement>()
const importFile = ref<File | null>(null)
const importMode = ref<'merge' | 'overwrite'>('merge')
const importResult = ref<ImportResult | null>(null)
const dragOver   = ref(false)

const exportingFull = ref(false)
const exportingCp   = ref(false)
const importing     = ref(false)
const clearing      = ref(false)

const showClearConfirm  = ref(false)
const clearConfirmText  = ref('')

const importModes = [
  { value: 'merge',     label: 'Merge',     desc: '按名称合并，已存在的跳过' },
  { value: 'overwrite', label: 'Overwrite', desc: '清空后全量写入' },
]

async function handleExportFull() {
  exportingFull.value = true
  try {
    await exportFull()
    toast.success('导出成功，文件已下载')
  } catch {
    toast.error('导出失败')
  } finally {
    exportingFull.value = false
  }
}

async function handleExportCp() {
  if (!selectedCpId.value) return
  exportingCp.value = true
  try {
    await exportCp(selectedCpId.value)
    toast.success('导出成功，文件已下载')
  } catch {
    toast.error('导出失败')
  } finally {
    exportingCp.value = false
  }
}

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) { importFile.value = f; importResult.value = null }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f?.name.endsWith('.json')) { importFile.value = f; importResult.value = null }
  else toast.error('请选择 .json 文件')
}

async function handleImport() {
  if (!importFile.value) return
  importing.value = true
  try {
    importResult.value = await importData(importFile.value, importMode.value)
    toast.success(`导入完成：${importResult.value.imported.cps} 个关系`)
    cpStore.fetchList({ page: 1, limit: 20 })
  } catch {
    toast.error('导入失败，请检查文件格式')
  } finally {
    importing.value = false
  }
}

async function handleClearAll() {
  clearing.value = true
  try {
    await clearAllData()
    toast.success('全站数据已清空')
    showClearConfirm.value = false
    clearConfirmText.value = ''
    cpStore.fetchList({ page: 1, limit: 20 })
  } catch {
    toast.error('清空失败')
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  if (!cpStore.list.length) cpStore.fetchList({ page: 1, limit: 100 })
})
</script>
