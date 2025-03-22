# PowerShell script to update all imports from utils/supabase.ts to lib/supabase.ts
# This Windows-compatible script helps fix the multiple GoTrueClient instances issue
#
# Run with: .\scripts\update-supabase-imports.ps1

# Directories to check
$dirsToCheck = @("app", "components", "lib", "utils", "hooks")

# Counter for modified files
$filesFound = 0
$filesUpdated = 0

# Function to calculate relative path from file to lib/supabase.ts
function Get-RelativePath {
    param(
        [string]$sourceFile
    )
    
    $sourcePath = Split-Path -Parent $sourceFile
    $projectRoot = (Get-Location).Path
    
    # Convert to relative path
    $relativePath = [System.IO.Path]::GetRelativePath($sourcePath, $projectRoot)
    
    # Handle root directory case
    if ($relativePath -eq ".") {
        return "."
    }
    
    # Handle nested directory case by adding proper ../
    return $relativePath
}

Write-Host "🔍 Finding files with utils/supabase imports..." -ForegroundColor Cyan

# Process each directory
foreach ($dir in $dirsToCheck) {
    if (-not (Test-Path $dir)) {
        continue
    }
    
    # Find all TypeScript and TypeScript React files in the directory
    $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx"
    
    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw
        
        # Check if file imports from utils/supabase
        if ($content -match 'from\s+[''"](.\.\/)*utils\/supabase[''"]') {
            $filesFound++
            Write-Host "  Found import in: $($file.FullName)" -ForegroundColor Yellow
            
            # Calculate relative path to lib
            $relativePath = Get-RelativePath -sourceFile $file.FullName
            
            # Replace the imports
            $newContent = $content -replace 'from\s+[''"](.\.\/)*utils\/supabase[''"]', "from `"$relativePath/lib/supabase`""
            
            # Only write if changes were made
            if ($newContent -ne $content) {
                $filesUpdated++
                Set-Content -Path $file.FullName -Value $newContent
                Write-Host "  ✅ Updated imports in: $($file.FullName)" -ForegroundColor Green
            }
        }
    }
}

# Summary
if ($filesFound -eq 0) {
    Write-Host "✨ No files found that need to be updated." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✅ Found $filesFound files with utils/supabase imports" -ForegroundColor Cyan
    Write-Host "✅ Updated imports in $filesUpdated files" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🧪 Please test your application thoroughly to ensure everything works correctly." -ForegroundColor Yellow
    Write-Host "   Check the console for any remaining 'Multiple GoTrueClient instances' warnings." -ForegroundColor Yellow
} 