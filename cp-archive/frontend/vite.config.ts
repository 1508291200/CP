import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 开发环境代理：将 /api 转发到后端
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 确保单页应用路由正确（Zeabur 静态托管需要）
    rollupOptions: {
      output: {
        manualChunks: {
          vue:   ['vue', 'vue-router', 'pinia'],
          axios: ['axios'],
        },
      },
    },
  },
})
