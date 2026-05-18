@echo off
chcp 65001 >nul
setlocal

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo ============================================
echo   CP Archive - 本地开发启动（无 Docker）
echo ============================================

:: ── 检查 .env 是否已配置 ────────────────────────────
if not exist "%BACKEND%\.env" (
    echo [提示] 未找到 backend\.env，正在从 .env.local 复制...
    copy "%BACKEND%\.env.local" "%BACKEND%\.env" >nul
    echo.
    echo !! 请先编辑 backend\.env 填入 Neon.tech 数据库地址 !!
    echo    DATABASE_URL=postgresql://...
    echo.
    echo    注册地址：https://neon.tech
    echo    注册后创建项目，复制 Connection string 填入 .env
    echo.
    start "" "%BACKEND%\.env"
    echo 填写完成后，重新运行此脚本
    pause
    exit /b 0
)

:: ── 检查 DATABASE_URL 是否仍是示例值 ────────────────
findstr /C:"ep-xxx" "%BACKEND%\.env" >nul 2>&1
if not errorlevel 1 (
    echo [错误] backend\.env 中的 DATABASE_URL 仍是示例值，请填入真实的 Neon.tech 地址
    start "" "%BACKEND%\.env"
    pause
    exit /b 1
)

:: ── 安装依赖 ─────────────────────────────────────────
echo [1/3] 检查并安装依赖...
cd /d "%BACKEND%"
if not exist node_modules (
    echo       安装 backend 依赖...
    call npm install
)

cd /d "%FRONTEND%"
if not exist node_modules (
    echo       安装 frontend 依赖...
    call npm install
)

:: ── 数据库迁移 ───────────────────────────────────────
echo [2/3] 执行数据库迁移...
cd /d "%BACKEND%"
call npm run db:migrate
if errorlevel 1 (
    echo [错误] 数据库迁移失败！请检查 backend\.env 中的 DATABASE_URL 是否正确
    pause
    exit /b 1
)

:: ── 启动前后端 ───────────────────────────────────────
echo [3/3] 启动服务...
start "CP Backend :3000" cmd /k "cd /d "%BACKEND%" && npm run dev"
timeout /t 2 /nobreak >nul
start "CP Frontend :5173" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo ============================================
echo   启动完成！
echo   前端:  http://localhost:5173
echo   后端:  http://localhost:3000
echo   数据库: Neon.tech 云端 PostgreSQL
echo   Redis:  内存模拟（重启后 Token 失效）
echo ============================================
pause
