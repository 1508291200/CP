<template>
  <div class="block-editor border border-[var(--color-border-input)] rounded-[var(--radius-input)] overflow-hidden focus-within:border-[var(--color-primary)] transition-colors">
    <!-- 工具栏 -->
    <div
      v-if="editor"
      class="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-bg-page)]"
    >
      <ToolBtn :active="editor.isActive('bold')"            title="加粗 (Ctrl+B)"            @click="editor.chain().focus().toggleBold().run()">B</ToolBtn>
      <ToolBtn :active="editor.isActive('italic')"          title="斜体 (Ctrl+I)"            @click="editor.chain().focus().toggleItalic().run()"><em>I</em></ToolBtn>
      <ToolBtn :active="editor.isActive('strike')"          title="删除线"                   @click="editor.chain().focus().toggleStrike().run()"><s>S</s></ToolBtn>
      <div class="w-px h-4 bg-[var(--color-border)] mx-1" />
      <ToolBtn :active="editor.isActive('heading',{level:1})" title="标题 1"                  @click="editor.chain().focus().toggleHeading({level:1}).run()">H1</ToolBtn>
      <ToolBtn :active="editor.isActive('heading',{level:2})" title="标题 2"                  @click="editor.chain().focus().toggleHeading({level:2}).run()">H2</ToolBtn>
      <ToolBtn :active="editor.isActive('heading',{level:3})" title="标题 3"                  @click="editor.chain().focus().toggleHeading({level:3}).run()">H3</ToolBtn>
      <div class="w-px h-4 bg-[var(--color-border)] mx-1" />
      <ToolBtn :active="editor.isActive('bulletList')"      title="无序列表"                  @click="editor.chain().focus().toggleBulletList().run()">≡</ToolBtn>
      <ToolBtn :active="editor.isActive('orderedList')"     title="有序列表"                  @click="editor.chain().focus().toggleOrderedList().run()">1.</ToolBtn>
      <ToolBtn :active="editor.isActive('blockquote')"      title="引用"                      @click="editor.chain().focus().toggleBlockquote().run()">❝</ToolBtn>
      <div class="w-px h-4 bg-[var(--color-border)] mx-1" />
      <ToolBtn title="插入链接" @click="insertLink">🔗</ToolBtn>
      <ToolBtn title="插入图片" @click="triggerImageUpload">🖼</ToolBtn>
      <ToolBtn title="分割线"   @click="editor.chain().focus().setHorizontalRule().run()">—</ToolBtn>
    </div>

    <!-- 编辑区 -->
    <EditorContent
      :editor="editor"
      class="prose-editor px-4 py-3 min-h-[120px] text-sm text-[var(--color-text-body)] outline-none"
    />

    <!-- 隐藏的文件 input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="onFileSelected"
    />

    <!-- 上传进度 -->
    <div
      v-if="uploading"
      class="px-4 py-1.5 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)] bg-[var(--color-bg-page)] flex items-center gap-2"
    >
      <div class="h-1 flex-1 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          class="h-full bg-[var(--color-primary)] rounded-full transition-all"
          :style="{ width: uploadProgress + '%' }"
        />
      </div>
      <span>{{ uploadProgress }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, defineComponent, h } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { mediaApi } from '@/api/media'
import { useToast } from '@/composables/useToast'

// ── Props & Emits ─────────────────────────────────────────
interface Props {
  modelValue?: Record<string, unknown> | null  // Tiptap JSON
  placeholder?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '在此输入内容...',
  readonly:    false,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const toast        = useToast()
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading    = ref(false)
const uploadProgress = ref(0)

// ── 工具栏按钮子组件 ──────────────────────────────────────
const ToolBtn = defineComponent({
  props: { active: Boolean, title: String },
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () => h('button', {
      type:    'button',
      title:   props.title,
      class:   [
        'w-7 h-7 text-xs rounded flex items-center justify-center transition-colors select-none',
        props.active
          ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-body)]',
      ],
      onClick: (e: MouseEvent) => { e.preventDefault(); emit('click') },
    }, slots.default?.())
  },
})

// ── Tiptap Editor ─────────────────────────────────────────
const editor = useEditor({
  extensions: [
    StarterKit,
    Image.configure({ allowBase64: false }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-[var(--color-primary)] underline' } }),
    Placeholder.configure({ placeholder: props.placeholder }),
  ],
  content: props.modelValue ?? '',
  editable: !props.readonly,
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getJSON() as Record<string, unknown>)
  },
})

// 外部值变更时同步（如编辑模式回填）
watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  const current = JSON.stringify(editor.value.getJSON())
  const incoming = JSON.stringify(val ?? '')
  if (current !== incoming) {
    editor.value.commands.setContent(val ?? '', { emitUpdate: false })
  }
})

watch(() => props.readonly, (r) => {
  editor.value?.setEditable(!r)
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

// ── 链接插入 ──────────────────────────────────────────────
function insertLink() {
  const url = prompt('输入链接 URL:')
  if (!url) return
  editor.value?.chain().focus().setLink({ href: url }).run()
}

// ── 图片上传 ──────────────────────────────────────────────
function triggerImageUpload() {
  fileInputRef.value?.click()
}

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''  // reset

  uploading.value     = true
  uploadProgress.value = 0

  try {
    const res = await mediaApi.upload(file, (pct) => {
      uploadProgress.value = pct
    })

    const url = res.data?.url
    if (url) {
      editor.value?.chain().focus().setImage({ src: url, alt: file.name }).run()
    }
  } catch {
    toast.error('图片上传失败')
  } finally {
    uploading.value     = false
    uploadProgress.value = 0
  }
}
</script>

<style>
/* Tiptap prose 样式 */
.prose-editor .ProseMirror {
  outline: none;
}
.prose-editor .ProseMirror p {
  margin: 0.4em 0;
}
.prose-editor .ProseMirror h1 { font-size: 1.4em; font-weight: 700; margin: 0.6em 0 0.2em; }
.prose-editor .ProseMirror h2 { font-size: 1.2em; font-weight: 600; margin: 0.5em 0 0.2em; }
.prose-editor .ProseMirror h3 { font-size: 1.05em; font-weight: 600; margin: 0.4em 0 0.2em; }
.prose-editor .ProseMirror ul  { list-style: disc;    padding-left: 1.5em; margin: 0.3em 0; }
.prose-editor .ProseMirror ol  { list-style: decimal; padding-left: 1.5em; margin: 0.3em 0; }
.prose-editor .ProseMirror blockquote {
  border-left: 3px solid var(--color-primary);
  padding-left: 0.8em;
  margin: 0.4em 0;
  color: var(--color-text-secondary);
  font-style: italic;
}
.prose-editor .ProseMirror hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 0.8em 0;
}
.prose-editor .ProseMirror img {
  max-width: 100%;
  border-radius: var(--radius-card);
  margin: 0.4em 0;
}
.prose-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--color-text-disabled);
  pointer-events: none;
  float: left;
  height: 0;
}
</style>
