<template>
  <div class="max-w-4xl mx-auto px-6 py-8">
    <h2 class="text-lg font-bold text-[var(--color-text-title)] mb-6">主题设置</h2>

    <!-- 内置主题选择 -->
    <section class="mb-8">
      <h3 class="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">内置主题</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <button
          v-for="theme in BUILTIN_THEMES"
          :key="theme.id"
          class="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-card)] border-2 transition-all hover:-translate-y-0.5"
          :class="activeTheme.id === theme.id
            ? 'border-[var(--color-primary)] shadow-[var(--shadow-hover)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'"
          @click="switchTheme(theme.id)"
        >
          <!-- 主题色预览球 -->
          <div class="flex gap-1">
            <div class="w-4 h-4 rounded-full" :style="{ background: theme.tokens['--color-primary'] }" />
            <div class="w-4 h-4 rounded-full" :style="{ background: theme.tokens['--color-bg-card'] }" />
            <div class="w-4 h-4 rounded-full border" :style="{ background: theme.tokens['--color-bg-page'] }" />
          </div>
          <span class="text-xs font-medium text-[var(--color-text-body)]">{{ theme.name }}</span>
          <span v-if="activeTheme.id === theme.id" class="text-xs text-[var(--color-primary)]">✓ 当前</span>
        </button>
      </div>
    </section>

    <!-- 自定义颜色调色板 -->
    <section class="mb-8">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-[var(--color-text-secondary)]">自定义颜色</h3>
        <Button size="sm" variant="ghost" @click="resetToBuiltin">重置为当前内置主题</Button>
      </div>

      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <ColorPicker
            v-for="item in colorItems"
            :key="item.token"
            :label="item.label"
            :token="item.token"
            :value="customTokens[item.token]"
            @change="onColorChange(item.token, $event)"
          />
        </div>

        <div class="flex gap-3 mt-5 pt-4 border-t border-[var(--color-border)]">
          <Button size="sm" variant="ghost" @click="previewCustom">实时预览</Button>
          <Button size="sm" @click="saveAsCustomTheme">保存为自定义主题</Button>
        </div>
      </div>
    </section>

    <!-- 字体设置 -->
    <section class="mb-8">
      <h3 class="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">字体设置</h3>
      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 space-y-4">
        <div class="flex items-center gap-4">
          <label class="text-sm text-[var(--color-text-body)] w-24 flex-shrink-0">基础字号</label>
          <input
            v-model="fontSize"
            type="range" min="12" max="18" step="1"
            class="flex-1"
            @input="onFontSizeChange"
          />
          <span class="text-xs text-[var(--color-text-secondary)] w-10">{{ fontSize }}px</span>
        </div>
        <div class="flex items-center gap-4">
          <label class="text-sm text-[var(--color-text-body)] w-24 flex-shrink-0">正文字体</label>
          <select
            v-model="fontBody"
            class="flex-1 px-3 py-1.5 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
            @change="onFontBodyChange"
          >
            <option value='system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'>系统默认</option>
            <option value='"Noto Serif SC", serif'>宋体（Noto Serif SC）</option>
            <option value='"LXGW WenKai", cursive'>霞鹜文楷</option>
            <option value='"Source Han Sans SC", "Noto Sans SC", sans-serif'>思源黑体</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 布局调节 -->
    <section class="mb-8">
      <h3 class="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">布局与动画</h3>
      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-5 space-y-4">
        <div class="flex items-center gap-4">
          <label class="text-sm text-[var(--color-text-body)] w-24 flex-shrink-0">卡片圆角</label>
          <input
            v-model="cardRadius"
            type="range" min="0" max="24" step="2"
            class="flex-1"
            @input="onRadiusChange"
          />
          <span class="text-xs text-[var(--color-text-secondary)] w-10">{{ cardRadius }}px</span>
        </div>
        <div class="flex items-center gap-4">
          <label class="text-sm text-[var(--color-text-body)] w-24 flex-shrink-0">动画速度</label>
          <select
            v-model="animSpeed"
            class="flex-1 px-3 py-1.5 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
            @change="onAnimSpeedChange"
          >
            <option value="fast">快速</option>
            <option value="normal">标准</option>
            <option value="slow">慢速</option>
            <option value="none">无动画</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 导入/导出 -->
    <section class="mb-8">
      <h3 class="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">主题文件</h3>
      <div class="flex gap-3 flex-wrap">
        <Button size="sm" variant="ghost" @click="exportTheme">↓ 导出当前主题 JSON</Button>
        <label class="cursor-pointer">
          <span class="inline-flex items-center px-3 py-1.5 text-xs rounded-[var(--radius-btn)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer">
            ↑ 导入主题 JSON
          </span>
          <input type="file" accept=".json" class="hidden" @change="onImportFile" />
        </label>
      </div>
    </section>

    <!-- 自定义主题列表 -->
    <section v-if="customThemes.length">
      <h3 class="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">我的自定义主题</h3>
      <div class="space-y-2">
        <div
          v-for="t in customThemes"
          :key="t.id"
          class="flex items-center gap-3 p-3 bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)]"
        >
          <div class="flex gap-1">
            <div class="w-3 h-3 rounded-full" :style="{ background: t.tokens['--color-primary'] }" />
            <div class="w-3 h-3 rounded-full border" :style="{ background: t.tokens['--color-bg-page'] }" />
          </div>
          <span class="text-sm text-[var(--color-text-body)] flex-1">{{ t.name }}</span>
          <button class="text-xs text-[var(--color-primary)] hover:underline" @click="switchTheme(t.id)">应用</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import Button from '@/components/base/Button.vue'
