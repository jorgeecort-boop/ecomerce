import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('74.208.227.87', username='root', password='oATUYtokMys4oW', timeout=30, allow_agent=False, look_for_keys=False)

def run(cmd, timeout=30):
    print(f"\n>>> {cmd[:100]}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out[-2000:] if len(out) > 2000 else out)
    if err:
        print("[STDERR]", err[-500:] if len(err) > 500 else err)

# Check what's on port 80
print("=== Port 80 usage ===")
run("ss -tlnp | grep :80")

# Check web container logs
print("\n=== Web container logs ===")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml logs --tail=30 web")

# Check API container logs
print("\n=== API container logs ===")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml logs --tail=30 api")

# Check API health directly
print("\n=== API health (internal) ===")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml exec -T api curl -s http://localhost:3001/api/health")

# Check if web is accessible internally
print("\n=== Web internal ===")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml exec -T web curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/")

# Check running containers
print("\n=== All containers ===")
run("cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml ps -a")

client.close()
