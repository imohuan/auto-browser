@echo off
chcp 65001 >nul
echo ========================================
echo AutoBrowser EXE 测试脚本
echo ========================================
echo.

REM 检查是否提供了 exe 路径参数
if "%~1"=="" (
    echo 使用默认 exe 路径: out\win-unpacked\AutoBrowser.exe
    echo.
    echo 如果需要指定其他路径，使用方法:
    echo   test-exe.bat "路径\到\AutoBrowser.exe"
    echo.
    node scripts/test-exe.js
) else (
    echo 使用指定的 exe 路径: %~1
    echo.
    node scripts/test-exe.js "%~1"
)

pause

