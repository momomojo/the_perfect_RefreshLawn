@echo off
REM Supabase Database Restore Script for Windows
REM This script restores your Supabase database from a backup

REM Configuration
set PROJECT_ID=sjgixmidwtwzbduakzkk
set OUTPUT_DIR=%~dp0

REM Check if Supabase CLI is installed
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Supabase CLI is not installed. Please install it first.
    echo Installation instructions: https://supabase.com/docs/guides/cli
    exit /b 1
)

REM Menu for backup selection
echo ========== DATABASE RESTORE UTILITY ==========
echo Supabase project: %PROJECT_ID%
echo.
echo Which backup do you want to restore?
echo 1) Full database backup (backup.sql)
echo 2) Schema only (schema.sql)
echo 3) Choose another backup file
echo 4) Exit
echo.
set /p choice="Enter choice [1-4]: "

if "%choice%"=="1" (
    set backup_file=%OUTPUT_DIR%backup.sql
) else if "%choice%"=="2" (
    set backup_file=%OUTPUT_DIR%schema.sql
) else if "%choice%"=="3" (
    echo Available backup files:
    dir /b %OUTPUT_DIR%\*.sql
    echo.
    set /p custom_file="Enter the backup filename: "
    set backup_file=%OUTPUT_DIR%%custom_file%
) else if "%choice%"=="4" (
    echo Exiting...
    exit /b 0
) else (
    echo Invalid choice. Exiting.
    exit /b 1
)

REM Check if file exists
if not exist "%backup_file%" (
    echo Error: Backup file does not exist: %backup_file%
    exit /b 1
)

echo Restoring database from: %backup_file%
echo WARNING: This will overwrite your current database data
set /p confirm="Are you sure you want to continue? (y/n): "

if /i not "%confirm%"=="y" (
    echo Restore cancelled.
    exit /b 0
)

echo Please enter your database password when prompted
echo Restoring database...

REM Restore the database
supabase db restore -p %PROJECT_ID% "%backup_file%"

echo Database restore completed!
pause