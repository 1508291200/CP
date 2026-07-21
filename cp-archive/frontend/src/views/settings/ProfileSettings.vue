<template>
  <div class="max-w-lg">
    <h2 class="text-lg font-semibold text-[var(--color-text-title)] mb-6">个人资料</h2>

    <form class="flex flex-col gap-5" @submit.prevent="handleSave">
      <!-- 圆形头像上传 -->
      <CoverUpload v-model="form.avatarUrl" label="头像" />

      <!-- 昵称 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">昵称</label>
        <input
          v-model="form.displayName"
          type="text"
          placeholder="留空则显示用户名"
          class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <!-- 只读信息 -->
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[var(--color-text-body)]">用户名</label>
          <div class="px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)] text-[var(--color-text-disabled)] text-sm">
            {{ userStore.me?.username }}
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[var(--color-text-body)]">角色</label>
          <div class="px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-page)] text-[var(--color-text-disabled)] text-sm">
            {{ ROLE_LABEL[userStore.me?.role ?? ''] ?? userStore.me?.role }}
          </div>
        </div>
      </div>

      <!-- 全局提示 -->
      <div v-if="msg" class="text-sm rounded-lg py-2 text-center"
        :class="msgType === 'ok' ? 'text-green-700 bg-green-50' : 'text-[var(--color-danger)] bg-red-50'"
      >{{ msg }}</div>

      <Button type="submit" :loading="saving">保存</Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import Button from '@/components/base/Button.vue'
import CoverUpload from '@/components/base/CoverUpload.vue'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'

const ROLE_LABEL: Record<string, string> = {
  owner:    '站长',
  admin:    '管理员',
  cp_admin: '关系管理',
  editor:   '编辑',
  viewer:   '访客',
}

const userStore = useUserStore()
const authStore = useAuthStore()
const saving  = ref(false)
const msg     = ref('')
const msgType = ref<'ok' | 'err'>('ok')

// 先用 store 缓存初始化，避免闪烁
const form = reactive({
  displayName: userStore.me?.displayName ?? '',
  avatarUrl:   userStore.me?.avatarUrl   ?? '',
})

onMounted(async () => {
  // 总是从服务器刷新最新数据
  await userStore.fetchMe()
  form.displayName = userStore.me?.displayName ?? ''
  form.avatarUrl   = userStore.me?.avatarUrl   ?? ''
})

async function handleSave() {
  saving.value = true
  msg.value = ''
  try {
    const updated = await userStore.updateMe({
      displayName: form.displayName,
      avatarUrl: form.avatarUrl || undefined,
    })
    // 同步最新头像和昵称到 auth store（主页导航栏用）
    if (authStore.user) {
      authStore.setUser({
        ...authStore.user,
        displayName: updated.displayName ?? null,
        avatarUrl:   updated.avatarUrl   ?? null,
      })
    }
    msg.value = '保存成功'
    msgType.value = 'ok'
  } catch {
    msg.value = '保存失败，请稍后重试'
    msgType.value = 'err'
  } finally {
    saving.value = false
  }
}
</script>
