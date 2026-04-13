$ErrorActionPreference = "Stop"

$VPS_HOST = "74.208.227.87"
$VPS_USER = "root"
$VPS_PASS = "oATUYtokMys4oW"
$VPS_PATH = "/opt/ecomerce"
$DOMAIN = "ecomerce.viralreels.com"
$PROJECT_DIR = $PSScriptRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "   Ecomerce - Deploy a VPS" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# 1. Check tools
Write-Host "[1/4] Verificando herramientas..." -ForegroundColor Yellow
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: SSH no encontrado. Instala OpenSSH Client." -ForegroundColor Red
    Write-Host "  Settings > Apps > Optional Features > OpenSSH Client" -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] SSH" -ForegroundColor Green

# 2. Check files
Write-Host ""
Write-Host "[2/4] Verificando archivos..." -ForegroundColor Yellow
$requiredFiles = @("deploy.sh", ".env", "infra\docker\docker-compose.prod.yml", "package.json", "turbo.json")
foreach ($f in $requiredFiles) {
    if (Test-Path (Join-Path $PROJECT_DIR $f)) {
        Write-Host "  [OK] $f" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $f" -ForegroundColor Red
        exit 1
    }
}

# 3. Upload files
Write-Host ""
Write-Host "[3/4] Subiendo archivos al VPS..." -ForegroundColor Yellow
Write-Host "  Se te pedira la contrasena varias veces. Usa: $VPS_PASS" -ForegroundColor Yellow
Write-Host ""

$env:SSH_ASKPASS = ""

function Run-SSH {
    param([string]$Command)
    Write-Host "  > $Command" -ForegroundColor Gray
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$VPS_USER@$VPS_HOST" $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR en comando SSH" -ForegroundColor Red
        return $false
    }
    return $true
}

function Run-SCP {
    param([string]$Local, [string]$Remote)
    Write-Host "  > scp $Local -> $Remote" -ForegroundColor Gray
    scp -o StrictHostKeyChecking=no -r $Local "$VPS_USER@$VPS_HOST`:$Remote"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR en SCP" -ForegroundColor Red
        return $false
    }
    return $true
}

# Create remote directory
Write-Host "  Creando directorio remoto..." -ForegroundColor Cyan
Run-SSH "mkdir -p $VPS_PATH"

# Upload directories
Write-Host "  Subiendo apps/..." -ForegroundColor Cyan
Run-SCP "$PROJECT_DIR\apps" "$VPS_PATH/"
Write-Host "  Subiendo packages/..." -ForegroundColor Cyan
Run-SCP "$PROJECT_DIR\packages" "$VPS_PATH/"
Write-Host "  Subiendo infra/..." -ForegroundColor Cyan
Run-SCP "$PROJECT_DIR\infra" "$VPS_PATH/"
Write-Host "  Subiendo scripts/..." -ForegroundColor Cyan
Run-SCP "$PROJECT_DIR\scripts" "$VPS_PATH/"

# Upload root files
Write-Host "  Subiendo archivos de configuracion..." -ForegroundColor Cyan
$rootFiles = @("package.json", "package-lock.json", "turbo.json", "tsconfig.base.json", ".eslintrc.js", ".prettierrc", ".gitignore", "deploy.sh", ".env")
foreach ($f in $rootFiles) {
    $localPath = Join-Path $PROJECT_DIR $f
    if (Test-Path $localPath) {
        Run-SCP $localPath "$VPS_PATH/"
    }
}

# 4. Run deploy
Write-Host ""
Write-Host "[4/4] Ejecutando deploy remoto..." -ForegroundColor Yellow
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "  Cuando pregunte SSL responde: y" -ForegroundColor Cyan
Write-Host "  Dominio: $DOMAIN" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

ssh -o StrictHostKeyChecking=no -t "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && chmod +x deploy.sh && bash deploy.sh"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  https://$DOMAIN" -ForegroundColor White
Write-Host "  API:       https://$DOMAIN/api" -ForegroundColor White
Write-Host "  Swagger:   https://$DOMAIN/docs" -ForegroundColor White
Write-Host "  Health:    https://$DOMAIN/api/health" -ForegroundColor White
Write-Host "  Webhook:   https://$DOMAIN/api/payments/webhook" -ForegroundColor White
Write-Host ""
Write-Host "PASO FINAL - Configurar Webhook en MercadoPago:" -ForegroundColor Yellow
Write-Host "  1. Ve a: https://www.mercadopago.com/developers/panel/app" -ForegroundColor White
Write-Host "  2. Selecciona tu aplicacion" -ForegroundColor White
Write-Host "  3. Ve a Webhooks" -ForegroundColor White
Write-Host "  4. Agrega webhook: Tipo=Pagos, URL=https://$DOMAIN/api/payments/webhook" -ForegroundColor White
Write-Host ""
