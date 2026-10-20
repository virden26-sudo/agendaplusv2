const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const executable = path.resolve(__dirname, '..', 'dist', 'win-unpacked', 'Agenda+.exe');
if (!fs.existsSync(executable)) throw new Error('Package the Windows application first.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'agenda-smoke-'));
const child = spawn(executable, [`--user-data-dir=${profile}`], {
  env: { ...process.env, AGENDA_SMOKE_TEST: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (data) => { output += data; process.stdout.write(data); });
child.stderr.on('data', (data) => { output += data; process.stderr.write(data); });
const timeout = setTimeout(() => { child.kill(); process.exitCode = 1; }, 90_000);
child.on('error', (error) => { console.error(error); clearTimeout(timeout); process.exitCode = 1; });
child.on('exit', (code) => {
  clearTimeout(timeout);
  if (code !== 0 || !output.includes('AGENDA_SMOKE_OK')) process.exitCode = 1;
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});
