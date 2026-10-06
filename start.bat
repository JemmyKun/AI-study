@echo off
chcp 65001 >nul
title 低代码业务平台 - 开发服务

echo ============================================
echo   低代码业务平台  一键启动
echo   前端: http://localhost:3000
echo   Runtime: http://127.0.0.1:8200/api/copilotkit
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node 18+
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [提示] 首次启动，正在安装依赖，请稍候...
  call npm install
)

node scripts/start.mjs

echo.
echo [已停止] 服务已退出
pause
