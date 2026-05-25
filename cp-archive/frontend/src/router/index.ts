import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 懒加载所有页面组件
const HomeView      = () => import('@/views/HomeView.vue')
const LoginView     = () => import('@/views/auth/LoginView.vue')
const RegisterView  = () => import('@/views/auth/RegisterView.vue')
const CpDetailView  = () => import('@/views/cp/CpDetailView.vue')
const ProfileTab    = () => import('@/views/cp/ProfileTab.vue')
const TimelineTab   = () => import('@/views/cp/TimelineTab.vue')
const MilestoneTab  = () => import('@/views/cp/MilestoneTab.vue')
const CustomTab     = () => import('@/views/cp/CustomTab.vue')
const SettingsView         = () => import('@/views/settings/SettingsView.vue')
const ThemeSettings        = () => import('@/views/settings/ThemeSettings.vue')
const ProfileSettings      = () => import('@/views/settings/ProfileSettings.vue')
const MembersSettings      = () => import('@/views/settings/MembersSettings.vue')
const DataSettings         = () => import('@/views/settings/DataSettings.vue')
const NotificationSettings = () => import('@/views/settings/NotificationSettings.vue')
const LogsView             = () => import('@/views/settings/LogsView.vue')
const NotificationView     = () => import('@/views/NotificationView.vue')
const SearchView           = () => import('@/views/SearchView.vue')

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
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { requiresAuth: false },
    },
    // ── 全局搜索 ───────────────────────────────────────────────
    {
      path: '/search',
      name: 'search',
      component: SearchView,
      meta: { requiresAuth: true },
    },
    // ── 通知中心 ───────────────────────────────────────────────
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationView,
      meta: { requiresAuth: true },
    },
    // ── CP 详情页（嵌套路由） ──────────────────────────────────
    {
      path: '/cp/:id',
      component: CpDetailView,
      meta: { requiresAuth: true },
      redirect: to => `/cp/${to.params.id}/timeline`,
      children: [
        { path: 'profile',       name: 'cp-profile',    component: ProfileTab },
        { path: 'timeline',      name: 'cp-timeline',   component: TimelineTab },
        { path: 'milestones',    name: 'cp-milestones', component: MilestoneTab },
        { path: 'custom/:tabId', name: 'cp-custom-tab', component: CustomTab },
      ],
    },
    // ── 设置页 ─────────────────────────────────────────────────
    {
      path: '/settings',
      component: SettingsView,
      meta: { requiresAuth: true },
      redirect: '/settings/theme',
      children: [
        { path: 'theme',         name: 'settings-theme',         component: ThemeSettings },
        { path: 'profile',       name: 'settings-profile',       component: ProfileSettings },
        { path: 'members',       name: 'settings-members',       component: MembersSettings },
        { path: 'data',          name: 'settings-data',          component: DataSettings },
        { path: 'notifications', name: 'settings-notifications', component: NotificationSettings },
        { path: 'logs',          name: 'settings-logs',          component: LogsView },
      ],
    },
  ],
})

// ── 全局导航守卫 ──────────────────────────────────────────────
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
