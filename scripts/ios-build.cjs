const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildStatic } = require('./build-static');
const root = path.resolve(__dirname, '..');
function cap(args) {
  const result = spawnSync(process.execPath, [require.resolve('@capacitor/cli/bin/capacitor'), ...args], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Capacitor ${args[0]} failed (${result.status}).`);
}
try {
  if (process.platform !== 'darwin') throw new Error('Native iOS builds require macOS and Xcode. Use the iOS simulator CI workflow or a Mac.');
  buildStatic();
  if (!fs.existsSync(path.join(root, 'ios', 'App', 'App.xcodeproj'))) cap(['add', 'ios', '--packagemanager', 'SPM']);
  cap(['sync', 'ios']);
} catch (error) { console.error(error.message); process.exitCode = 1; }
