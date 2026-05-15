<template>
  <Modal
    :visible="visible"
    :title="isEdit ? '编辑人物' : '添加人物'"
    @update:visible="$emit('update:visible', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <!-- 姓名 -->
      <Input v-model="form.name" label="姓名" placeholder="人物姓名" required :error="errors.name" />

      <!-- 角色标签 -->
      <Input v-model="form.roleLabel" label="角色标签" placeholder="例：主角、演员、角色" />

      <!-- 生日 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">生日</label>
        <input
          v-model="form.birthday"
          type="date"
          class="px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <!-- 头像 URL（Phase 6 前使用 URL 输入） -->
      <Input v-model="form.avatarUrl" label="头像图片 URL" placeholder="https://... （Phase 6 支持上传）" />

      <!-- 别名 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">其他名称</label>
        <div class="flex flex-wrap gap-2 mb-2">
          <span
            v-for="(alias, i) in form.aliases"
            :key="i"
            class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-[var(--radius-tag)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]"
          >
            {{ alias }}
            <button type="button" class="hover:text-[var(--color-danger)]" @click="removeAlias(i)">×</button>
          </span>
        </div>
        <div class="flex gap-2">
          <input
            v-model="aliasInput"
            placeholder="添加别名，按 Enter 确认"
            class="flex-1 px-3 py-1.5 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
            @keydown.enter.prevent="addAlias"
          />
          <button type="button" class="text-xs text-[var(--color-primary)] hover:underline" @click="addAlias">添加</button>
        </div>
      </div>

      <!-- 简介 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">人物简介</label>
        <textarea
          v-model="form.bio"
          rows="4"
          placeholder="人物背景、性格特点..."
          class="w-full px-3 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)] resize-none placeholder:text-[var(--color-text-disabled)]"
        />
      </div>

      <!-- 自定义字段 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-[var(--color-text-body)]">自定义字段</label>
          <button type="button" class="text-xs text-[var(--color-primary)] hover:underline" @click="addCustomField">+ 添加字段</button>
        </div>
        <div v-for="(field, i) in form.customFields" :key="i" class="flex gap-2 items-center">
          <input
            v-model="field.key"
            placeholder="字段名"
            class="w-24 px-2 py-1.5 text-xs rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
          />
          <input
            v-model="field.value"
            placeholder="字段值"
            class="flex-1 px-2 py-1.5 text-xs rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
          />
          <button type="button" class="text-[var(--color-danger)] hover:opacity-70 text-sm" @click="removeCustomField(i)">×</button>
        </div>
      </div>
    </form>

    <template #footer>
      <Button variant="ghost" @click="$emit('update:visible', false)">取消</Button>
      <Button :loading="submitting" @click="handleSubmit">{{ isEdit ? '保存修改' : '添加人物' }}</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import Modal from '@/components/base/Modal.vue'
import Input from '@/components/base/Input.vue'
import Button from '@/components/base/Button.vue'
import { useCharacterStore } from '@/stores/character'
import { useToast } from '@/composables/useToast'
import { ApiClientError } from '@/api/client'
import type { Character } from '@/types'

const props = defineProps<{
  visible:    boolean
  cpId:       string
  character?: Character | null
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  saved:            []
}>()

const charStore  = useCharacterStore()
const toast      = useToast()
const submitting = ref(false)
const aliasInput = ref('')
const isEdit     = computed(() => !!props.character)
const errors     = reactive({ name: '' })

interface CustomField { key: string; value: string }

const form = reactive({
  name:         '',
  roleLabel:    '',
  birthday:     '',
  avatarUrl:    '',
  aliases:      [] as string[],
  bio:          '',
  customFields: [] as CustomField[],
})

watch(() => props.character, (char) => {
  if (char) {
    form.name         = char.name
    form.roleLabel    = char.roleLabel ?? ''
    form.birthday     = char.birthday ?? ''
    form.avatarUrl    = char.avatarUrl ?? ''
    form.aliases      = [...(char.aliases ?? [])]
    form.bio          = char.bio ?? ''
    form.customFields = [...((char.customFields as CustomField[]) ?? [])]
  } else {
    Object.assign(form, { name: '', roleLabel: '', birthday: '', avatarUrl: '', aliases: [], bio: '', customFields: [] })
  }
}, { immediate: true })

function addAlias() {
  const v = aliasInput.value.trim()
  if (v && !form.aliases.includes(v)) form.aliases.push(v)
  aliasInput.value = ''
}

function removeAlias(i: number) { form.aliases.splice(i, 1) }

function addCustomField() { form.customFields.push({ key: '', value: '' }) }
function removeCustomField(i: number) { form.customFields.splice(i, 1) }

async function handleSubmit() {
  errors.name = form.name.trim() ? '' : '请填写姓名'
  if (errors.name) return

  submitting.value = true
  try {
    const payload = {
      name:         form.name.trim(),
      roleLabel:    form.roleLabel || undefined,
      birthday:     form.birthday || undefined,
      avatarUrl:    form.avatarUrl || undefined,
      aliases:      form.aliases,
      bio:          form.bio || undefined,
      customFields: form.customFields.filter(f => f.key.trim()),
    }

    if (isEdit.value && props.character) {
      await charStore.updateCharacter(props.cpId, props.character.id, payload)
      toast.success('已更新 ✓')
    } else {
      await charStore.createCharacter(props.cpId, payload)
      toast.success('人物已添加 ✓')
    }

    emit('update:visible', false)
    emit('saved')
  } catch (err) {
    toast.error(err instanceof ApiClientError ? err.message : '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>
