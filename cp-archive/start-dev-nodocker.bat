@echo off
chcp 65001 >nul
setlocal

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo ============================================
echo   CP Archive - 本地开发启动（无 Docker）
echo ============================================

:: ── Step 1: 安装依赖 ──────────────────────────────
cd /d "%BACKEND%"
if not exist node_modules (
    echo [1/3] 安装 backend 依赖...
    call npm install
)

cd /d "%FRONTEND%"
if not exist node_modules (
    echo [1/3] 安装 frontend 依赖...
    call npm install
)

:: ── Step 2: 执行数据库迁移 ───────────────────────
echo [2/3] 执行数据库迁移...
cd /d "%BACKEND%"
call npm run db:migrate
if errorlevel 1 (
    echo [警告] 迁移可能已执行过，继续启动...
)

:: ── Step 3: 启动前后端 ───────────────────────────
echo [3/3] 启动后端 (port 3000) 和前端 (port 5173)...
start "CP Backend" cmd /k "cd /d "%BACKEND%" && npm run dev"
timeout /t 3 /nobreak >nul
start "CP Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo ============================================
echo   启动完成！
echo   前端:  http://localhost:5173
echo   后端:  http://localhost:3000
echo ============================================
echo.
pause
