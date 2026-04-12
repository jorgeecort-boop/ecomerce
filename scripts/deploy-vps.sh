#!/bin/bash
set -e

# ============================================
# Ecomerce - Deploy Automatico a VPS
# ============================================

VPS_HOST="74.208.227.87"
VPS_USER="root"
VPS_PASS="oATUYtokMys4oW"
VPS_PATH="/opt/ecomerce"
DOMAIN="ecomerce.viralreels.com"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${YELLOW}============================================${NC}"
echo -e "   Ecomerce - Deploy Automatico a VPS"
echo -e "${YELLOW}============================================${NC}\n"

# Detect project root (parent of scripts dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# ─── 1. Check tools ─────────────────────────────────────────
echo -e "${YELLOW}[1/5] Verificando herramientas...${NC}"

command -v ssh >/dev/null 2>&1 || { echo -e "${RED}SSH no encontrado. Instala openssh-client.${NC}"; exit 1; }
echo -e "${GREEN}  [OK] SSH${NC}"

command -v scp >/dev/null 2>&1 || { echo -e "${RED}SCP no encontrado.${NC}"; exit 1; }
echo -e "${GREEN}  [OK] SCP${NC}"

# Check if sshpass is available for non-interactive auth
USE_SSHPASS=false
if command -v sshpass >/dev/null 2>&1; then
    USE_SSHPASS=true
    echo -e "${GREEN}  [OK] sshpass (auth automatica)${NC}"
else
    echo -e "${YELLOW}  [!] sshpass no disponible. Se pedira contrasena manualmente.${NC}"
    echo -e "${YELLOW}      Install: apt install sshpass (Linux) o brew install hudochenkov/sshpass/sshpass (Mac)${NC}"
fi

SSH_CMD="ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15"
SCP_CMD="scp -o StrictHostKeyChecking=no"

if [ "$USE_SSHPASS" = true ]; then
    SSH_CMD="sshpass -p '$VPS_PASS' $SSH_CMD"
    SCP_CMD="sshpass -p '$VPS_PASS' $SCP_CMD"
fi

# ─── 2. Check local files ──────────────────────────────────
echo -e "\n${YELLOW}[2/5] Verificando archivos locales...${NC}"

for file in deploy.sh .env infra/docker/docker-compose.prod.yml package.json turbo.json; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        echo -e "${GREEN}  [OK] $file${NC}"
    else
        echo -e "${RED}  [FAIL] $file no encontrado${NC}"
        exit 1
    fi
done

# ─── 3. Test connection ────────────────────────────────────
echo -e "\n${YELLOW}[3/5] Probando conexion al VPS ($VPS_HOST)...${NC}"

if [ "$USE_SSHPASS" = true ]; then
    RESULT=$(sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$VPS_USER@$VPS_HOST" "echo 'Conexion exitosa' && uname -a" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  $RESULT${NC}"
    else
        echo -e "${RED}  ERROR: No se pudo conectar. Verifica la contrasena.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}  Se te pedira la contrasena: $VPS_PASS${NC}"
    read -p "  Presiona Enter para continuar..."
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 "$VPS_USER@$VPS_HOST" "echo 'Conexion exitosa' && uname -a"
    if [ $? -ne 0 ]; then
        echo -e "${RED}  ERROR: No se pudo conectar.${NC}"
        exit 1
    fi
fi

# ─── 4. Upload files ───────────────────────────────────────
echo -e "\n${YELLOW}[4/5] Subiendo archivos al VPS...${NC}"

echo -e "  Creando directorio..."
eval $SSH_CMD "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_PATH"

echo -e "  Subiendo codigo (esto puede tardar)..."

# Upload directories
eval $SCP_CMD -r "$PROJECT_DIR/apps" "$VPS_USER@$VPS_HOST:$VPS_PATH/"
eval $SCP_CMD -r "$PROJECT_DIR/packages" "$VPS_USER@$VPS_HOST:$VPS_PATH/"
eval $SCP_CMD -r "$PROJECT_DIR/infra" "$VPS_USER@$VPS_HOST:$VPS_PATH/"
eval $SCP_CMD -r "$PROJECT_DIR/scripts" "$VPS_USER@$VPS_HOST:$VPS_PATH/"

# Upload root files
for file in package.json package-lock.json turbo.json tsconfig.base.json .eslintrc.js .prettierrc .gitignore deploy.sh .env; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        eval $SCP_CMD "$PROJECT_DIR/$file" "$VPS_USER@$VPS_HOST:$VPS_PATH/"
    fi
done

echo -e "${GREEN}  Archivos subidos correctamente${NC}"

# ─── 5. Deploy ─────────────────────────────────────────────
echo -e "\n${YELLOW}[5/5] Ejecutando deploy en el VPS...${NC}"
echo -e "${YELLOW}============================================${NC}"

if [ "$USE_SSHPASS" = true ]; then
    sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no -t "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && bash deploy.sh"
else
    echo -e "${YELLOW}  Se te pedira la contrasena. Luego el script preguntara:${NC}"
    echo -e "    SSL? responde: y"
    echo -e "    Dominio: $DOMAIN"
    echo -e "    Email: admin@$DOMAIN"
    echo ""
    read -p "  Presiona Enter para iniciar deploy remoto..."
    ssh -o StrictHostKeyChecking=no -t "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && bash deploy.sh"
fi

# ─── Done ──────────────────────────────────────────────────
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}   DEPLOY COMPLETADO${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e ""
echo -e "  Frontend:  https://$DOMAIN"
echo -e "  API:       https://$DOMAIN/api"
echo -e "  Swagger:   https://$DOMAIN/docs"
echo -e "  Health:    https://$DOMAIN/api/health"
echo -e "  Webhook:   https://$DOMAIN/api/payments/webhook"
echo -e ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}   PASO FINAL: Configurar Webhook en MercadoPago${NC}"
echo -e "${YELLOW}============================================${NC}"
echo -e ""
echo -e "  1. Ve a: https://www.mercadopago.com/developers/panel/app"
echo -e "  2. Selecciona tu aplicacion"
echo -e "  3. Ve a Webhooks"
echo -e "  4. Agrega un nuevo webhook:"
echo -e "     - Tipo: Pagos"
echo -e "     - URL: https://$DOMAIN/api/payments/webhook"
echo -e ""
