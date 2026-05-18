# 🍊 西柚桌宠

一款简洁可爱的桌面宠物应用

## ✨ 特性

- 🎨 **超小窗口**：100x120px，不占用屏幕空间
- 🖱️ **自由拖拽**：可随意移动到屏幕任意位置
- 🎭 **多种状态**：开心、工作、休息等
- 🎨 **纯CSS绘制**：无需图片资源
- 🪟 **透明窗口**：与桌面完美融合

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run electron:dev
```

### 构建应用

```bash
npm run electron:build
```

## 🎮 使用说明

1. **拖拽移动**：按住西柚可以拖动到任意位置
2. **右键菜单**：右键点击打开菜单
3. **切换状态**：通过菜单切换不同表情状态
4. **退出应用**：右键菜单 → 退出

## 📐 窗口尺寸

- 宽度：100px
- 高度：120px
- 默认位置：屏幕右下角

## 🎨 当前状态

- 😊 开心（bounce动画）
- 💼 工作（摇摆动画）
- 😴 休息（慢呼吸动画）
- 🌸 待机（正常呼吸动画）

## 📦 项目结构

```
grapefruit-pet/
├── electron/          # Electron主进程
│   ├── main.ts        # 主进程入口
│   └── preload.ts     # 预加载脚本
├── src/               # React应用
│   ├── components/    # 组件
│   │   ├── Character.tsx      # 西柚角色
│   │   └── ContextMenu.tsx    # 右键菜单
│   ├── hooks/         # 自定义Hooks
│   │   └── useDrag.ts # 拖拽Hook
│   ├── store/         # 状态管理
│   │   └── index.ts   # Zustand store
│   ├── styles/        # 样式
│   │   └── global.css
│   ├── App.tsx        # 根组件
│   └── main.tsx       # 入口文件
├── package.json
└── vite.config.ts
```

## 🛠️ 技术栈

- **框架**：Electron + React + TypeScript
- **构建工具**：Vite
- **状态管理**：Zustand
- **样式**：纯CSS（无UI库）

## 📝 开发笔记

- 窗口配置在 `electron/main.ts` 中
- 角色样式在 `src/components/Character.css` 中
- 全局样式在 `src/styles/global.css` 中

## 🎯 下一步计划

- [ ] 添加番茄钟功能
- [ ] 添加喝水提醒
- [ ] 添加系统托盘图标
- [ ] 添加灵感记录功能
- [ ] 添加活动统计功能

## 📄 许可证

MIT License

## 👤 作者

xuxinyi06
