@echo off
start "CP Backend"  cmd /k "cd /d f:\YouAI\cp-archive\backend  && npm run dev"
start "CP Frontend" cmd /k "cd /d f:\YouAI\cp-archive\frontend && npm run dev"
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"
start "" "http://localhost:3000/api/v1/health"
