const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pidFile = path.join(__dirname, '..', '.playwright-server.pid');

module.exports = async () => {
  if (process.env.BASE_URL || !fs.existsSync(pidFile)) return;

  const pid = fs.readFileSync(pidFile, 'utf8').trim();
  if (pid) {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', pid, '/T', '/F'], { stdio: 'ignore' });
    } else {
      try {
        process.kill(Number(pid), 'SIGTERM');
      } catch {}
    }
  }

  fs.rmSync(pidFile, { force: true });
};
