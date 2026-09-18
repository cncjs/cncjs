const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcrypt-nodejs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(REPO_ROOT, 'bin', 'cncjs');
const BUILT_SERVER = path.join(REPO_ROOT, 'dist', 'cncjs', 'server-cli.js');

// The API gate is bypassed outright when NODE_ENV=development, so this tier
// runs the built server in production mode rather than the dev one. That means
// it needs `yarn build-prod` first, exactly like the Electron tier.
const hasBuild = () => fs.existsSync(BUILT_SERVER);

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.on('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});

const sleep = (ms) => new Promise(resolve => {
  setTimeout(resolve, ms);
});

const answering = async (baseUrl) => {
  try {
    const res = await fetch(`${baseUrl}/api/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    return res.status > 0;
  } catch (e) {
    return false;
  }
};

/**
 * Start a production server holding the given accounts.
 *
 * Accounts are `{ id, name, password, enabled }` with the password in clear;
 * it is hashed here the way the settings UI would store it. Each server gets
 * its own config file so tests never touch the developer's own `~/.cncrc`.
 */
const startServer = async (accounts) => {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cncjs-auth-'));
  const configFile = path.join(dir, 'test.cncrc');

  fs.writeFileSync(configFile, JSON.stringify({
    users: accounts.map(account => ({
      ...account,
      password: bcrypt.hashSync(account.password),
    })),
  }, null, 2));

  const child = spawn(process.execPath, [CLI, '--port', String(port), '-c', configFile], {
    cwd: REPO_ROOT,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'ignore',
  });

  const startedAt = Date.now();
  while (!(await answering(baseUrl))) {
    if (Date.now() - startedAt > 60 * 1000) {
      child.kill();
      throw new Error(`The server did not answer on ${baseUrl} within 60s`);
    }
    await sleep(500);
  }

  const stop = () => {
    child.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  };

  return { baseUrl, stop };
};

/** POST /api/signin, which is the only route reachable without a token. */
const signin = async (baseUrl, body) => {
  const res = await fetch(`${baseUrl}/api/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let payload = {};
  try {
    payload = JSON.parse(text);
  } catch (e) {
    payload = { raw: text };
  }
  return { status: res.status, ...payload };
};

/** Any authenticated endpoint will do; this one needs no machine attached. */
const getControllers = (baseUrl, token) => fetch(`${baseUrl}/api/controllers`, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

module.exports = {
  hasBuild,
  startServer,
  signin,
  getControllers,
};
