/** @type {import('tailwindcss').Config} */
export default {
  // 仅扫描 src 目录，避免误扫描 node_modules
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  // 深色模式通过 class 控制（配合主题系统）
  darkMode: 'class',
  theme: {
    extend: {
      // 颜色系统全部引用 CSS 变量，支持运行时主题切换
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          bg: 'var(--color-primary-bg)',
        },
        bg: {
          page: 'var(--color-bg-page)',
          card: 'var(--color-bg-card)',
          sidebar: 'var(--color-bg-sidebar)',
        },
        text: {
          title: 'var(--color-text-title)',
          body: 'var(--color-text-body)',
          secondary: 'var(--color-text-secondary)',
          disabled: 'var(--color-text-disabled)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          input: 'var(--color-border-input)',
        },
        importance: {
          critical: 'var(--color-critical)',
          high: 'var(--color-high)',
          medium: 'var(--color-medium)',
          normal: 'var(--color-normal)',
          low: 'var(--color-low)',
        },
      },
      borderRadius: {
        card: 'var(--radius-card)',
        btn: 'var(--radius-btn)',
        tag: 'var(--radius-tag)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        title: ['var(--font-title)', 'system-ui', 'sans-serif'],
      },
      transitionDuration: {
        DEFAULT: 'var(--duration-normal)',
      },
    },
  },
  plugins: [],
}
