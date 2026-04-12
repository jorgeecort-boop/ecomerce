import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('74.208.227.87', username='root', password='oATUYtokMys4oW', timeout=30, allow_agent=False, look_for_keys=False)

print("=== Docker ps ===")
_, stdout, stderr = client.exec_command('cd /opt/ecomerce && docker compose -f infra/docker/docker-compose.prod.yml ps -a', timeout=30)
print(stdout.read().decode())

print("\n=== Docker images ===")
_, stdout, stderr = client.exec_command('docker images | head -20', timeout=10)
print(stdout.read().decode())

print("\n=== Files in /opt/ecomerce ===")
_, stdout, stderr = client.exec_command('ls -la /opt/ecomerce/', timeout=10)
print(stdout.read().decode())

print("\n=== Docker logs (last 30 lines) ===")
_, stdout, stderr = client.exec_command('docker compose -f infra/docker/docker-compose.prod.yml logs --tail=30 2>&1', timeout=30)
print(stdout.read().decode())

client.close()
