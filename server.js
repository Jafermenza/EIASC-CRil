require('dotenv/config');

const path = require('node:path');
const { spawn } = require('node:child_process');

const root = __dirname;
const apiPort = String(process.env.API_PORT || '4000');
const passengerPort = String(process.env.PORT || '3000');
const standaloneRoot = path.join(root, 'apps', 'web', '.next', 'standalone');
const webServer = path.join(standaloneRoot, 'apps', 'web', 'server.js');

function start(name, command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd || root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ...options.env,
    },
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error(`[Passenger] ${name} failed to start:`, error);
    process.exitCode = 1;
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[Passenger] ${name} exited from signal ${signal}`);
    } else {
      console.error(`[Passenger] ${name} exited with code ${code}`);
    }
    process.exit(code ?? 1);
  });

  return child;
}

if (!require('node:fs').existsSync(webServer)) {
  throw new Error(`Next standalone server not found: ${webServer}`);
}

const api = start(
  'API',
  process.execPath,
  [path.join(root, 'apps', 'api', 'dist', 'main.js')],
  { env: { API_PORT: apiPort } },
);

const web = start(
  'Web',
  process.execPath,
  [path.relative(standaloneRoot, webServer)],
  {
    cwd: standaloneRoot,
    env: {
      PORT: passengerPort,
      HOSTNAME: '0.0.0.0',
    },
  },
);

function shutdown(signal) {
  console.log(`[Passenger] received ${signal}; stopping child processes`);
  api.kill('SIGTERM');
  web.kill('SIGTERM');
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
