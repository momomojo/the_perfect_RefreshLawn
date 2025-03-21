@echo off
REM Supabase Database Backup Script for Windows
REM This script creates backups of your Supabase database

REM Configuration
set PROJECT_ID=sjgixmidwtwzbduakzkk
set OUTPUT_DIR=%~dp0
set TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

REM Check if Supabase CLI is installed
where supabase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Supabase CLI is not installed. Please install it first.
    echo Installation instructions: https://supabase.com/docs/guides/cli
    exit /b 1
)

echo Creating backup for Supabase project: %PROJECT_ID%
echo Please enter your database password when prompted

REM Create full backup
echo Creating full database backup...
supabase db dump -p %PROJECT_ID% > "%OUTPUT_DIR%backup.sql"

REM Create schema-only backup
echo Creating schema-only backup...
supabase db dump -p %PROJECT_ID% --schema-only > "%OUTPUT_DIR%schema.sql"

REM Create a dated backup for archival
echo Creating dated backup archive...
supabase db dump -p %PROJECT_ID% > "%OUTPUT_DIR%backup_%TIMESTAMP%.sql"

echo Backup completed successfully!
echo Files created:
echo - %OUTPUT_DIR%backup.sql (Full database)
echo - %OUTPUT_DIR%schema.sql (Schema only)
echo - %OUTPUT_DIR%backup_%TIMESTAMP%.sql (Archived backup)

pause