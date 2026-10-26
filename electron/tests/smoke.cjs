const { spawn, execFile } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const dist = path.resolve(__dirname, '..', 'dist');
const candidates = process.platform === 'win32'
  ? [path.join(dist, 'win-unpacked', 'Agenda+.exe'), path.join(dist, 'win-arm64-unpacked', 'Agenda+.exe')]
  : process.platform === 'darwin'
    ? ['mac', 'mac-arm64', 'mac-universal'].map(dir => path.join(dist, dir, 'Agenda+.app', 'Contents', 'MacOS', 'Agenda+'))
    : [path.join(dist, 'linux-unpacked', 'agenda-plus'), path.join(dist, 'linux-arm64-unpacked', 'agenda-plus')];
const executable = process.env.AGENDA_PACKAGED_APP || candidates.find(file => fs.existsSync(file));
if (!executable || !fs.existsSync(executable)) throw new Error('Package the application for this operating system first.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-smoke-'));
const args = [`--user-data-dir=${profile}`];
// Only this disposable CI smoke process opts out of the sandbox. Production does not.
if (process.env.AGENDA_SMOKE_NO_SANDBOX === '1') args.push('--no-sandbox');
const child = spawn(executable, args, {
  env: { ...process.env, AGENDA_SMOKE_TEST: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  detached: process.platform !== 'win32',
});
let output = '';
child.stdout.on('data', (data) => { output += data; process.stdout.write(data); });
child.stderr.on('data', (data) => { output += data; process.stderr.write(data); });
const timeout = setTimeout(() => {
  // Stop the owned backend too, so its inherited stdout cannot keep failed CI alive.
  if (process.platform === 'win32' && child.pid) {
    execFile('taskkill', ['/F', '/T', '/PID', String(child.pid)], () => {});
  } else if (child.pid) {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Already exited. */ }
  }
  process.exitCode = 1;
}, 90_000);
child.on('error', (error) => { console.error(error); clearTimeout(timeout); process.exitCode = 1; });
child.on('exit', (code) => {
  clearTimeout(timeout);
  if (code !== 0 || !output.includes('AGENDA_SMOKE_OK')) process.exitCode = 1;
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});
