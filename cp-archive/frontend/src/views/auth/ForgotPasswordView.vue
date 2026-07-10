<template>
  <div class="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-[var(--color-text-title)] mb-1">CP 档案站</h1>
        <p class="text-[var(--color-text-secondary)] text-sm">重置密码</p>
      </div>
      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-modal)] p-8 shadow-[var(--shadow-card)]">
        <div v-if="step === 1">
          <h2 class="text-base font-semibold text-[var(--color-text-body)] mb-1">找回密码</h2>
          <p class="text-sm text-[var(--color-text-secondary)] mb-5">请输入注册时使用的邮箱，我们将发送6位验证码。</p>
          <form @submit.prevent="handleSendCode" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-[var(--color-text-body)]">邮箱</label>
              <input v-model="email" type="email" placeholder="请输入注册邮箱" autocomplete="email" class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)]" :class="{ 'border-[var(--color-danger)]': emailError }" />
              <span v-if="emailError" class="text-xs text-[var(--color-danger)]">{{ emailError }}</span>
            </div>
            <div v-if="globalError" class="text-sm text-[var(--color-danger)] text-center bg-red-50 rounded-lg py-2 px-3">{{ globalError }}</div>
            <button type="submit" :disabled="loading" class="w-full py-2.5 rounded-[var(--radius-btn)] bg-[var(--color-primary)] text-white font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {{ loading ? '发送中...' : '发送验证码' }}
            </button>
          </form>
        </div>
        <div v-else-if="step === 2">
          <h2 class="text-base font-semibold text-[var(--color-text-body)] mb-1">输入验证码</h2>
          <p class="text-sm text-[var(--color-text-secondary)] mb-5">验证码已发送至 <span class="font-medium">{{ maskedEmail }}</span>，请在10分钟内输入。</p>
          <form @submit.prevent="handleVerifyCode" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-[var(--color-text-body)]">验证码</label>
              <input v-model="code" type="text" inputmode="numeric" maxlength="6" placeholder="请输入6位验证码" autocomplete="one-time-code" class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)] tracking-widest text-center text-lg" :class="{ 'border-[var(--color-danger)]': codeError }" />
              <span v-if="codeError" class="text-xs text-[var(--color-danger)]">{{ codeError }}</span>
            </div>
            <div v-if="globalError" class="text-sm text-[var(--color-danger)] text-center bg-red-50 rounded-lg py-2 px-3">{{ globalError }}</div>
            <button type="submit" :disabled="loading || code.length !== 6" class="w-full py-2.5 rounded-[var(--radius-btn)] bg-[var(--color-primary)] text-white font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {{ loading ? '验证中...' : '下一步' }}
            </button>
            <div class="text-center text-sm">
              <span v-if="countdown > 0" class="text-[var(--color-text-disabled)]">{{ countdown }} 秒后可重新发送</span>
              <button v-else type="button" :disabled="resending" class="text-[var(--color-primary)] hover:underline disabled:opacity-60" @click="handleResend">{{ resending ? '发送中...' : '重新发送验证码' }}</button>
            </div>
          </form>
        </div>
        <div v-else-if="step === 3">
          <h2 class="text-base font-semibold text-[var(--color-text-body)] mb-1">设置新密码</h2>
          <p class="text-sm text-[var(--color-text-secondary)] mb-5">请设置你的新密码，密码长度至少8位。</p>
          <form @submit.prevent="handleResetPassword" class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-[var(--color-text-body)]">新密码</label>
              <input v-model="newPassword" type="password" placeholder="请输入新密码（至少8位）" autocomplete="new-password" class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)]" :class="{ 'border-[var(--color-danger)]': newPasswordError }" />
              <span v-if="newPasswordError" class="text-xs text-[var(--color-danger)]">{{ newPasswordError }}</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-[var(--color-text-body)]">确认密码</label>
              <input v-model="confirmPassword" type="password" placeholder="请再次输入新密码" autocomplete="new-password" class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-disabled)]" :class="{ 'border-[var(--color-danger)]': confirmPasswordError }" />
              <span v-if="confirmPasswordError" class="text-xs text-[var(--color-danger)]">{{ confirmPasswordError }}</span>
            </div>
            <div v-if="globalError" class="text-sm text-[var(--color-danger)] text-center bg-red-50 rounded-lg py-2 px-3">{{ globalError }}</div>
            <button type="submit" :disabled="loading" class="w-full py-2.5 rounded-[var(--radius-btn)] bg-[var(--color-primary)] text-white font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {{ loading ? '提交中...' : '确认修改密码' }}
            </button>
          </form>
        </div>
        <div v-else-if="step === 4" class="text-center py-4">
          <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 class="text-base font-semibold text-[var(--color-text-body)] mb-2">密码修改成功</h2>
          <p class="text-sm text-[var(--color-text-secondary)] mb-4">密码已重置，{{ redirectCountdown }} 秒后自动跳转到登录页。</p>
          <router-link to="/login" class="text-sm text-[var(--color-primary)] hover:underline">立即登录</router-link>
        </div>
        <div v-if="step < 4" class="mt-5 pt-4 border-t border-[var(--color-border)] text-center">
          <router-link to="/login" class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">返回登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { ApiClientError } from '@/api/client'

