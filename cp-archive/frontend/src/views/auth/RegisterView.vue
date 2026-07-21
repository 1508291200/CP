<template>
  <div class="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-[var(--color-text-title)] mb-1">关系图书馆</h1>
        <p class="text-[var(--color-text-secondary)] text-sm">注册新账号</p>
      </div>

      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-modal)] p-8 shadow-[var(--shadow-card)]">
        <form @submit.prevent="handleRegister" class="flex flex-col gap-5">
          <!-- 用户名 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-[var(--color-text-body)]">用户名</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="2-50 个字母、数字或下划线"
              autocomplete="username"
              class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)]"
              :class="{ 'border-[var(--color-danger)]': errors.username }"
            />
            <span v-if="errors.username" class="text-xs text-[var(--color-danger)]">{{ errors.username }}</span>
          </div>

          <!-- 邮箱 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-[var(--color-text-body)]">邮箱</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="your@email.com"
              autocomplete="email"
              class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)]"
              :class="{ 'border-[var(--color-danger)]': errors.email }"
            />
            <span v-if="errors.email" class="text-xs text-[var(--color-danger)]">{{ errors.email }}</span>
          </div>

          <!-- 密码 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-[var(--color-text-body)]">密码</label>
            <input
              v-model="form.password"
              type="password"
              placeholder="至少 8 个字符"
              autocomplete="new-password"
              class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)]"
              :class="{ 'border-[var(--color-danger)]': errors.password }"
            />
            <span v-if="errors.password" class="text-xs text-[var(--color-danger)]">{{ errors.password }}</span>
          </div>

          <!-- 邀请码 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-[var(--color-text-body)]">邀请码</label>
            <input
              v-model="form.inviteCode"
              type="text"
              placeholder="请输入邀请码"
              class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)] font-mono text-xs"
              :class="{ 'border-[var(--color-danger)]': errors.inviteCode }"
            />
            <span v-if="errors.inviteCode" class="text-xs text-[var(--color-danger)]">{{ errors.inviteCode }}</span>
          </div>

          <!-- 全局错误 -->
          <div
            v-if="globalError"
            class="text-sm text-[var(--color-danger)] text-center bg-red-50 rounded-lg py-2"
          >
            {{ globalError }}
          </div>

          <!-- 成功提示 -->
          <div
            v-if="success"
            class="text-sm text-green-700 text-center bg-green-50 rounded-lg py-2"
          >
            注册成功！正在跳转登录页...
          </div>

          <button
            type="submit"
            :disabled="loading || success"
            class="w-full py-2.5 rounded-[var(--radius-btn)] bg-[var(--color-primary)] text-white font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {{ loading ? '注册中...' : '注册' }}
          </button>

          <p class="text-center text-sm text-[var(--color-text-secondary)]">
            已有账号？
            <router-link to="/login" class="text-[var(--color-primary)] hover:underline">登录</router-link>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { register } from '@/api/auth'
import { ApiClientError } from '@/api/client'

const router = useRouter()
const route  = useRoute()

const form = reactive({ username: '', email: '', password: '', inviteCode: '' })
const errors = reactive({ username: '', email: '', password: '', inviteCode: '' })
const globalError = ref('')
const loading = ref(false)
const success = ref(false)

// URL 参数自动填入邀请码
onMounted(() => {
  const code = route.query.code as string
  if (code) form.inviteCode = code
})

function validate() {
  errors.username   = /^[a-zA-Z0-9_]{2,50}$/.test(form.username) ? '' : '用户名需为 2-50 个字母、数字或下划线'
  errors.email      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '' : '请输入有效邮箱'
  errors.password   = form.password.length >= 8 ? '' : '密码至少 8 个字符'
  errors.inviteCode = form.inviteCode.trim() ? '' : '请输入邀请码'
  return !errors.username && !errors.email && !errors.password && !errors.inviteCode
}

async function handleRegister() {
  globalError.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await register({
      username:   form.username.trim(),
      email:      form.email.trim(),
      password:   form.password,
      inviteCode: form.inviteCode.trim(),
    })
    success.value = true
    setTimeout(() => router.push('/login'), 1500)
  } catch (err) {
    if (err instanceof ApiClientError) {
      if (err.code === 'VALIDATION_ERROR') globalError.value = '邀请码无效或已使用'
      else if (err.code === 'CONFLICT') globalError.value = '用户名或邮箱已被使用'
      else globalError.value = err.message
    } else {
      globalError.value = '注册失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}
</script>
