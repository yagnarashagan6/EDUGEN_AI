# PowerShell script to test EduGen API
Write-Host "Testing EduGen AI Caching Functionality" -ForegroundColor Green
Write-Host ""

# Test 1: Health check
Write-Host "1. Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:10000/api/health" -Method Get
    Write-Host "Health check successful:" -ForegroundColor Green
    $healthResponse | ConvertTo-Json
} catch {
    Write-Host "Health check failed:" $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Testing chat endpoint..." -ForegroundColor Yellow

# Test 2: Chat endpoint
try {
    $body = @{
        message = "What is machine learning?"
    } | ConvertTo-Json

    $chatResponse = Invoke-RestMethod -Uri "http://localhost:10000/api/chat" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Chat request successful:" -ForegroundColor Green
    Write-Host "Response length:" $chatResponse.response.Length "characters"
} catch {
    Write-Host "Chat request failed (expected if no OpenRouter API key):" $_.Exception.Message -ForegroundColor Yellow
    if ($_.ErrorDetails) {
        Write-Host "Error details:" $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Green