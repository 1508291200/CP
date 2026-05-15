import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 懒加载所有页面组件
const HomeView      = () => import('@/views/HomeView.vue')
const LoginView     = () => import('@/views/auth/LoginView.vue')
const CpDetailView  = () => import('@/views/cp/CpDetailView.vue')
const ProfileTab    = () => import('@/views/cp/ProfileTab.vue')
const TimelineTab   = () => import('@/views/cp/TimelineTab.vue')
const MilestoneTab  = () => import('@/views/cp/MilestoneTab.vue')
const SettingsView  = () => import('@/views/settings/SettingsView.vue')
const ThemeSettings = () => import('@/views/settings/ThemeSettings.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false },
    },
    // ── CP 详情页（嵌套路由） ─────────────────────────────
    {
      path: '/cp/:id',
      component: CpDetailView,
      meta: { requiresAuth: true },
      redirect: to => `/cp/${to.params.id}/timeline`,
      children: [
        {
          path: 'profile',
          name: 'cp-profile',
          component: ProfileTab,
        },
        {
          path: 'timeline',
          name: 'cp-timeline',
          component: TimelineTab,
        },
        {
          path: 'milestones',
          name: 'cp-milestones',
          component: MilestoneTab,
        },
      ],
    },
    // ── 设置页 ────────────────────────────────────────────────
    {
      path: '/settings',
      component: SettingsView,
      meta: { requiresAuth: true },
      redirect: '/settings/theme',
      children: [
        { path: 'theme',   name: 'settings-theme',   component: ThemeSettings },
        { path: 'profile', name: 'settings-profile',  component: () => Promise.resolve({ template: '<div class="p-6 text-[var(--color-text-secondary)]">个人资料设置（Phase 8 实现）</div>' }) },
        { path: 'members', name: 'settings-members',  component: () => Promise.resolve({ template: '<div class="p-6 text-[var(--color-text-secondary)]">成员管理（Phase 8 实现）</div>' }) },
        { path: 'data',    name: 'settings-data',     component: () => Promise.resolve({ template: '<div class="p-6 text-[var(--color-text-secondary)]">数据管理（Phase 9 实现）</div>' }) },
      ],
    },
  ],
})

// ── 全局导航守卫 ─────────────────────────────────────────
router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && authStore.isLoggedIn) {
    return { name: 'home' }
  }
})

export default router
