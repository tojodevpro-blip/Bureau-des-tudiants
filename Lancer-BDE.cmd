@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title BDE - Lancement local

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est introuvable. Installe Node.js 20 ou plus recent depuis https://nodejs.org
  pause
  exit /b 1
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo Node.js 20 ou plus recent est requis.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Le fichier .env a ete cree. Verifie les mots de passe avant la premiere utilisation.
)

if not exist "node_modules\tsx\dist\cli.mjs" goto install
if not exist "node_modules\next\dist\bin\next" goto install
if not exist "node_modules\prisma\build\index.js" goto install
goto launch

:install
echo Installation des dependances...
call npm ci
if errorlevel 1 (
  echo Installation impossible. Verifie la connexion Internet puis relance ce fichier.
  pause
  exit /b 1
)

:launch
call npm run local:start
if errorlevel 1 pause
endlocal
