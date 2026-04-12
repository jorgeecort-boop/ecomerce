import paramiko
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

VPS_HOST = "74.208.227.87"
VPS_USER = "root"
VPS_PASS = "oATUYtokMys4oW"
VPS_PATH = "/opt/ecomerce"
DOMAIN = "ecomerce.viralreels.com"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=300):
    print(f"\n>>> {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(out[-3000:] if len(out) > 3000 else out)
    if err:
        print("[STDERR]", err[-1000:] if len(err) > 1000 else err)
    return exit_code

print("=" * 60)
print("  DEPLOY ECOMERCE - PASO A PASO")
print("=" * 60)

# 1. Install Node.js for npm ci
run("which node || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs)", timeout=120)

# 2. npm ci to install deps
run(f"cd {VPS_PATH} && npm ci", timeout=300)

# 3. Build
run(f"cd {VPS_PATH} && npm run build", timeout=300)

# 4. Generate Prisma client
run(f"cd {VPS_PATH} && npm run db:generate", timeout=60)

# 5. Start containers
run(f"cd {VPS_PATH} && docker compose -f infra/docker/docker-compose.prod.yml up -d --build", timeout=300)

# 6. Wait for DB
print("\nWaiting for PostgreSQL...")
for i in range(30):
    code, _, _ = run(f"docker compose -f infra/docker/docker-compose.prod.yml exec -T postgres pg_isready -U ecomerce", timeout=10)
    if code == 0:
        print("DB is ready!")
        break
    time.sleep(2)

# 7. Run migrations
run(f"cd {VPS_PATH} && docker compose -f infra/docker/docker-compose.prod.yml exec -T api npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma", timeout=120)

# 8. Check status
run(f"cd {VPS_PATH} && docker compose -f infra/docker/docker-compose.prod.yml ps", timeout=15)

# 9. Check health
time.sleep(10)
run("curl -s http://localhost:3001/api/health 2>&1 || echo 'Health endpoint not yet available'", timeout=15)

client.close()

print("\n" + "=" * 60)
print("  DEPLOY COMPLETADO")
print("=" * 60)
print(f"\n  URLs:")
print(f"  API:       http://{VPS_HOST}:3001/api")
print(f"  Health:    http://{VPS_HOST}:3001/api/health")
print(f"  Swagger:   http://{VPS_HOST}:3001/docs")
print(f"\n  Para configurar SSL y Nginx, ejecuta:")
print(f"  ssh root@{VPS_HOST}")
print(f"  cd {VPS_PATH}")
print(f"  # Configura nginx conf.d/default.conf con el dominio {DOMAIN}")
print(f"  # Luego: docker compose -f infra/docker/docker-compose.prod.yml restart nginx")
