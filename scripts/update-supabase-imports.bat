@echo off
echo Finding files with utils/supabase imports (this will only list files, not modify them)
echo.

echo Searching app directory
findstr /s /i /m "from ['\"].*utils/supabase['\"]" app\*.ts app\*.tsx

echo.
echo Searching components directory
findstr /s /i /m "from ['\"].*utils/supabase['\"]" components\*.ts components\*.tsx

echo.
echo Searching lib directory
findstr /s /i /m "from ['\"].*utils/supabase['\"]" lib\*.ts lib\*.tsx

echo.
echo Searching utils directory
findstr /s /i /m "from ['\"].*utils/supabase['\"]" utils\*.ts utils\*.tsx

echo.
echo Searching hooks directory
findstr /s /i /m "from ['\"].*utils/supabase['\"]" hooks\*.ts hooks\*.tsx

echo.
echo ==========================================================
echo Files listed above need to be updated manually to import from lib/supabase.ts
echo instead of utils/supabase.ts to fix the Multiple GoTrueClient issue
echo ========================================================== 