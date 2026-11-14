@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title BDE - Arret local

powershell -NoProfile -ExecutionPolicy Bypass -Command "$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Start-Sleep -Seconds 2 }; $pgctl = Join-Path (Get-Location) 'node_modules\@embedded-postgres\windows-x64\native\bin\pg_ctl.exe'; if (Test-Path $pgctl) { & $pgctl -D '.data\pg' stop -m fast 2>$null }; Write-Host 'BDE est arrete. Tu peux copier le dossier sur une cle USB.'"
pause
endlocal
