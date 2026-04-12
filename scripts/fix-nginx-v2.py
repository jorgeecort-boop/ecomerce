import paramiko
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('74.208.227.87', username='root', password='[REDACTED]', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=30):
    print(f"\n>>> {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out)
    if err:
        print("[STDERR]", err)

print("=" * 60)
print("  FIX NGINX - HTTP TEMPORAL")
print("=" * 60)

# Upload HTTP-only config
print("\n[1] Uploading HTTP-only nginx config...")
sftp = client.open_sftp()
with open(r"C:\Users\quant\OneDrive\Desktop\Ecomerce\infra\nginx\conf.d\default.conf", 'r') as f:
    content = f.read()
sftp.putfo(io.BytesIO(content.encode()), '/opt/ecomerce/infra/nginx/conf.d/default.conf')

# Remove the SSL config that's causing the crash
print("\n[2] Removing SSL-only config...")
sftp.remove('/opt/ecomerce/infra/nginx/conf.d/ecomerce.conf')
sftp.close()
print("  Removed ecomerce.conf (SSL config without certs)")

# Restart nginx
print("\n[3] Restarting nginx...")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml restart nginx", timeout=30)

time.sleep(5)

# Check status
print("\n[4] Status:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml ps", timeout=15)

# Test
print("\n[5] Test HTTP port 80:")
run("curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:80/ 2>&1", timeout=15)

print("\n[6] Test API through nginx:")
run("curl -s http://localhost:80/api/health 2>&1", timeout=15)

print("\n[7] Nginx logs:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml logs --tail=10 nginx", timeout=15)

client.close()

print("\n" + "=" * 60)
print("  DONE")
print("=" * 60)
