import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/globals.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化深色模式（在挂载前执行，避免闪烁）
import { useUIStore } from './stores/ui'
const uiStore = useUIStore()
uiStore.initDark()

app.mount('#app')
