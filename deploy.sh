#!/bin/bash
set -e

echo "🚀 Ecomerce Deploy Script"
echo "========================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# ─── 1. Check prerequisites ──────────────────────────────────
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required. Install with: curl -fsSL https://get.docker.com | sh${NC}"; exit 1; }

# Support both docker compose v2 (plugin) and docker-compose v1 (standalone)
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}Docker Compose is required. Install with: apt install docker-compose-plugin${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"
echo -e "${GREEN}✅ Docker Compose: $($DOCKER_COMPOSE version)${NC}"

COMPOSE_FILE="infra/docker/docker-compose.prod.yml"

# ─── 2. Create directories ────────────────────────────────────
echo -e "\n${YELLOW}📁 Creating directories...${NC}"
mkdir -p infra/certbot/conf
mkdir -p infra/certbot/www
mkdir -p infra/nginx/conf.d

# ─── 3. Check .env file ──────────────────────────────────────
echo -e "\n${YELLOW}🔐 Checking .env file...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}.env file not found. Copy .env.example to .env and fill in the values.${NC}"
    exit 1
fi

# Check required variables
required_vars=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET" "MERCADOPAGO_ACCESS_TOKEN" "MERCADOPAGO_PUBLIC_KEY")
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=\"\"" .env || grep -q "^${var}=''" .env; then
        echo -e "${RED}Missing or empty required variable: ${var}${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ Environment variables OK${NC}"

# ─── 4. Build and start containers ────────────────────────────
echo -e "\n${YELLOW}🏗️  Building containers...${NC}"
$DOCKER_COMPOSE -f $COMPOSE_FILE build --no-cache

echo -e "\n${YELLOW}🚀 Starting services...${NC}"
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d

# ─── 5. Run database migrations ───────────────────────────────
echo -e "\n${YELLOW}🗄️  Running database migrations...${NC}"

# Wait for PostgreSQL to be healthy
echo "Waiting for database to be ready..."
for i in $(seq 1 30); do
    if $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T postgres pg_isready -U ecomerce >/dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}Database failed to start within timeout${NC}"
        $DOCKER_COMPOSE -f $COMPOSE_FILE logs postgres
        exit 1
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

$DOCKER_COMPOSE -f $COMPOSE_FILE exec -T api npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma

# ─── 6. Check health ──────────────────────────────────────────
echo -e "\n${YELLOW}💚 Checking service health...${NC}"
sleep 5

services=("postgres" "redis" "api" "web" "nginx")
for service in "${services[@]}"; do
    if $DOCKER_COMPOSE -f $COMPOSE_FILE ps "$service" | grep -q "Up"; then
        echo -e "${GREEN}✅ $service is running${NC}"
    else
        echo -e "${RED}❌ $service is NOT running${NC}"
        $DOCKER_COMPOSE -f $COMPOSE_FILE logs "$service" | tail -20
    fi
done

# ─── 7. Setup SSL (optional) ─────────────────────────────────
echo -e "\n${YELLOW}🔒 Setting up SSL with Let's Encrypt...${NC}"
read -p "Do you want to set up SSL? (y/n): " setup_ssl
if [ "$setup_ssl" = "y" ]; then
    read -p "Enter your domain (e.g., ecomerce.viralreels.com): " domain
    read -p "Enter your email for SSL (e.g., admin@$domain): " email

    echo -e "\n${YELLOW}Step 1: Getting SSL certificate...${NC}"

    # Stop nginx temporarily
    $DOCKER_COMPOSE -f $COMPOSE_FILE stop nginx

    # Get SSL certificate
    $DOCKER_COMPOSE -f $COMPOSE_FILE run --rm certbot certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$email" \
        --agree-tos \
        --no-eff-email \
        -d "$domain"

    echo -e "${GREEN}✅ SSL certificate obtained${NC}"

    echo -e "\n${YELLOW}Step 2: Configuring nginx for HTTPS...${NC}"

    # Create nginx SSL config
    cat > infra/nginx/conf.d/default.conf << NGINX_EOF
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name $domain;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl;
    server_name $domain;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend
    location / {
        limit_req zone=web_limit burst=20 nodelay;
        proxy_pass http://web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # API
    location /api {
        limit_req zone=api_limit burst=10 nodelay;
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    # Swagger docs
    location /docs {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Swagger JSON
    location /docs-json {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX_EOF

    echo -e "${GREEN}✅ Nginx configured for HTTPS${NC}"

    # Restart nginx
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d nginx

    echo -e "\n${GREEN}🔒 SSL is now active for $domain${NC}"
fi

# ─── 8. Done ──────────────────────────────────────────────────
echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo -e "📍 Frontend:  https://ecomerce.viralreels.com"
echo -e "📍 API:       https://ecomerce.viralreels.com/api"
echo -e "📍 Swagger:   https://ecomerce.viralreels.com/docs"
echo -e "📍 Health:    https://ecomerce.viralreels.com/api/health"
echo -e "📍 Webhook MP: https://ecomerce.viralreels.com/api/payments/webhook"
echo -e "\n📝 Useful commands:"
echo -e "   View logs:        $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
echo -e "   Restart:          $DOCKER_COMPOSE -f $COMPOSE_FILE restart"
echo -e "   Stop:             $DOCKER_COMPOSE -f $COMPOSE_FILE down"
echo -e "   Update:           git pull && bash deploy.sh"
echo -e "   DB migrations:    $DOCKER_COMPOSE -f $COMPOSE_FILE exec api npx prisma migrate deploy"
