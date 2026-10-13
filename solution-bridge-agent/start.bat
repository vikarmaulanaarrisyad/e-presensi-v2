@echo off
title E-Presensi Bridge Agent - Mesin Solution
color 0A

echo ====================================================================
echo      E-PRESENSI BRIDGE AGENT - MESIN FINGERPRINT SOLUTION
echo ====================================================================
echo.

REM Cek apakah Node.js sudah terinstal
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js belum terinstall di komputer ini!
    echo Silakan download dan install Node.js dari: https://nodejs.org
    echo.
    pause
    exit /b
)

REM Cek apakah folder node_modules sudah ada
if not exist "node_modules\" (
    echo [INFO] Menyiapkan modul aplikasi (npm install)...
    call npm install
    echo.
)

REM Cek apakah file .env sudah ada
if not exist ".env" (
    color 0E
    echo [PERINGATAN] File .env belum ditemukan!
    echo Menyalin template dari .env.example ke .env...
    copy .env.example .env >nul
    echo.
    echo Silakan buka file .env dengan Notepad lalu masukkan EP_API_KEY madrasah Anda.
    notepad .env
    echo.
    pause
)

echo [INFO] Menjalankan Bridge Agent...
node agent.js

pause
