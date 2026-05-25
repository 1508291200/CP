import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => ({
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
  // esbuild 全局选项：生产构建移除 console.* 和 debugger
  esbuild: mode === 'production'
    ? { drop: ['console', 'debugger'] }
    : {},
  build: {
    outDir: 'dist',
    // 生产构建不生成 source map，防止源码泄露
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // 按模块分包，优化加载性能
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          axios: ['axios'],
        },
        // 混淆产物文件名，防止通过路径推断功能模块
        chunkFileNames:  'assets/[hash].js',
        entryFileNames:  'assets/[hash].js',
        assetFileNames:  'assets/[hash].[ext]',
      },
    },
  },
}))
