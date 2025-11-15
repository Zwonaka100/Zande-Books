# ========================================
# ZANDE BOOKS - PRODUCTION DATABASE SETUP
# Run this script to open all SQL files
# ========================================

Write-Host "ZANDE BOOKS - Production Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\Users\Zwonaka Mabege\OneDrive\Desktop\Zande Technologies\Zandebooks\Zandebooks"

Write-Host "Project Path: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Check if files exist
$file1 = "$projectPath\database\01_chart_of_accounts_schema.sql"
$file2 = "$projectPath\database\02_coa_templates_data.sql"
$file3 = "$projectPath\database\03_industry_features_schema.sql"

Write-Host "Checking SQL files..." -ForegroundColor Yellow

if (Test-Path $file1) {
    Write-Host "[OK] Found: 01_chart_of_accounts_schema.sql" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Missing: 01_chart_of_accounts_schema.sql" -ForegroundColor Red
}

if (Test-Path $file2) {
    Write-Host "[OK] Found: 02_coa_templates_data.sql" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Missing: 02_coa_templates_data.sql" -ForegroundColor Red
}

if (Test-Path $file3) {
    Write-Host "[OK] Found: 03_industry_features_schema.sql" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Missing: 03_industry_features_schema.sql" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EXECUTION INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Opening Supabase Dashboard..." -ForegroundColor Yellow
Start-Process "https://supabase.com"
Start-Sleep -Seconds 2

Write-Host "2. Opening SQL files in VS Code..." -ForegroundColor Yellow
if (Test-Path $file1) { code $file1 }
if (Test-Path $file2) { code $file2 }
if (Test-Path $file3) { code $file3 }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: RUN IN THIS ORDER" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: In Supabase SQL Editor, run:" -ForegroundColor Yellow
Write-Host "        📄 01_chart_of_accounts_schema.sql" -ForegroundColor White
Write-Host "        (Creates all tables, triggers, RLS)" -ForegroundColor Gray
Write-Host ""
Write-Host "Step 2: Then run:" -ForegroundColor Yellow
Write-Host "        📄 02_coa_templates_data.sql" -ForegroundColor White
Write-Host "        (Loads 4 industry templates)" -ForegroundColor Gray
Write-Host ""
Write-Host "Step 3: Finally run:" -ForegroundColor Yellow
Write-Host "        📄 03_industry_features_schema.sql" -ForegroundColor White
Write-Host "        (Adds industry features)" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "After running all scripts:" -ForegroundColor Yellow
Write-Host "1. Refresh your ZandeBooks app" -ForegroundColor White
Write-Host "2. Click Chart of Accounts" -ForegroundColor White
Write-Host "3. Your real COA will load automatically!" -ForegroundColor White
Write-Host ""
Write-Host "✨ Production setup complete!" -ForegroundColor Green
Write-Host ""

# Keep window open
Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
