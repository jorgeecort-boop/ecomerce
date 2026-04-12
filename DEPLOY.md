# 🚀 Guía de Deploy - Ecomerce en VPS IONOS

## Prerrequisitos en el VPS

### 1. Conectar al VPS por SSH

```bash
ssh root@74.208.227.87
```

### 2. Instalar dependencias en el servidor

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Git
apt install -y git

# Instalar Node.js (para migraciones)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar instalación
docker --version
docker compose version
node --version
```

### 3. Clonar el repositorio

```bash
mkdir -p /opt/ecomerce
cd /opt/ecomerce
git clone <tu-repo-url> .
# O si no tienes repo, sube los archivos con scp/rsync
```

### 4. Configurar variables de ambiente

```bash
cp .env.production .env
nano .env
```

**Variables CRÍTICAS a cambiar:**

```bash
# Generar secretos seguros:
openssl rand -hex 64  # Para JWT_SECRET
openssl rand -hex 64  # Para JWT_REFRESH_SECRET
openssl rand -hex 32  # Para POSTGRES_PASSWORD
openssl rand -hex 32  # Para REDIS_PASSWORD
```

### 5. Configurar Stripe para producción

1. Ve a https://dashboard.stripe.com/apikeys
2. Cambia las claves de `sk_test_` a `sk_live_`
3. Actualiza el `.env` con las claves live

### 6. Ejecutar el deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

### 7. Configurar SSL con Let's Encrypt

El script te preguntará si quieres SSL. Responde `y` e ingresa tu dominio:

```
ecomerce.virareels.com
```

### 8. Configurar DNS

En tu panel de IONOS:

1. Ve a **Domains → DNS**
2. Asegúrate de que `ecomerce.virareels.com` apunte a `74.208.227.87`
3. Espera la propagación (puede tardar hasta 24h)

---

## Comandos Útiles

### Ver logs

```bash
docker compose -f infra/docker/docker-compose.prod.yml logs -f
```

### Ver logs de un servicio específico

```bash
docker compose -f infra/docker/docker-compose.prod.yml logs -f api
docker compose -f infra/docker/docker-compose.prod.yml logs -f web
docker compose -f infra/docker/docker-compose.prod.yml logs -f nginx
```

### Reiniciar servicios

```bash
docker compose -f infra/docker/docker-compose.prod.yml restart
```

### Detener todo

```bash
docker compose -f infra/docker/docker-compose.prod.yml down
```

### Actualizar la app

```bash
cd /opt/ecomerce
git pull
./deploy.sh
```

### Ver estado de servicios

```bash
docker compose -f infra/docker/docker-compose.prod.yml ps
```

### Ejecutar migraciones manualmente

```bash
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma
```

---

## Estructura de Servicios

| Servicio      | Puerto Interno | Puerto Externo | Descripción                         |
| ------------- | -------------- | -------------- | ----------------------------------- |
| PostgreSQL    | 5432           | 5432           | Base de datos                       |
| Redis         | 6379           | 6379           | Cache y sesiones                    |
| API (NestJS)  | 3001           | -              | Backend (solo accesible via nginx)  |
| Web (Next.js) | 3000           | -              | Frontend (solo accesible via nginx) |
| Nginx         | 80/443         | 80/443         | Reverse proxy + SSL                 |

---

## Troubleshooting

### La API no conecta a la base de datos

```bash
# Verificar que PostgreSQL está corriendo
docker compose -f infra/docker/docker-compose.prod.yml exec postgres pg_isready -U ecomerce

# Ver logs de la API
docker compose -f infra/docker/docker-compose.prod.yml logs api
```

### El frontend no carga

```bash
# Ver logs de Next.js
docker compose -f infra/docker/docker-compose.prod.yml logs web

# Ver logs de Nginx
docker compose -f infra/docker/docker-compose.prod.yml logs nginx
```

### SSL no funciona

```bash
# Verificar certificado
docker compose -f infra/docker/docker-compose.prod.yml exec certbot certbot certificates

# Renovar certificado
docker compose -f infra/docker/docker-compose.prod.yml exec certbot certbot renew
```

### Puerto ya en uso

```bash
# Ver qué proceso usa el puerto
lsof -i :80
lsof -i :443

# Detener el proceso
kill -9 <PID>
```
