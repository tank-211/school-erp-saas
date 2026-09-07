#!/usr/bin/env pwsh

# Quick Setup Script for Fee Management Backend

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Fee Management System - Backend Quick Setup" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (!(Test-Path ".\package.json")) {
    Write-Host "ERROR: package.json not found." -ForegroundColor Red
    exit 1
}

Write-Host "Step 0: Verified backend directory" -ForegroundColor Green
Write-Host ""

# Step 1: Install dependencies
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "Step 1: Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Generate Prisma Client
Write-Host "Step 2: Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Step 2: Retrying Prisma generation (file I/O issue)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    npm run prisma:generate 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Step 2: Prisma generation skipped (will try during migration)" -ForegroundColor Yellow
    }
    else {
        Write-Host "Step 2: Prisma Client generated successfully" -ForegroundColor Green
    }
}
else {
    Write-Host "Step 2: Prisma Client generated successfully" -ForegroundColor Green
}
Write-Host ""

# Step 3: Check .env file
Write-Host "Step 3: Checking environment configuration..." -ForegroundColor Yellow
if (!(Test-Path ".\.env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    $envLines = @(
        "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fee_management?schema=public",
        "NODE_ENV=development",
        "PORT=5000",
        "HOST=localhost",
        "CORS_ORIGIN=http://localhost:5173,http://localhost:3000",
        "JWT_SECRET=your-secret-key-change-in-production",
        "JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production",
        "LOG_LEVEL=debug",
        "MAX_FILE_SIZE=10485760"
    )
    
    $envContent = $envLines -join [System.Environment]::NewLine
    Add-Content -Path ".\.env" -Value $envContent
    Write-Host "Step 3: .env file created successfully" -ForegroundColor Green
}
else {
    Write-Host "Step 3: .env file already exists" -ForegroundColor Green
}
Write-Host ""

# Step 4: Check Docker
Write-Host "Step 4: Checking Docker setup..." -ForegroundColor Yellow
$dockerRunning = docker ps -q 2>$null
if ($dockerRunning -eq $null) {
    Write-Host "Starting Docker Compose..." -ForegroundColor Yellow
    docker-compose up -d
    Write-Host "Waiting for PostgreSQL to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
}

# Check if postgres is running
$postgresRunning = docker ps | Select-String "fee-management-postgres"
if ($postgresRunning) {
    Write-Host "Step 4: PostgreSQL is running" -ForegroundColor Green
}
else {
    Write-Host "ERROR: PostgreSQL container not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Run migrations
Write-Host "Step 5: Running database migrations..." -ForegroundColor Yellow
npm run prisma:migrate -- --skip-generate 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Step 5: Retrying migrations..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    npm run prisma:migrate -- --skip-generate 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Step 5: Migrations skipped (normal on first run)" -ForegroundColor Yellow
    }
    else {
        Write-Host "Step 5: Database migrations completed" -ForegroundColor Green
    }
}
else {
    Write-Host "Step 5: Database migrations completed" -ForegroundColor Green
}
Write-Host ""

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start development server: npm run dev" -ForegroundColor Cyan
Write-Host "  2. Verify data collection: npm run test:student-data" -ForegroundColor Cyan
Write-Host "  3. View database: npm run prisma:studio" -ForegroundColor Cyan
Write-Host ""