import { useTheme } from '@/composables/useTheme'
import { useThemeStore, BUILTIN_THEMES } from '@/stores/theme'
import { useToast } from '@/composables/useToast'
import type { ThemeConfig } from '@/styles/themes/types'

// ── 颜色选择器子组件（内联实现）──────────────────────────
import { defineComponent, h } from 'vue'
const ColorPicker = defineComponent({
  props: { label: String, token: String, value: String },
  emits: ['change'],
  setup(props, { emit }) {
    return () => h('div', { class: 'flex flex-col gap-1.5' }, [
      h('label', { class: 'text-xs text-[var(--color-text-secondary)]' }, props.label),
      h('div', { class: 'flex items-center gap-2' }, [
        h('input', {
          type: 'color',
          value: props.value ?? '#000000',
          class: 'w-8 h-8 rounded cursor-pointer border border-[var(--color-border)] p-0.5',
          onInput: (e: InputEvent) => emit('change', (e.target as HTMLInputElement).value),
        }),
        h('span', { class: 'text-xs text-[var(--color-text-disabled)] font-mono' }, props.value),
      ]),
    ])
  },
})

const themeStore = useThemeStore()
const toast      = useToast()
const { switchTheme, exportTheme, importTheme } = useTheme()

const activeTheme   = themeStore.activeTheme
const customThemes  = themeStore.customThemes

const colorItems = [
  { token: '--color-primary',        label: '主色' },
  { token: '--color-primary-bg',     label: '主色背景' },
  { token: '--color-bg-page',        label: '页面背景' },
  { token: '--color-bg-card',        label: '卡片背景' },
  { token: '--color-text-title',     label: '标题文字' },
  { token: '--color-text-body',      label: '正文文字' },
  { token: '--color-critical',       label: '核心级颜色' },
  { token: '--color-high',           label: '重要级颜色' },
  { token: '--color-danger',         label: '危险色' },
] as const

// 自定义颜色 token（初始值从当前主题读取）
const customTokens = reactive<Record<string, string>>({})
colorItems.forEach(({ token }) => {
  customTokens[token] = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
})

const fontSize   = ref(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size-base') || '14'))
const fontBody   = ref(getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim())
const cardRadius = ref(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--radius-card') || '12'))
const animSpeed  = ref('normal')

function onColorChange(token: string, value: string) {
  customTokens[token] = value
}

function previewCustom() {
  for (const [token, value] of Object.entries(customTokens)) {
    document.documentElement.style.setProperty(token, value)
  }
}

function resetToBuiltin() {
  themeStore.applyTheme(themeStore.globalTheme)
  colorItems.forEach(({ token }) => {
    customTokens[token] = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  })
}

function saveAsCustomTheme() {
  const name = prompt('为这个主题命名:')
  if (!name) return
  const config = themeStore.saveCustomTheme(name, customTokens as ThemeConfig['tokens'])
  themeStore.switchGlobalTheme(config)
  toast.success(`主题「${name}」已保存 ✓`)
}

function onFontSizeChange() {
  document.documentElement.style.setProperty('--font-size-base', `${fontSize.value}px`)
}

function onFontBodyChange() {
  document.documentElement.style.setProperty('--font-body', fontBody.value)
}

function onRadiusChange() {
  document.documentElement.style.setProperty('--radius-card',  `${cardRadius.value}px`)
  document.documentElement.style.setProperty('--radius-input', `${Math.max(4, cardRadius.value - 4)}px`)
}

function onAnimSpeedChange() {
  const speeds: Record<string, { fast: string; normal: string; slow: string }> = {
    fast:   { fast: '80ms',  normal: '120ms', slow: '200ms'  },
    normal: { fast: '150ms', normal: '200ms', slow: '300ms'  },
    slow:   { fast: '300ms', normal: '400ms', slow: '600ms'  },
    none:   { fast: '0ms',   normal: '0ms',   slow: '0ms'    },
  }
  const s = speeds[animSpeed.value]
  if (!s) return
  document.documentElement.style.setProperty('--duration-fast',   s.fast)
  document.documentElement.style.setProperty('--duration-normal', s.normal)
  document.documentElement.style.setProperty('--duration-slow',   s.slow)
}

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) await importTheme(file)
  ;(e.target as HTMLInputElement).value = ''
}
</script>
