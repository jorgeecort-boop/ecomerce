import paramiko
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('74.208.227.87', username='root', password='oATUYtokMys4oW', timeout=30, allow_agent=False, look_for_keys=False)

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
print("  FIX: Web WORKDIR + rebuild web only")
print("=" * 60)

upload(r"C:\Users\quant\OneDrive\Desktop\Ecomerce\infra\docker\Dockerfile.web", "/opt/ecomerce/infra/docker/Dockerfile.web")

# Rebuild only web
print("\n[1] Rebuilding web container...")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml up -d --build web", timeout=300)

# Wait
print("\n[2] Waiting for web to start...")
time.sleep(15)

# Check status
print("\n[3] Status:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml ps", timeout=15)

# Test API
print("\n[4] API health:")
run("curl -s http://localhost:3001/api/health 2>&1", timeout=15)

# Test Web
print("\n[5] Web test:")
run("curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000/ 2>&1", timeout=15)

# Web logs
print("\n[6] Web logs:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml logs --tail=15 web", timeout=15)

# Verify .next exists
print("\n[7] Checking .next directory:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml exec -T web ls -la /app/apps/web/.next/ 2>&1 | head -20", timeout=15)

client.close()
print("\nDone!")
