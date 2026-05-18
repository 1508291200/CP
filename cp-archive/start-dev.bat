@echo off
chcp 65001 >nul
setlocal

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo ============================================
echo   CP Archive - 本地开发环境启动
echo ============================================

:: ── Step 1: 启动 PostgreSQL + Redis ──────────────
echo [1/4] 启动数据库服务 (Docker)...
docker compose -f "%ROOT%docker-compose.dev.yml" up -d
if errorlevel 1 (
    echo [错误] Docker 启动失败，请确认 Docker Desktop 已运行
    pause
    exit /b 1
)

:: ── Step 2: 等待 PostgreSQL 就绪 ─────────────────
echo [2/4] 等待 PostgreSQL 就绪...
:wait_pg
docker compose -f "%ROOT%docker-compose.dev.yml" exec postgres pg_isready -U cpuser -d cparchive >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto wait_pg
)
echo       PostgreSQL 已就绪 ✓

:: ── Step 3: 安装依赖 + 数据库迁移 ────────────────
echo [3/4] 安装依赖并执行数据库迁移...
cd /d "%BACKEND%"
if not exist node_modules (
    echo       安装 backend 依赖...
    call npm install
)
call npm run db:migrate
if errorlevel 1 (
    echo [警告] 迁移脚本报错，可能是已迁移过，继续...
)

cd /d "%FRONTEND%"
if not exist node_modules (
    echo       安装 frontend 依赖...
    call npm install
)

:: ── Step 4: 启动前后端（各自独立窗口）────────────
echo [4/4] 启动后端 (port 3000) 和前端 (port 5173)...

start "CP Backend" cmd /k "cd /d "%BACKEND%" && npm run dev"
timeout /t 3 /nobreak >nul
start "CP Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo ============================================
echo   启动完成！
echo   前端:  http://localhost:5173
echo   后端:  http://localhost:3000
echo   数据库: localhost:5432  (cpuser/cppassword)
echo   Redis:  localhost:6379
echo ============================================
echo.
echo 关闭时请运行 stop-dev.bat 停止 Docker 容器
pause
