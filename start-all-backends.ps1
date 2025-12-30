# ============================================
# EDUGEN AI - Complete Backend Startup Script
# ============================================
# This script starts all required backend services:
# 0. PDF Ingestion (automatic, if needed)
# 1. RAG API (Python Flask) on port 5000
# 2. Node.js Backend on port 5001
# 3. React Frontend on port 3000
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EDUGEN AI - Starting All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Function to kill process on a port
function Stop-ProcessOnPort {
    param([int]$Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($process) {
        Write-Host "⚠️  Stopping existing process on port $Port..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Check and clean ports
Write-Host "🔍 Checking ports..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port 5000
Stop-ProcessOnPort -Port 5001
Stop-ProcessOnPort -Port 3000

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Starting Backend Services" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 1. Start RAG API (Python Flask)
Write-Host "🐍 Starting RAG API (Python Flask) on port 5000..." -ForegroundColor Cyan
$ragPath = Join-Path $PSScriptRoot "rag model"

# Check if PDFs need to be ingested
$pdfFolder = Join-Path $ragPath "pdfs"
$chromaDbFolder = Join-Path $ragPath "chroma_db"
$pdfFiles = Get-ChildItem -Path $pdfFolder -Filter "*.pdf" -ErrorAction SilentlyContinue

if ($pdfFiles -and $pdfFiles.Count -gt 0) {
    # Check if ChromaDB exists and has data
    $needsIngestion = $false
    
    if (-not (Test-Path $chromaDbFolder)) {
        $needsIngestion = $true
        Write-Host "📚 ChromaDB not found. PDFs need to be ingested..." -ForegroundColor Yellow
    } else {
        # Check if ChromaDB is empty or outdated
        $dbFiles = Get-ChildItem -Path $chromaDbFolder -Recurse -File -ErrorAction SilentlyContinue
        if (-not $dbFiles -or $dbFiles.Count -eq 0) {
            $needsIngestion = $true
            Write-Host "📚 ChromaDB is empty. PDFs need to be ingested..." -ForegroundColor Yellow
        }
    }
    
    if ($needsIngestion) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host "  PDF Ingestion Required" -ForegroundColor Magenta
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host ""
        Write-Host "Found $($pdfFiles.Count) PDF file(s) that need to be indexed:" -ForegroundColor Cyan
        foreach ($pdf in $pdfFiles) {
            Write-Host "  - $($pdf.Name)" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "🚀 Running PDF ingestion (this may take a few minutes)..." -ForegroundColor Yellow
        Write-Host ""
        
        # Run ingestion in the same window
        Push-Location $ragPath
        python ingest_pdfs.py
        $ingestResult = $LASTEXITCODE
        Pop-Location
        
        Write-Host ""
        if ($ingestResult -eq 0) {
            Write-Host "✅ PDF ingestion completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  PDF ingestion had some issues. RAG may not work properly." -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host ""
        Start-Sleep -Seconds 2
    } else {
        Write-Host "✅ PDFs already indexed in ChromaDB" -ForegroundColor Green
    }
}

# Now start the RAG API server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ragPath'; Write-Host '🐍 RAG API Server' -ForegroundColor Cyan; python rag_api.py"
Write-Host "✅ RAG API started" -ForegroundColor Green
Start-Sleep -Seconds 3

# 2. Start Node.js Backend
Write-Host ""
Write-Host "🟢 Starting Node.js Backend on port 5001..." -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "edugen-backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '🟢 Node.js Backend' -ForegroundColor Green; npm start"
Write-Host "✅ Node.js Backend started" -ForegroundColor Green
Start-Sleep -Seconds 3

# 3. Start React Frontend
Write-Host ""
Write-Host "⚛️  Starting React Frontend on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host '⚛️  React Frontend' -ForegroundColor Blue; npm start"
Write-Host "✅ React Frontend started" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Started Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
Write-Host "  🐍 RAG API:         http://localhost:5000" -ForegroundColor White
Write-Host "  🟢 Node.js Backend: http://localhost:5001" -ForegroundColor White
Write-Host "  ⚛️  React Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Each service is running in a separate PowerShell window" -ForegroundColor Yellow
Write-Host "💡 To stop all services, close all PowerShell windows" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
