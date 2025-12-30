# ingest-pdfs.ps1 - Quick script to ingest PDFs into RAG system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PDF Ingestion Script for RAG System  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ragModelPath = Join-Path $scriptPath "rag model"

# Check if rag model folder exists
if (-not (Test-Path $ragModelPath)) {
    Write-Host "❌ Error: 'rag model' folder not found!" -ForegroundColor Red
    Write-Host "   Expected path: $ragModelPath" -ForegroundColor Yellow
    exit 1
}

# Navigate to rag model folder
Set-Location $ragModelPath
Write-Host "📁 Working directory: $ragModelPath" -ForegroundColor Green
Write-Host ""

# Check if PDFs exist
$pdfFolder = Join-Path $ragModelPath "pdfs"
if (-not (Test-Path $pdfFolder)) {
    Write-Host "❌ Error: 'pdfs' folder not found!" -ForegroundColor Red
    exit 1
}

$pdfFiles = Get-ChildItem -Path $pdfFolder -Filter "*.pdf"
if ($pdfFiles.Count -eq 0) {
    Write-Host "⚠️  Warning: No PDF files found in pdfs folder!" -ForegroundColor Yellow
    Write-Host "   Please add PDF files to: $pdfFolder" -ForegroundColor Yellow
    exit 1
}

Write-Host "📚 Found $($pdfFiles.Count) PDF file(s):" -ForegroundColor Green
foreach ($pdf in $pdfFiles) {
    Write-Host "   - $($pdf.Name) ($([math]::Round($pdf.Length / 1MB, 2)) MB)" -ForegroundColor Cyan
}
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Python not found!" -ForegroundColor Red
    Write-Host "   Please install Python from https://www.python.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Check if requirements are installed
Write-Host "🔍 Checking dependencies..." -ForegroundColor Cyan
$requirementsFile = Join-Path $ragModelPath "requirements.txt"
if (Test-Path $requirementsFile) {
    Write-Host "   Installing/updating dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt --quiet
    Write-Host "   ✅ Dependencies ready" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  requirements.txt not found, skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Run ingestion script
Write-Host "🚀 Starting PDF ingestion..." -ForegroundColor Cyan
Write-Host "   This may take a few minutes..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

python ingest_pdfs.py

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Check if successful
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ PDF ingestion completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Go to Staff Dashboard" -ForegroundColor White
    Write-Host "2. Post a task with one of your PDFs" -ForegroundColor White
    Write-Host "3. Check Admin Dashboard (/admin) to see RAG extracted data" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ PDF ingestion failed!" -ForegroundColor Red
    Write-Host "   Check the error messages above" -ForegroundColor Yellow
    Write-Host ""
}

# Return to original directory
Set-Location $scriptPath
