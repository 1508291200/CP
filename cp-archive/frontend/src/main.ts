import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/globals.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 先初始化主题（从 localStorage 恢复用户选择的主题，会写入 CSS 变量）
import { useThemeStore } from './stores/theme'
const themeStore = useThemeStore()
themeStore.init()

// 后初始化深色模式（在 themeStore.init() 之后执行，确保深色 token 能覆盖主题默认值）
import { useUIStore } from './stores/ui'
const uiStore = useUIStore()
uiStore.initDark()

app.mount('#app')
