# 📦 Node.js 安装指南

## 🎯 快速安装步骤

### Windows 系统安装（推荐方式）

#### 步骤 1：下载安装包

**官方网站**：https://nodejs.org/

你会看到两个版本：
- **LTS（推荐）**：长期支持版，稳定可靠 ✅
- **Current**：最新功能版，尝鲜使用

**推荐选择 LTS 版本**

当前推荐版本：
- Node.js 20.x LTS（最新）
- 或 Node.js 18.x LTS（稳定）

#### 步骤 2：运行安装程序

1. **下载完成后**，双击 `.msi` 文件

2. **安装向导**：
   ```
   ┌─────────────────────────────┐
   │  Node.js Setup              │
   │                             │
   │  [Next >]                   │
   └─────────────────────────────┘
   ```

3. **接受许可协议**
   ```
   ☑ I accept the terms...
   [Next >]
   ```

4. **选择安装位置**（默认即可）
   ```
   默认：C:\Program Files\nodejs\
   [Next >]
   ```

5. **自定义安装**（保持默认）
   ```
   ☑ Node.js runtime
   ☑ npm package manager
   ☑ Online documentation shortcuts
   ☑ Add to PATH  ← 重要！必须勾选
   [Next >]
   ```

6. **工具安装选项**
   ```
   ☐ Automatically install necessary tools
   （可以不勾选，这个是安装编译工具）
   [Next >]
   ```

7. **开始安装**
   ```
   [Install]
   等待 2-3 分钟...
   ```

8. **完成安装**
   ```
   [Finish]
   ```

#### 步骤 3：验证安装

1. **打开命令提示符**
   - 按 `Win + R`
   - 输入 `cmd`
   - 按 `Enter`

2. **验证 Node.js**
   ```bash
   node --version
   ```
   应该显示：`v20.x.x` 或 `v18.x.x`

3. **验证 npm**
   ```bash
   npm --version
   ```
   应该显示：`10.x.x` 或 `9.x.x`

✅ **如果都显示版本号，安装成功！**

---

## 🚀 立即安装（详细步骤）

### 方法一：官网下载（推荐）

1. **访问官网**
   ```
   在浏览器打开：https://nodejs.org/zh-cn/
   ```

2. **点击下载**
   ```
   点击绿色大按钮：
   "下载 Node.js (LTS)"
   ```

3. **选择版本**
   ```
   Windows (x64)         ← 64位系统（大多数）
   Windows (x86)         ← 32位系统（较少）
   ```

4. **等待下载**
   ```
   文件大小：约 30MB
   文件名：node-v20.x.x-x64.msi
   ```

5. **双击安装**
   ```
   按照上面的安装向导步骤操作
   ```

### 方法二：使用包管理器（高级）

#### Chocolatey（推荐）

1. **安装 Chocolatey**（如果没有）
   ```powershell
   # 以管理员身份打开 PowerShell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
   ```

2. **安装 Node.js**
   ```bash
   choco install nodejs-lts -y
   ```

#### Scoop（轻量级）

1. **安装 Scoop**（如果没有）
   ```powershell
   iwr -useb get.scoop.sh | iex
   ```

2. **安装 Node.js**
   ```bash
   scoop install nodejs-lts
   ```

---

## 🔧 安装后配置（可选）

### 1. 配置 npm 镜像（加速下载）

**使用淘宝镜像**（推荐）

```bash
# 设置镜像
npm config set registry https://registry.npmmirror.com

# 验证设置
npm config get registry
```

应该显示：`https://registry.npmmirror.com`

### 2. 全局安装目录配置（可选）

```bash
# 查看当前配置
npm config list

# 设置全局安装目录（可选）
npm config set prefix "D:\nodejs\node_global"
npm config set cache "D:\nodejs\node_cache"
```

---

## ⚠️ 常见问题

### 问题 1：找不到 node 命令

**原因**：PATH 环境变量未配置

**解决**：

1. 右键"此电脑" → 属性
2. 高级系统设置 → 环境变量
3. 系统变量中找到 `Path`
4. 确认是否有：`C:\Program Files\nodejs\`
5. 如果没有，点击"新建"添加

### 问题 2：npm 下载很慢

**原因**：访问国外服务器慢

**解决**：使用淘宝镜像（见上面配置部分）

### 问题 3：权限不够

**原因**：某些操作需要管理员权限

**解决**：
- 右键"命令提示符"
- 选择"以管理员身份运行"

### 问题 4：安装后仍然显示"不是内部命令"

**原因**：命令行窗口未刷新

**解决**：
1. 关闭当前命令行窗口
2. 重新打开一个新窗口
3. 再次尝试 `node --version`

---

## 📝 安装完成检查清单

- [ ] Node.js 版本正常（`node --version`）
- [ ] npm 版本正常（`npm --version`）
- [ ] 配置了淘宝镜像（加速下载）
- [ ] 可以运行 `npm install`

**全部完成 → 可以开始安装西柚桌宠了！**

---

## 🍊 安装 Node.js 后的下一步

### 进入项目目录

```bash
cd f:\YouAI\grapefruit-pet
```

### 安装项目依赖

```bash
npm install
```

这会安装：
- Electron
- React
- TypeScript
- 其他依赖

**时间**：约 5-10 分钟（取决于网速）

### 启动项目

```bash
npm run electron:dev
```

**成功标志**：屏幕右下角出现可爱的西柚！🍊

---

## 💡 小贴士

### 推荐工具

安装完 Node.js 后，可以安装这些工具：

```bash
# pnpm（更快的包管理器）
npm install -g pnpm

# yarn（另一个包管理器）
npm install -g yarn

# nodemon（自动重启）
npm install -g nodemon
```

### 版本管理

如果需要切换 Node.js 版本：

**使用 nvm（Node Version Manager）**

Windows 版本：https://github.com/coreybutler/nvm-windows

```bash
# 安装指定版本
nvm install 20.0.0

# 切换版本
nvm use 20.0.0

# 查看已安装版本
nvm list
```

---

## 📞 获取帮助

### 官方资源

- 官网：https://nodejs.org/
- 文档：https://nodejs.org/docs/
- GitHub：https://github.com/nodejs/node

### 中文资源

- 中文网：https://nodejs.org/zh-cn/
- 淘宝镜像：https://npmmirror.com/

---

## 🎯 总结

### 最简单的安装方式

1. 访问 https://nodejs.org/
2. 下载 LTS 版本
3. 双击安装（一路 Next）
4. 验证：`node --version`

**就这么简单！**

---

**安装完成后，就可以启动西柚桌宠了！🍊✨**
