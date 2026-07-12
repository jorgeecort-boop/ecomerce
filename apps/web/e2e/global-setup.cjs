const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const pidFile = path.join(appRoot, '.playwright-server.pid');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function isReady() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (await isReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

module.exports = async () => {
  if (process.env.BASE_URL) return;
  if (await isReady()) return;

  if (fs.existsSync(pidFile)) {
    const oldPid = fs.readFileSync(pidFile, 'utf8').trim();
    if (oldPid && process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', oldPid, '/T', '/F'], { stdio: 'ignore' });
    }
    fs.rmSync(pidFile, { force: true });
  }

  process.env.NEXT_PUBLIC_API_URL ??= 'https://ecomerce-api-zulc.onrender.com/api';

  const nextBin = path.resolve(appRoot, '../../node_modules/next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, 'dev'], {
    cwd: appRoot,
    detached: true,
    env: process.env,
    stdio: 'ignore',
  });

  fs.writeFileSync(pidFile, String(child.pid));
  child.unref();

  await waitForServer();
};
