<template>
  <div class="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo / 标题 -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-[var(--color-text-title)] mb-1">CP 档案站</h1>
        <p class="text-[var(--color-text-secondary)] text-sm">记录每一份心动的轨迹</p>
      </div>

      <!-- 登录卡片 -->
      <div
        class="bg-[var(--color-bg-card)] rounded-[var(--radius-modal)] p-8 shadow-[var(--shadow-card)]"
      >
        <form @submit.prevent="handleLogin" class="flex flex-col gap-5">
          <!-- 用户名 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-[var(--color-text-body)]">用户名</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="请输入用户名"
              autocomplete="username"
              class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)]"
              :class="{ 'border-[var(--color-danger)]': errors.username }"
            />
            <span v-if="errors.username" class="text-xs text-[var(--color-danger)]">
              {{ errors.username }}
            </span>
          </div>

          <!-- 密码 -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-[var(--color-text-body)]">密码</label>
            <input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)]"
              :class="{ 'border-[var(--color-danger)]': errors.password }"
            />
            <span v-if="errors.password" class="text-xs text-[var(--color-danger)]">
              {{ errors.password }}
            </span>
          </div>

          <!-- 全局错误 -->
          <div
            v-if="globalError"
            class="text-sm text-[var(--color-danger)] text-center bg-red-50 dark:bg-red-900/20 rounded-lg py-2"
          >
            {{ globalError }}
          </div>

          <!-- 提交按钮 -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 rounded-[var(--radius-btn)] bg-[var(--color-primary)] text-white font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {{ loading ? '登录中...' : '登录' }}
          </button>

          <p class="text-center text-sm text-[var(--color-text-secondary)]">
            没有账号？
            <router-link to="/register" class="text-[var(--color-primary)] hover:underline">注册账号</router-link>
          </p>
          <p class="text-center text-sm">
            <router-link to="/forgot-password" class="text-[var(--color-text-disabled)] hover:text-[var(--color-primary)] transition-colors">忘记密码？</router-link>
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiClientError } from '@/api/client'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({ username: '', password: '' })
const errors = reactive({ username: '', password: '' })
const globalError = ref('')
const loading = ref(false)

function validate() {
  errors.username = form.username.trim() ? '' : '请输入用户名'
  errors.password = form.password ? '' : '请输入密码'
  return !errors.username && !errors.password
}

async function handleLogin() {
  globalError.value = ''
  if (!validate()) return

  loading.value = true
  try {
    await authStore.login(form.username.trim(), form.password)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err) {
    if (err instanceof ApiClientError) {
      globalError.value =
        err.code === 'UNAUTHORIZED' ? '用户名或密码错误' : err.message
    } else {
      globalError.value = '登录失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}
</script>
