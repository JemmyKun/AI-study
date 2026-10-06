@echo off
chcp 65001 >nul
title 停止开发服务

echo ============================================
echo   停止 前端(3000) 与 CopilotKit Runtime(8200)
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js
  pause
  exit /b 1
)

node scripts/stop.mjs

echo.
pause
