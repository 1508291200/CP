<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-[var(--color-text-title)]">成员管理</h2>
      <Button size="sm" @click="showInviteModal = true">+ 生成邀请码</Button>
    </div>

    <!-- 成员列表 -->
    <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden mb-8">
      <div v-if="loading" class="p-6 text-center text-[var(--color-text-secondary)] text-sm">加载中...</div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-[var(--color-border)] bg-[var(--color-bg-page)]">
            <th class="px-4 py-3 text-left text-xs text-[var(--color-text-secondary)] font-medium">成员</th>
            <th class="px-4 py-3 text-left text-xs text-[var(--color-text-secondary)] font-medium">角色</th>
            <th class="px-4 py-3 text-left text-xs text-[var(--color-text-secondary)] font-medium">状态</th>
            <th class="px-4 py-3 text-left text-xs text-[var(--color-text-secondary)] font-medium">加入时间</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
            class="border-b border-[var(--color-border)] last:border-0"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-[var(--color-primary-bg)] flex items-center justify-center text-xs font-medium text-[var(--color-primary)] flex-shrink-0">
                  {{ (user.displayName || user.username)[0].toUpperCase() }}
                </div>
                <div>
                  <div class="font-medium text-[var(--color-text-body)]">{{ user.displayName || user.username }}</div>
                  <div class="text-xs text-[var(--color-text-disabled)]">@{{ user.username }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3">
              <select
                v-if="canChangeRole(user)"
                :value="user.role"
                class="text-xs border border-[var(--color-border)] rounded px-2 py-1 bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
                @change="onRoleChange(user.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="r in editableRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
              <span v-else class="text-xs px-2 py-1 rounded bg-[var(--color-bg-page)] text-[var(--color-text-secondary)] capitalize">
                {{ roleLabel(user.role) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span
                class="text-xs px-2 py-0.5 rounded-[var(--radius-tag)]"
                :class="user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
              >{{ user.isActive ? '活跃' : '已停用' }}</span>
            </td>
            <td class="px-4 py-3 text-xs text-[var(--color-text-disabled)]">
              {{ formatDate(user.createdAt) }}
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="canDeactivate(user)"
                class="text-xs text-[var(--color-text-disabled)] hover:text-[var(--color-danger)] transition-colors"
                @click="onDeactivate(user)"
              >停用</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 邀请码列表 -->
    <div class="mb-4">
      <h3 class="text-sm font-semibold text-[var(--color-text-body)] mb-3">待使用的邀请码</h3>
      <div v-if="!invitations.length" class="text-sm text-[var(--color-text-secondary)] py-4 text-center">暂无有效邀请码</div>
      <div v-else class="space-y-2">
        <div
          v-for="inv in invitations"
          :key="inv.id"
          class="flex items-center justify-between bg-[var(--color-bg-card)] rounded-[var(--radius-card)] px-4 py-3 shadow-[var(--shadow-card)]"
        >
          <div>
            <code class="text-xs font-mono text-[var(--color-text-body)] break-all">{{ inv.code }}</code>
            <div class="text-xs text-[var(--color-text-disabled)] mt-0.5">
              角色：{{ roleLabel(inv.role) }}
              <span v-if="inv.expiresAt"> · 过期：{{ formatDate(inv.expiresAt) }}</span>
            </div>
          </div>
          <button
            class="text-xs text-[var(--color-danger)] hover:underline ml-4"
            @click="onRevoke(inv.code)"
          >撤销</button>
        </div>
      </div>
    </div>

    <!-- 生成邀请码弹窗 -->
    <Modal v-if="showInviteModal" :visible="showInviteModal" title="生成邀请码" @update:visible="showInviteModal = false">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[var(--color-text-body)]">角色</label>
          <select
            v-model="inviteForm.role"
            class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
          >
            <option v-for="r in editableRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[var(--color-text-body)]">有效期</label>
          <select
            v-model="inviteForm.expiresIn"
            class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
          >
            <option value="24h">24 小时</option>
            <option value="7d">7 天</option>
            <option value="never">永不过期</option>
          </select>
        </div>
        <div v-if="generatedCode" class="bg-[var(--color-bg-page)] rounded-[var(--radius-card)] p-3">
          <div class="text-xs text-[var(--color-text-secondary)] mb-1">注册链接</div>
          <div class="flex items-center gap-2">
            <code class="text-xs font-mono text-[var(--color-text-body)] break-all flex-1">{{ registerLink }}</code>
            <button class="text-xs text-[var(--color-primary)] hover:underline flex-shrink-0" @click="copyLink">复制</button>
          </div>
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="showInviteModal = false">关闭</Button>
        <Button :loading="generating" @click="handleGenerate">生成</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import Button from '@/components/base/Button.vue'
import Modal from '@/components/base/Modal.vue'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'

const userStore = useUserStore()
const toast     = useToast()

const showInviteModal = ref(false)
const generating = ref(false)
const generatedCode = ref('')
const inviteForm = reactive({ role: 'editor', expiresIn: '7d' })

const users      = computed(() => userStore.users)
const invitations = computed(() => userStore.invitations)
const loading    = computed(() => userStore.loading)
const me         = computed(() => userStore.me)

const editableRoles = [
  { value: 'admin',       label: '管理员' },
  { value: 'editor',      label: '编辑者' },
  { value: 'contributor', label: '贡献者' },
  { value: 'viewer',      label: '访客' },
]

const ROLE_WEIGHT: Record<string, number> = {
  owner: 100, admin: 80, editor: 60, contributor: 40, viewer: 20,
}

function roleLabel(role: string) {
  return editableRoles.find(r => r.value === role)?.label ?? role
}

function canChangeRole(user: { id: string; role: string }) {
  if (!me.value) return false
  if (user.id === me.value.id) return false
  return (ROLE_WEIGHT[me.value.role] ?? 0) > (ROLE_WEIGHT[user.role] ?? 0)
}

function canDeactivate(user: { id: string; role: string; isActive: boolean }) {
  if (!me.value) return false
  if (!user.isActive) return false
  if (user.id === me.value.id) return false
  return (ROLE_WEIGHT[me.value.role] ?? 0) > (ROLE_WEIGHT[user.role] ?? 0)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function onRoleChange(userId: string, role: string) {
  try {
    await userStore.changeRole(userId, role)
    toast.success('角色已更新')
  } catch {
    toast.error('操作失败')
    await userStore.fetchUsers()
  }
}

async function onDeactivate(user: { id: string; username: string }) {
  if (!confirm(`确认停用成员「${user.username}」？`)) return
  try {
    await userStore.deactivateUser(user.id)
    toast.success('已停用')
  } catch {
    toast.error('操作失败')
  }
}

async function onRevoke(code: string) {
  if (!confirm('确认撤销该邀请码？')) return
  try {
    await userStore.revokeInvitation(code)
    toast.success('已撤销')
  } catch {
    toast.error('操作失败')
  }
}

const registerLink = computed(() => `${window.location.origin}/register?code=${generatedCode.value}`)

async function handleGenerate() {
  generating.value = true
  try {
    const inv = await userStore.generateInvite(inviteForm.role, inviteForm.expiresIn)
    generatedCode.value = inv.code
    await userStore.fetchInvitations()
  } catch {
    toast.error('生成失败')
  } finally {
    generating.value = false
  }
}

async function copyLink() {
  await navigator.clipboard.writeText(registerLink.value)
  toast.success('链接已复制')
}

onMounted(async () => {
  await Promise.all([userStore.fetchMe(), userStore.fetchUsers(), userStore.fetchInvitations()])
})
</script>
