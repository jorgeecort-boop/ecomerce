# Database backup script for Ecomerce (Supabase PostgreSQL)
# Usage: .\scripts\backup-db.ps1 [-OutputDir .\backups]
# Requires DATABASE_URL in environment or .env file

param(
    [string]$OutputDir = ".\backups"
)

$ErrorActionPreference = "Stop"

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd_HH-mm-ss")
$filename = "ecomerce_backup_${timestamp}.sql"
$outputPath = Join-Path $OutputDir $filename

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$dbUrl = $env:DATABASE_URL
if (-not $dbUrl) {
    Write-Error "DATABASE_URL environment variable not set"
    exit 1
}

Write-Host "Starting database backup to $outputPath..."

& pg_dump $dbUrl `
    --no-owner `
    --no-acl `
    --format=plain `
    --verbose `
    --file=$outputPath 2>&1

if ($LASTEXITCODE -eq 0) {
    $size = (Get-Item $outputPath).Length / 1MB
    Write-Host "Backup complete: $outputPath ({0:F1} MB)" -f $size

    Get-ChildItem $OutputDir -Filter "ecomerce_backup_*.sql" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
        ForEach-Object {
            Write-Host "Cleaning up old backup: $($_.Name)"
            Remove-Item $_.FullName
        }
} else {
    Write-Error "pg_dump failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