const router = useRouter()
const step = ref<1 | 2 | 3 | 4>(1)
const loading = ref(false)
const globalError = ref('')
const email = ref('')
const emailError = ref('')
const code = ref('')
const codeError = ref('')
const countdown = ref(0)
const resending = ref(false)
const resetToken = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const newPasswordError = ref('')
const confirmPasswordError = ref('')
const redirectCountdown = ref(3)
let countdownTimer: ReturnType<typeof setInterval> | null = null
let redirectTimer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (redirectTimer) clearInterval(redirectTimer)
})

const maskedEmail = computed(() => {
  const parts = email.value.split('@')
  if (parts.length !== 2) return email.value
  const name = parts[0]; const domain = parts[1]
  if (name.length <= 2) return `*@${domain}`
  return `${name.slice(0, 2)}${'*'.repeat(name.length - 2)}@${domain}`
})

function startCountdown() {
  countdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
  }, 1000)
}

async function handleSendCode() {
  globalError.value = ''; emailError.value = ''
  if (!email.value.trim()) { emailError.value = '请输入邮箱'; return }
  if (!/^$/.test(email.value.trim())) { emailError.value = '邮箱格式不正确'; return }
  loading.value = true
  try { await authApi.forgotPassword(email.value.trim()); step.value = 2; startCountdown() }
  catch (err) { globalError.value = err instanceof ApiClientError ? err.message : '发送失败，请稍后重试' }
  finally { loading.value = false }
}

async function handleResend() {
  globalError.value = ''; resending.value = true
  try { await authApi.forgotPassword(email.value.trim()); code.value = ''; codeError.value = ''; startCountdown() }
  catch (err) { globalError.value = err instanceof ApiClientError ? err.message : '发送失败，请稍后重试' }
  finally { resending.value = false }
}

async function handleVerifyCode() {
  globalError.value = ''; codeError.value = ''
  if (code.value.length !== 6) { codeError.value = '请输入6位验证码'; return }
  if (!/^d{6}$/.test(code.value)) { codeError.value = '验证码应为6位数字'; return }
  loading.value = true
  try {
    const result = await authApi.verifyResetCode(email.value.trim(), code.value)
    resetToken.value = result.data.resetToken; step.value = 3
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
  }
  catch (err) { globalError.value = err instanceof ApiClientError ? err.message : '验证失败，请稍后重试' }
  finally { loading.value = false }
}

async function handleResetPassword() {
  globalError.value = ''; newPasswordError.value = ''; confirmPasswordError.value = ''
  if (newPassword.value.length < 8) { newPasswordError.value = '密码至少8位'; return }
  if (newPassword.value !== confirmPassword.value) { confirmPasswordError.value = '两次密码不一致'; return }
  loading.value = true
  try {
    await authApi.resetPassword(resetToken.value, newPassword.value)
    step.value = 4; redirectCountdown.value = 3
    redirectTimer = setInterval(() => {
      redirectCountdown.value--
      if (redirectCountdown.value <= 0) { if (redirectTimer) clearInterval(redirectTimer); router.push('/login') }
    }, 1000)
  }
  catch (err) { globalError.value = err instanceof ApiClientError ? err.message : '重置失败，请稍后重试' }
  finally { loading.value = false }
}
</script>
