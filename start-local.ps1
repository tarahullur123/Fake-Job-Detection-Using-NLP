$projectRoot = Join-Path $PSScriptRoot 'Fake Job Detection using NLP'
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'
$backendVenvActivate = Join-Path $backendDir '.venv\Scripts\Activate.ps1'
$frontendEnvFile = Join-Path $frontendDir '.env.local'

if (-not (Test-Path $backendDir)) {
    throw "Backend directory not found: $backendDir"
}

if (-not (Test-Path $frontendDir)) {
    throw "Frontend directory not found: $frontendDir"
}

if (-not (Test-Path $backendVenvActivate)) {
    throw 'Backend virtual environment not found. Run the backend setup once before using this script.'
}

if (-not (Test-Path $frontendEnvFile)) {
    Set-Content -Path $frontendEnvFile -Value 'NEXT_PUBLIC_API_URL=http://localhost:8000'
}

$backendCommand = "Set-Location '$backendDir'; . '$backendVenvActivate'; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
$frontendCommand = "Set-Location '$frontendDir'; npm run dev"

Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCommand | Out-Null
Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCommand | Out-Null

Write-Host 'Backend starting at http://127.0.0.1:8000'
Write-Host 'Frontend starting at http://127.0.0.1:3001'