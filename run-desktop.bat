@echo off
title ENERGY SPORTS POS - Ung dung Desktop Windows
color 0B
echo ================================================================
echo   ENERGY SPORTS POS - HE THONG QUAN LY BAN HANG THE THAO
echo   Truong Dai hoc Su pham TP.HCM - Khoa Cong nghe Thong tin
echo   CSDL: Microsoft SQL Server (ENERGY_STORE_DB)
echo ================================================================
echo.

:: Giai phong port 3000 neu co tien trinh cu treo
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Dang giai phong tien trinh cu tren cong 3000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo Dang khoi chay Ung dung Desktop Electron...
echo.

npm run desktop

if errorlevel 1 (
    echo.
    echo [LOI] Khong the khoi chay bang npm, dang thu chay bang npx electron...
    npx electron .
)

pause
