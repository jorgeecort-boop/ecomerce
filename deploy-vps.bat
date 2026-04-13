@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo    Ecomerce - Deploy Automatico a VPS
echo ============================================
echo.

set VPS_HOST=74.208.227.87
set VPS_USER=root
set VPS_PASS=[REDACTED]
set VPS_PATH=/opt/ecomerce
set DOMAIN=ecomerce.viralreels.com

echo [1/6] Verificando herramientas...
echo.

where ssh >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: SSH no esta instalado. Instala OpenSSH Client desde:
    echo   Configuracion ^> Aplicaciones ^> Caracteristicas opcionales ^> OpenSSH Client
    pause
    exit /b 1
)
echo   [OK] SSH disponible

where scp >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: SCP no esta instalado.
    pause
    exit /b 1
)
echo   [OK] SCP disponible

echo.
echo [2/6] Verificando archivos locales...
echo.

if not exist "%~dp0deploy.sh" (
    echo ERROR: deploy.sh no encontrado
    pause
    exit /b 1
)
echo   [OK] deploy.sh encontrado

if not exist "%~dp0.env" (
    echo ERROR: .env no encontrado. Copia .env.example a .env y configuralo.
    pause
    exit /b 1
)
echo   [OK] .env encontrado

if not exist "%~dp0infra\docker\docker-compose.prod.yml" (
    echo ERROR: docker-compose.prod.yml no encontrado
    pause
    exit /b 1
)
echo   [OK] docker-compose.prod.yml encontrado

echo.
echo [3/6] Probando conexion al VPS...
echo.
echo Conectando a %VPS_USER%@%VPS_HOST%...
echo.
echo IMPORTANTE: Se te pedira la contrasena. Usa: %VPS_PASS%
echo.
pause

ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 %VPS_USER%@%VPS_HOST% "echo 'Conexion exitosa' && uname -a"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: No se pudo conectar al VPS.
    echo Verifica la contrasena e intenta de nuevo.
    pause
    exit /b 1
)

echo.
echo [4/6] Subiendo archivos al VPS...
echo.

echo Creando directorio remoto...
ssh %VPS_USER%@%VPS_HOST% "mkdir -p %VPS_PATH%"

echo Subiendo codigo fuente (esto puede tardar unos minutos)...
scp -r "%~dp0apps" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp -r "%~dp0packages" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp -r "%~dp0infra" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp -r "%~dp0scripts" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0package.json" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0package-lock.json" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0turbo.json" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0tsconfig.base.json" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0.eslintrc.js" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0.prettierrc" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0.gitignore" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0deploy.sh" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"
scp "%~dp0.env" "%VPS_USER%@%VPS_HOST%:%VPS_PATH%/"

echo.
echo [5/6] Configurando el servidor remoto...
echo.
echo Se te pedira la contrasena nuevamente para cada comando.
echo.

ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && chmod +x deploy.sh"
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && apt update -y && apt install -y docker.io docker-compose-plugin 2>/dev/null || curl -fsSL https://get.docker.com | sh"

echo.
echo [6/6] Ejecutando deploy en el VPS...
echo.
echo ============================================
echo   INICIANDO DEPLOY REMOTO
echo ============================================
echo.
echo El script de deploy hara lo siguiente:
echo   1. Verificar dependencias
echo   2. Construir contenedores Docker
echo   3. Iniciar servicios
echo   4. Ejecutar migraciones de BD
echo   5. Verificar salud de servicios
echo   6. Configurar SSL (opcional)
echo.
echo Se te pedira la contrasena. Luego el script preguntara:
echo   SSL? responde: y
echo   Dominio: %DOMAIN%
echo.
pause

ssh -t %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && bash deploy.sh"

echo.
echo ============================================
echo   DEPLOY COMPLETADO
echo ============================================
echo.
echo URLs:
echo   Frontend:  https://%DOMAIN%
echo   API:       https://%DOMAIN%/api
echo   Swagger:   https://%DOMAIN%/docs
echo   Health:    https://%DOMAIN%/api/health
echo   Webhook:   https://%DOMAIN%/api/payments/webhook
echo.
echo ============================================
echo   PASO FINAL: Configurar Webhook en MercadoPago
echo ============================================
echo.
echo 1. Ve a: https://www.mercadopago.com/developers/panel/app
echo 2. Selecciona tu aplicacion
echo 3. Ve a Webhooks
echo 4. Agrega un nuevo webhook:
echo    - Tipo: Pagos
echo    - URL: https://%DOMAIN%/api/payments/webhook
echo.
pause
