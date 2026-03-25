# ============================================================
# Amakuru News - Analytics Schema Deployment Script (PowerShell)
# Purpose: Deploy Prisma analytics migrations to production
# Usage: .\deploy-analytics.ps1 -AppPath "C:\app"
# ============================================================

param(
  [string]$AppPath = ".",
  [switch]$SkipVerification = $false
)

# Configuration
$AppUser = "app_user"
$AppPassword = "Irafasha@2025"
$DbHost = "intambwemedia.com"
$DbPort = "5432"
$DbName = "amakuru_news_db"
$DatabaseUrl = "postgresql://${AppUser}:${AppPassword}@${DbHost}:${DbPort}/${DbName}"

# Color output functions
function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
  param([string]$Message)
  Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Error-Custom {
  param([string]$Message)
  Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
  param([string]$Message)
  Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

# Main deployment
function Main {
  Write-Info "Starting Analytics Schema Deployment"
  Write-Info "App Path: $AppPath"
  Write-Info "Database: $DbName @ ${DbHost}:${DbPort}"
  Write-Host ""
    
  # Change to app directory
  if (-not (Test-Path $AppPath)) {
    Write-Error-Custom "App path does not exist: $AppPath"
    exit 1
  }
    
  Set-Location $AppPath
  Write-Success "Changed to app directory"
    
  # Check if npm is available
  if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "npx not found. Please install Node.js"
    exit 1
  }
  Write-Success "npx is available"
    
  # Check if prisma/schema.prisma exists
  if (-not (Test-Path "prisma/schema.prisma")) {
    Write-Error-Custom "prisma/schema.prisma not found"
    exit 1
  }
  Write-Success "Prisma schema found"
    
  # Check if migrations exist
  if (-not (Test-Path "prisma/migrations")) {
    Write-Error-Custom "prisma/migrations directory not found"
    exit 1
  }
  Write-Success "Migrations directory found"
    
  Write-Host ""
  Write-Info "Testing database connection..."
    
  # Set environment variable and test
  $env:DATABASE_URL = $DatabaseUrl
    
  Write-Success "Environment configured"
    
  Write-Host ""
  Write-Info "Running: npx prisma migrate deploy"
  Write-Info "This will apply all pending migrations..."
  Write-Host ""
    
  # Run migration
  & npx prisma migrate deploy
    
  if ($LASTEXITCODE -eq 0) {
    Write-Success "Migration deployed successfully!"
    Write-Host ""
        
    Write-Host ""
    Write-Success "======================================"
    Write-Success "Deployment Complete!"
    Write-Success "======================================"
    Write-Info "Analytics schema is now active in production."
    Write-Info "Dashboard URL: https://intambwemedia.com/analytics"
    Write-Info "API Endpoint: POST /api/analytics/send"
    Write-Info "Stats API: GET /api/analytics/stats?days=7"
  }
  else {
    Write-Error-Custom "Migration deployment failed! (Exit code: $LASTEXITCODE)"
    exit 1
  }
}

# Run main function
Main
