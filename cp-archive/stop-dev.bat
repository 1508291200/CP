@echo off
chcp 65001 >nul
set ROOT=%~dp0
echo 停止并移除 Docker 开发容器...
docker compose -f "%ROOT%docker-compose.dev.yml" down
echo 完成。数据已保留在 Docker volume 中。
pause
