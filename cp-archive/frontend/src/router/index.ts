import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 懒加载所有页面组件
const HomeView = () => import('@/views/HomeView.vue')
const LoginView = () => import('@/views/auth/LoginView.vue')

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
    // Phase 3+ 的路由将在对应阶段添加
    // /cp/:id/profile
    // /cp/:id/timeline
    // /cp/:id/milestones
    // /settings
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
