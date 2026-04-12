import paramiko
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('74.208.227.87', username='root', password='[REDACTED]', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=300):
    print(f"\n>>> {cmd[:120]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    if out:
        print(out[-2000:] if len(out) > 2000 else out)
    if err:
        print("[STDERR]", err[-500:] if len(err) > 500 else err)
    return exit_code

def upload(local, remote):
    sftp = client.open_sftp()
    with open(local, 'r') as f:
        sftp.putfo(io.BytesIO(f.read().encode()), remote)
    sftp.close()
    print(f"  Uploaded: {remote}")

print("=" * 60)
print("  FIX: node:20-slim + fix nginx port conflict")
print("=" * 60)

# Upload Dockerfiles
upload(r"C:\Users\quant\OneDrive\Desktop\Ecomerce\infra\docker\Dockerfile.api", "/opt/ecomerce/infra/docker/Dockerfile.api")
upload(r"C:\Users\quant\OneDrive\Desktop\Ecomerce\infra\docker\Dockerfile.web", "/opt/ecomerce/infra/docker/Dockerfile.web")

# Stop everything
print("\n[1] Stopping all containers...")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml down -v", timeout=30)

# Stop host nginx that's blocking port 80
print("\n[2] Stopping host nginx...")
run("systemctl stop nginx 2>/dev/null || service nginx stop 2>/dev/null || true", timeout=15)
run("ss -tlnp | grep :80", timeout=5)

# Rebuild and start
print("\n[3] Rebuilding with node:20-slim...")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml up -d --build", timeout=600)

# Wait for DB
print("\n[4] Waiting for PostgreSQL...")
for i in range(30):
    code = run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml exec -T postgres pg_isready -U ecomerce", timeout=10)
    if code == 0:
        print("DB ready!")
        break
    time.sleep(2)

# Migrate
print("\n[5] Running migrations...")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml exec -T api npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma", timeout=120)

# Status
print("\n[6] Status:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml ps", timeout=15)

# Wait and check health
print("\n[7] Waiting for API to start...")
time.sleep(15)
run("curl -s http://localhost:3001/api/health 2>&1 || echo 'API not ready'", timeout=15)
run("curl -s -o /dev/null -w 'Web: %{http_code}' http://localhost:3000/ 2>&1 || echo 'Web not ready'", timeout=15)

# Logs
print("\n[8] API logs:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml logs --tail=20 api", timeout=15)

print("\n[9] Web logs:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml logs --tail=20 web", timeout=15)

client.close()
print("\nDone!")
