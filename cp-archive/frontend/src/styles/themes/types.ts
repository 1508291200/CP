/**
 * 主题配置类型
 * 每个主题定义 CSS 变量 token，通过 applyTheme 写入 :root
 */
export interface ThemeConfig {
  id:          string
  name:        string
  description?: string
  isDark?:     boolean
  tokens: {
    // 主色
    '--color-primary':       string
    '--color-primary-light': string
    '--color-primary-bg':    string
    // 背景
    '--color-bg-page':       string
    '--color-bg-card':       string
    '--color-bg-sidebar':    string
    // 文字
    '--color-text-title':    string
    '--color-text-body':     string
    '--color-text-secondary':string
    '--color-text-disabled': string
    // 边框
    '--color-border':        string
    '--color-border-input':  string
    // 重要性
    '--color-critical':      string
    '--color-high':          string
    '--color-medium':        string
    '--color-normal':        string
    '--color-low':           string
    // 功能色
    '--color-success':       string
    '--color-warning':       string
    '--color-danger':        string
    // 可选扩展 token
    [key: string]: string
  }
  /** 字体（可选） */
  fonts?: {
    '--font-title'?: string
    '--font-body'?:  string
    '--font-size-base'?: string
  }
  /** 圆角/动画（可选） */
  layout?: {
    '--radius-card'?:  string
    '--radius-btn'?:   string
    '--radius-tag'?:   string
    '--radius-input'?: string
    '--duration-fast'?:   string
    '--duration-normal'?: string
  }
}
