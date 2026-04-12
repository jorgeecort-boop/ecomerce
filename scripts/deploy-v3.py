import paramiko
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

VPS_HOST = "74.208.227.87"
VPS_USER = "root"
VPS_PASS = "oATUYtokMys4oW"
VPS_PATH = "/opt/ecomerce"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30, allow_agent=False, look_for_keys=False)

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
    return exit_code, out, err

def upload_content(local_path, remote_path):
    sftp = client.open_sftp()
    with open(local_path, 'r') as f:
        content = f.read()
    sftp.putfo(io.BytesIO(content.encode()), remote_path)
    sftp.close()
    print(f"  Uploaded: {remote_path}")

print("=" * 60)
print("  DEPLOY ECOMERCE - DOCKERFILES SIMPLIFICADOS")
print("=" * 60)

# Upload fixed Dockerfiles
print("\n[1] Uploading simplified Dockerfiles...")
upload_content(r"C:\Users\quant\OneDrive\Desktop\Ecomerce\infra\docker\Dockerfile.api", f"{VPS_PATH}/infra/docker/Dockerfile.api")
upload_content(r"C:\Users\quant\OneDrive\Desktop\Ecomerce\infra\docker\Dockerfile.web", f"{VPS_PATH}/infra/docker/Dockerfile.web")

# Remove old version and volumes
print("\n[2] Cleaning up...")
run(f"cd {VPS_PATH} && docker compose -f infra/docker/docker-compose.prod.yml down -v 2>/dev/null", timeout=30)
run("docker system prune -f 2>/dev/null", timeout=30)

# Build and start
print("\n[3] Building containers (this takes 5-10 minutes)...")
run(f"cd {VPS_PATH} && docker compose -f infra/docker/docker-compose.prod.yml up -d --build", timeout=600)

# Wait for DB
print("\n[4] Waiting for PostgreSQL...")
for i in range(60):
    code, _, _ = run(f"cd {VPS_PATH} && docker compose -f infra/docker/docker-compose.prod.yml exec -T postgres pg_isready -U ecomerce", timeout=10)
    if code == 0:
        print("DB is ready!")
        break
    time.sleep(2)

# Run migrations
print("\n[5] Running migrations...")
run(f"cd {VPS_PATH} && docker compose -f infra/docker/docker-compose.prod.yml exec -T api npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma", timeout=120)

# Check status
print("\n[6] Container status:")
run(f"cd {VPS_PATH} && docker compose -f infra/docker/docker-compose.prod.yml ps", timeout=15)

# Check health
print("\n[7] Health check...")
time.sleep(15)
run("curl -s http://localhost:3001/api/health 2>&1 || echo 'Not ready yet'", timeout=15)

# Check web
run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>&1 || echo 'Web not ready'", timeout=15)

client.close()

print("\n" + "=" * 60)
print("  DEPLOY COMPLETADO")
print("=" * 60)
