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
print("  REINICIAR NGINX")
print("=" * 60)

# Check port 80 is free
print("\n[1] Checking port 80...")
run("ss -tlnp | grep ':80 '")

# Restart nginx
print("\n[2] Restarting nginx container...")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml restart nginx", timeout=30)

# Wait
print("\n[3] Waiting...")
time.sleep(5)

# Check status
print("\n[4] Container status:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml ps", timeout=15)

# Test HTTP
print("\n[5] Testing HTTP on port 80...")
run("curl -s -o /dev/null -w 'HTTP %{http_code}\\n' http://localhost:80/ 2>&1", timeout=15)

# Test API through nginx
print("\n[6] Testing API through nginx...")
run("curl -s http://localhost:80/api/health 2>&1", timeout=15)

# Test Web through nginx
print("\n[7] Testing Web through nginx...")
run("curl -s -o /dev/null -w 'HTTP %{http_code}\\n' http://localhost:80/ 2>&1", timeout=15)

# Nginx logs
print("\n[8] Nginx logs:")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml logs --tail=10 nginx", timeout=15)

# Check nginx config
print("\n[9] Nginx config files:")
run("ls -la /opt/ecomerce/infra/nginx/conf.d/ 2>&1", timeout=5)
run("cat /opt/ecomerce/infra/nginx/conf.d/*.conf 2>&1 | head -50", timeout=5)

client.close()
print("\n" + "=" * 60)
print("  DONE")
print("=" * 60)
