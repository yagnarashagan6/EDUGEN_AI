# RAG API Setup Guide

## Issue: "not configured" Error

You're getting this error because the RAG API cannot find the GROQ_API_KEY in the environment variables.

## Solution

### Step 1: Create .env file

Run this command in PowerShell:

```powershell
cd "c:\EDUGEN_AI\rag model"
@"
# RAG API Configuration
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
RAG_API_PORT=5000
"@ | Out-File -FilePath .env -Encoding UTF8
```

### Step 2: Get Your Groq API Key

1. Go to: https://console.groq.com/keys
2. Sign in or create an account
3. Click "Create API Key"
4. Copy the generated key

### Step 3: Update .env file

Replace `your_actual_groq_api_key_here` with your actual Groq API key:

```powershell
notepad ".env"
```

Or use this command to set it directly (replace YOUR_KEY with your actual key):

```powershell
(Get-Content .env) -replace 'your_actual_groq_api_key_here', 'YOUR_ACTUAL_KEY' | Set-Content .env
```

### Step 4: Restart the RAG API

After updating the .env file, restart the RAG API server for changes to take effect.

## Port 10000 Issue

The Node.js backend is trying to start on port 10000 but it's already in use. 

### Solution: Kill the process and restart

```powershell
# Find and kill the process using port 10000
$port = Get-NetTCPConnection -LocalPort 10000 -ErrorAction SilentlyContinue
if ($port) {
    Stop-Process -Id $port.OwningProcess -Force
}

# Wait a moment
Start-Sleep -Seconds 2

# Navigate to backend directory
cd "c:\EDUGEN_AI\edugen-backend"

# Start the backend
npm start
```

## Quick Fix Script

Save this as `fix-rag-setup.ps1` and run it:

```powershell
# Navigate to RAG model directory
cd "c:\EDUGEN_AI\rag model"

# Create .env file if it doesn't exist
if (!(Test-Path .env)) {
    @"
# RAG API Configuration
GROQ_API_KEY=your_actual_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
RAG_API_PORT=5000
"@ | Out-File -FilePath .env -Encoding UTF8
    Write-Host "✓ Created .env file" -ForegroundColor Green
    Write-Host "⚠ Please edit .env and add your Groq API key!" -ForegroundColor Yellow
    notepad .env
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

# Check if GROQ_API_KEY is set
$envContent = Get-Content .env -Raw
if ($envContent -match "GROQ_API_KEY=your_actual_groq_api_key_here" -or $envContent -match "GROQ_API_KEY=\s*$") {
    Write-Host "⚠ GROQ_API_KEY not configured! Please add your API key to .env" -ForegroundColor Yellow
    Write-Host "Get your key from: https://console.groq.com/keys" -ForegroundColor Cyan
} else {
    Write-Host "✓ GROQ_API_KEY is configured" -ForegroundColor Green
}
```

## Verification

After setup, test the RAG API:

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:5000/api/rag/health" | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

Expected output:
```json
{
  "status": "healthy",
  "service": "EduGen RAG API",
  "upload_folder": "c:\\EDUGEN_AI\\rag model\\pdfs"
}
```

## Common Issues

### 1. "not configured" error
- **Cause**: Missing or invalid GROQ_API_KEY
- **Fix**: Add valid API key to .env file

### 2. Port 10000 already in use
- **Cause**: Another instance of backend is running
- **Fix**: Kill the process and restart

### 3. RAG API not starting
- **Cause**: Missing Python dependencies
- **Fix**: Run `pip install -r requirements.txt` in rag model directory

### 4. "Module not found" errors
- **Cause**: Missing Python packages
- **Fix**: Install required packages:
  ```powershell
  cd "c:\EDUGEN_AI\rag model"
  pip install flask flask-cors python-dotenv groq chromadb langchain pypdf2
  ```
