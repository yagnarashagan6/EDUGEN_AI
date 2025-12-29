# EduGen AI - RAG System Startup Script
# This script starts all required servers for the RAG system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EduGen AI - RAG System Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running in the correct directory
$currentDir = Get-Location
$expectedDir = "C:\EDUGEN_AI"

if ($currentDir.Path -ne $expectedDir) {
    Write-Host "⚠️  WARNING: You should run this script from: $expectedDir" -ForegroundColor Yellow
    Write-Host "Current directory: $($currentDir.Path)" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)
"
    if ($continue -ne 'y') {
        exit
    }
}

Write-Host "📋 Pre-flight checks..." -ForegroundColor Green
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -NoNewline
try {
    $pythonVersion = python --version 2>&1
    Write-Host " ✓ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host " ✗ Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://www.python.org/" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -NoNewline
try {
    $nodeVersion = node --version 2>&1
    Write-Host " ✓ Found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host " ✗ Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if RAG API .env exists
Write-Host "Checking RAG API configuration..." -NoNewline
if (Test-Path ".\rag model\.env") {
    Write-Host " ✓ .env file found" -ForegroundColor Green
} else {
    Write-Host " ✗ .env file not found!" -ForegroundColor Red
    Write-Host "Please copy 'rag model\.env.example' to 'rag model\.env' and configure it" -ForegroundColor Yellow
    Write-Host "See RAG_IMPLEMENTATION_GUIDE.md for details" -ForegroundColor Yellow
    exit 1
}

# Check if Python dependencies are installed
Write-Host "Checking Python dependencies..." -NoNewline
try {
    cd ".\rag model"
    $flaskInstalled = python -c "import flask" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host " ✗ Dependencies missing!" -ForegroundColor Red
        Write-Host "Run: pip install -r requirements.txt" -ForegroundColor Yellow
        cd ..
        exit 1
    }
    cd ..
} catch {
    Write-Host " ✗ Error checking dependencies" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This will open 3 terminal windows:" -ForegroundColor Yellow
Write-Host "  1. RAG API (Port 5000) - Flask server" -ForegroundColor Yellow
Write-Host "  2. Backend API (Port 10000) - Node.js server" -ForegroundColor Yellow
Write-Host "  3. Frontend (Port 3000) - React app" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Press Enter to continue or Ctrl+C to cancel"

Write-Host ""
Write-Host "🚀 Starting servers..." -ForegroundColor Green
Write-Host ""

# Start RAG API in new window
Write-Host "Starting RAG API (Flask)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\EDUGEN_AI\rag model'; Write-Host '=== RAG API Server ===' -ForegroundColor Cyan; Write-Host 'Port: 5000' -ForegroundColor Green; Write-Host ''; python rag_api.py"

Start-Sleep -Seconds 2

# Start Backend in new window
Write-Host "Starting Backend API (Node.js)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\EDUGEN_AI\edugen-backend'; Write-Host '=== Backend API Server ===' -ForegroundColor Cyan; Write-Host 'Port: 10000' -ForegroundColor Green; Write-Host ''; npm start"

Start-Sleep -Seconds 2

# Start Frontend in new window
Write-Host "Starting Frontend (React)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\EDUGEN_AI'; Write-Host '=== Frontend Server ===' -ForegroundColor Cyan; Write-Host 'Port: 3000' -ForegroundColor Green; Write-Host ''; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ All servers are starting!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Server URLs:" -ForegroundColor Cyan
Write-Host "  RAG API:  http://localhost:5000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:10000" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "⏱️  Servers will take 10-30 seconds to fully start" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 To stop all servers:" -ForegroundColor Cyan
Write-Host "   Close the terminal windows or press Ctrl+C in each" -ForegroundColor White
Write-Host ""
Write-Host "✨ Happy coding!" -ForegroundColor Green
Write-Host ""

# Keep this window open
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
