@echo off
setlocal
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 18 or later and reopen this launcher.
  pause
  exit /b 1
)
set "server=%~dp0room-server.cjs"
if not exist "%server%" set "server=%~dp0source\release\room-server.cjs"
if not exist "%server%" (
  echo Download the LAN release zip, or run npm ci and npm run build in source.
  pause
  exit /b 1
)
node "%server%" %*
set "result=%errorlevel%"
pause
exit /b %result%
