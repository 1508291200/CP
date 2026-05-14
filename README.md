# CP 档案站

> 一款面向 CP 爱好者的关系档案管理工具，支持对每对 CP 进行人物建档、时间轴梳理与大事记记录。

## 文档导航

| 文档 | 说明 |
|------|------|
| [CPDesign.md](./CPDesign.md) | 产品功能设计文档（界面、交互、权限） |
| [UIDesign.md](./UIDesign.md) | UI 设计规范（色彩、字体、组件规范） |
| [Architecture.md](./Architecture.md) | 系统架构设计（技术选型、数据库、部署） |
| [PhaseDesign.md](./PhaseDesign.md) | 分阶段功能实现设计（Phase 0 ~ Phase 10） |

## 技术栈

- **前端**：Vue 3 + Vite + TypeScript + Tailwind CSS + Pinia
- **后端**：Node.js + Hono + Drizzle ORM + TypeScript
- **数据库**：PostgreSQL 16 + Redis 7
- **部署**：Docker Compose + Nginx + Let's Encrypt

## 开发阶段

- [x] Phase 0：工程基础
- [ ] Phase 1：核心数据层
- [ ] Phase 2：认证与权限
- [ ] Phase 3：CP 管理（MVP）
- [ ] Phase 4：事件记录（时间轴）
- [ ] Phase 5：人物简介 & 大事记
- [ ] Phase 6：媒体与富文本编辑器
- [ ] Phase 7：主题与定制
- [ ] Phase 8：成员管理
- [ ] Phase 9：数据管理
- [ ] Phase 10：扩展功能

## 快速开始

详见 [Architecture.md - 项目初始化步骤](./Architecture.md#十三项目初始化步骤)
