// Core development must start even when the optional Ollama service is absent.
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '-p', '3000', '-H', '127.0.0.1', '--webpack'], {
  cwd: root, stdio: 'inherit',
});
console.log('[dev] Agenda+ at http://localhost:3000. Ollama is optional; local practice and text import work without it.');
child.once('error', error => { console.error(error.message); process.exitCode = 1; });
child.once('exit', (code, signal) => { process.exitCode = signal ? 1 : (code ?? 1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill());
