import paramiko
import os
import sys
import time
import io
from pathlib import Path

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

VPS_HOST = "74.208.227.87"
VPS_USER = "root"
VPS_PASS = "[REDACTED]"
VPS_PATH = "/opt/ecomerce"
DOMAIN = "ecomerce.viralreels.com"

PROJECT_DIR = Path(__file__).parent.parent

GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
RED = "\033[0;31m"
CYAN = "\033[0;36m"
NC = "\033[0m"

def print_step(msg):
    print(f"\n{YELLOW}{msg}{NC}")

def print_ok(msg):
    print(f"  {GREEN}[OK]{NC} {msg}")

def print_fail(msg):
    print(f"  {RED}[FAIL]{NC} {msg}")

def print_info(msg):
    print(f"  {CYAN}{msg}{NC}")

def connect_ssh():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30, allow_agent=False, look_for_keys=False)
    return client

def run_cmd(ssh, cmd, timeout=120):
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    exit_code = stdout.channel.recv_exit_status()
    return exit_code, out, err

def upload_file(ssh, local_path, remote_path):
    sftp = ssh.open_sftp()
    try:
        sftp.put(str(local_path), remote_path)
        return True
    except Exception as e:
        print_fail(f"Upload {local_path.name}: {e}")
        return False
    finally:
        sftp.close()

def upload_dir(sftp, local_dir, remote_dir):
    try:
        sftp.mkdir(remote_dir)
    except:
        pass
    for item in local_dir.iterdir():
        if item.name in ('node_modules', '.next', '.turbo', 'dist', '.swc'):
            continue
        remote_item = f"{remote_dir}/{item.name}"
        if item.is_dir():
            upload_dir(sftp, item, remote_item)
        else:
            try:
                sftp.put(str(item), remote_item)
            except Exception as e:
                print_fail(f"Upload {item}: {e}")

