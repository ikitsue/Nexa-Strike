const { spawn } = require('child_process');
const http = require('http');

const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006];
const requestTimeoutMs = 800;

function waitForUrl(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(url);
    });

    req.setTimeout(requestTimeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout waiting for ${url}`));
    });

    req.on('error', reject);
  });
}

async function resolveStartUrl() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    for (const port of ports) {
      const candidateUrl = `http://127.0.0.1:${port}`;
      try {
        await waitForUrl(candidateUrl);
        return candidateUrl;
      } catch {
        // continue until the dev server becomes available
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return 'http://127.0.0.1:3000';
}

async function main() {
  const startUrl = await resolveStartUrl();
  console.log(`Launching Electron at ${startUrl}`);

  const electronBinary = process.platform === 'win32' ? 'electron.cmd' : 'electron';
  const child = spawn(electronBinary, ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_START_URL: startUrl,
    },
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error('Failed to start Electron:', error);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error('Unable to start Electron:', error);
  process.exit(1);
});
