@echo off
echo 🍊 正在启动西柚桌宠...
echo.
echo 正在启动 Vite 开发服务器和 Electron...
echo.

cd /d %~dp0
npm run electron:dev

pause
