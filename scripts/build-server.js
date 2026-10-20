const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', '--webpack'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, AGENDA_BUILD_TARGET: 'server' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const standalone = path.join(root, '.next-server', 'standalone');
if (!fs.existsSync(path.join(standalone, 'server.js'))) throw new Error('Standalone backend missing server.js');
const destination = path.join(root, 'electron', 'backend');
fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(standalone, destination, { recursive: true });
fs.cpSync(path.join(root, '.next-server', 'static'), path.join(destination, '.next-server', 'static'), { recursive: true });
fs.cpSync(path.join(root, 'public'), path.join(destination, 'public'), { recursive: true });
