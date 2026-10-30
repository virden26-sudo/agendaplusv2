const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

function serverOptions(env = process.env) {
  const host = env.AGENDA_HOST || '127.0.0.1';
  const port = Number(env.AGENDA_PORT || env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('AGENDA_PORT must be between 1 and 65535.');
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !env.AGENDA_API_TOKEN?.trim()) {
    throw new Error('Set AGENDA_API_TOKEN before allowing connections from other devices. Use an HTTPS reverse proxy for mobile access.');
  }
  return { host, port };
}

function main() {
  const root = path.resolve(__dirname, '..');
  require('dotenv').config({ path: path.join(root, '.env.local'), quiet: true });
  require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
  const { host, port } = serverOptions();
  const backend = path.join(root, 'electron', 'backend');
  if (!fs.existsSync(path.join(backend, 'server.js'))) throw new Error('Build the service first with npm run build:server.');
  const profile = process.env.AGENDA_PORTAL_PROFILE_DIR || path.join(os.homedir(), '.agenda-plus', 'portal-browser-profile');
  const child = spawn(process.execPath, [path.join(backend, 'server.js')], {
    cwd: backend, stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', HOSTNAME: host, PORT: String(port), AGENDA_PORTAL_PROFILE_DIR: profile },
  });
  console.log(`Agenda+ service starting on ${host}:${port}. Ollama is optional for broader AI teaching.`);
  child.once('error', error => { console.error(error.message); process.exitCode = 1; });
  child.once('exit', (code, signal) => { process.exitCode = signal ? 1 : (code ?? 1); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill());
}
module.exports = { serverOptions };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
