import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getMe, updateMe, listUsers, updateUserRole, deactivateUser,
  generateInvite, listInvitations, revokeInvitation,
  type UserPublic, type Invitation,
} from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const me          = ref<UserPublic | null>(null)
  const users       = ref<UserPublic[]>([])
  const invitations = ref<Invitation[]>([])
  const loading     = ref(false)

  async function fetchMe() {
    const res = await getMe()
    me.value = res.data
    return res.data
  }

  async function updateMeData(data: { displayName?: string; avatarUrl?: string }) {
    const res = await updateMe(data)
    me.value = res.data
    return res.data
  }

  async function fetchUsers() {
    loading.value = true
    try {
      const res = await listUsers({ limit: 100 })
      users.value = res.data.items
    } finally {
      loading.value = false
    }
  }

  async function changeRole(userId: string, role: string) {
    const res = await updateUserRole(userId, role)
    const idx = users.value.findIndex(u => u.id === userId)
    if (idx !== -1) users.value[idx] = res.data
  }

  async function deactivateUserById(userId: string) {
    await deactivateUser(userId)
    const idx = users.value.findIndex(u => u.id === userId)
    if (idx !== -1) users.value[idx] = { ...users.value[idx], isActive: false }
  }

  async function generateInviteCode(role: string, expiresIn: string) {
    const res = await generateInvite({ role, expiresIn })
    return res.data
  }

  async function fetchInvitations() {
    const res = await listInvitations()
    invitations.value = res.data
  }

  async function revokeInv(code: string) {
    await revokeInvitation(code)
    invitations.value = invitations.value.filter(i => i.code !== code)
  }

  return {
    me, users, invitations, loading,
    fetchMe,
    updateMe: updateMeData,
    fetchUsers,
    changeRole,
    deactivateUser: deactivateUserById,
    generateInvite: generateInviteCode,
    fetchInvitations,
    revokeInvitation: revokeInv,
  }
})
