@echo off
REM install-hooks.bat
REM 将 scripts/security/pre-commit 安装到 .git/hooks/
REM 在克隆仓库后运行一次即可。
REM
REM 用法：
REM   scripts\security\install-hooks.bat

setlocal

REM 获取仓库根目录
for /f "delims=" %%i in ('git rev-parse --show-toplevel') do set REPO_ROOT=%%i

set HOOK_SRC=%REPO_ROOT%\cp-archive\scripts\security\pre-commit
set HOOK_DST=%REPO_ROOT%\.git\hooks\pre-commit

if not exist "%HOOK_SRC%" (
    echo ERROR: Hook source not found: %HOOK_SRC%
    exit /b 1
)

copy /y "%HOOK_SRC%" "%HOOK_DST%" >nul
echo ✅ pre-commit hook installed: %HOOK_DST%
echo    The hook will scan staged files for secrets before every commit.

endlocal