def main():
    print(f"\n{YELLOW}============================================{NC}")
    print(f"{YELLOW}   Ecomerce - Deploy Automatico a VPS{NC}")
    print(f"{YELLOW}============================================{NC}\n")

    # 1. Check files
    print_step("[1/5] Verificando archivos locales...")
    required = ["deploy.sh", ".env", "infra/docker/docker-compose.prod.yml", "package.json", "turbo.json"]
    for f in required:
        p = PROJECT_DIR / f
        if p.exists():
            print_ok(f)
        else:
            print_fail(f)
            sys.exit(1)

    # 2. Connect
    print_step("[2/5] Conectando al VPS...")
    try:
        ssh = connect_ssh()
        code, out, err = run_cmd(ssh, "echo 'Conexion exitosa' && uname -a")
        if code == 0:
            print_ok(f"Conectado a {out.strip()}")
        else:
            print_fail(f"Error: {err}")
            sys.exit(1)
    except Exception as e:
        print_fail(f"No se pudo conectar: {e}")
        sys.exit(1)

    # 3. Create directory
    print_step("[3/5] Preparando servidor...")
    run_cmd(ssh, f"mkdir -p {VPS_PATH}")
    print_ok(f"Directorio {VPS_PATH} creado")

    # Check/install Docker
    print_info("Verificando Docker...")
    code, out, _ = run_cmd(ssh, "docker --version 2>/dev/null")
    if code == 0:
        print_ok(f"Docker: {out.strip()}")
    else:
        print_info("Instalando Docker...")
        code, out, err = run_cmd(ssh, "curl -fsSL https://get.docker.com | sh", timeout=300)
        if code == 0:
            print_ok("Docker instalado")
        else:
            print_fail(f"Error instalando Docker: {err}")
            sys.exit(1)

    # 4. Upload files
    print_step("[4/5] Subiendo archivos...")
    sftp = ssh.open_sftp()

    print_info("Subiendo apps/...")
    upload_dir(sftp, PROJECT_DIR / "apps", f"{VPS_PATH}/apps")
    print_ok("apps/ subido")

    print_info("Subiendo packages/...")
    upload_dir(sftp, PROJECT_DIR / "packages", f"{VPS_PATH}/packages")
    print_ok("packages/ subido")

    print_info("Subiendo infra/...")
    upload_dir(sftp, PROJECT_DIR / "infra", f"{VPS_PATH}/infra")
    print_ok("infra/ subido")

    print_info("Subiendo scripts/...")
    upload_dir(sftp, PROJECT_DIR / "scripts", f"{VPS_PATH}/scripts")
    print_ok("scripts/ subido")

    root_files = ["package.json", "package-lock.json", "turbo.json", "tsconfig.base.json",
                   ".eslintrc.js", ".prettierrc", ".gitignore", "deploy.sh", ".env"]
    print_info("Subiendo archivos de configuracion...")
    for f in root_files:
        local = PROJECT_DIR / f
        if local.exists():
            upload_file(ssh, local, f"{VPS_PATH}/{f}")
    print_ok("Archivos de configuracion subidos")
    sftp.close()

    # Make deploy.sh executable
    run_cmd(ssh, f"chmod +x {VPS_PATH}/deploy.sh")

    # 5. Run deploy
    print_step("[5/5] Ejecutando deploy remoto...")
    print(f"\n{YELLOW}============================================{NC}")
    print(f"{YELLOW}   DEPLOY EN CURSO (esto puede tardar){NC}")
    print(f"{YELLOW}============================================{NC}\n")

    # Run deploy with auto-answers: y for SSL, domain, email
    deploy_cmd = f"""cd {VPS_PATH} && \
echo 'y' | bash deploy.sh <<EOF
y
{DOMAIN}
admin@{DOMAIN}
EOF
"""

    # Use invoke_shell for interactive deploy
    channel = ssh.invoke_shell()
    channel.settimeout(600)
    
    # Send commands
    channel.send(f"cd {VPS_PATH}\n")
    time.sleep(1)
    channel.send("chmod +x deploy.sh\n")
    time.sleep(1)
    channel.send("bash deploy.sh\n")
    
    # Read and print output in real-time
    output_buffer = ""
    deploy_done = False
    prompt_count = 0
    
    while not deploy_done:
        if channel.recv_ready():
            data = channel.recv(4096).decode('utf-8', errors='replace')
            output_buffer += data
            print(data, end='', flush=True)
            
            # Auto-respond to prompts
            if "Do you want to set up SSL" in data:
                channel.send("y\n")
                time.sleep(2)
                continue
            
            if "Enter your domain" in data:
                channel.send(f"{DOMAIN}\n")
                time.sleep(2)
                continue
            
            if "Enter your email" in data:
                channel.send(f"admin@{DOMAIN}\n")
                time.sleep(2)
                continue
            
            if "Deployment complete" in data or "DEPLOY COMPLETADO" in data.lower() or "deploy complete" in data.lower():
                deploy_done = True
                break
            
            # Check if we're back at a prompt
            if data.endswith('# ') or data.endswith('$ '):
                prompt_count += 1
                if prompt_count > 2:
                    deploy_done = True
                    break
        
        time.sleep(2)
    
    ssh.close()

    # Final
    print(f"\n{GREEN}============================================{NC}")
    print(f"{GREEN}   DEPLOY COMPLETADO{NC}")
    print(f"{GREEN}============================================{NC}\n")
    print(f"  Frontend:  https://{DOMAIN}")
    print(f"  API:       https://{DOMAIN}/api")
    print(f"  Swagger:   https://{DOMAIN}/docs")
    print(f"  Health:    https://{DOMAIN}/api/health")
    print(f"  Webhook:   https://{DOMAIN}/api/payments/webhook")
    print(f"\n{YELLOW}============================================{NC}")
    print(f"{YELLOW}   PASO FINAL: Configurar Webhook en MercadoPago{NC}")
    print(f"{YELLOW}============================================{NC}\n")
    print(f"  1. Ve a: https://www.mercadopago.com/developers/panel/app")
    print(f"  2. Selecciona tu aplicacion")
    print(f"  3. Ve a Webhooks")
    print(f"  4. Agrega webhook: Tipo=Pagos, URL=https://{DOMAIN}/api/payments/webhook")
    print()

if __name__ == "__main__":
    main()
