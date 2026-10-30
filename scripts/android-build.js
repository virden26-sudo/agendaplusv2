const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildStatic } = require('./build-static');
const root = path.resolve(__dirname, '..');
const tasks = { 'build-android': null, 'apk-debug': 'assembleDebug', 'apk-release': 'assembleRelease', 'bundle-release': 'bundleRelease' };
function run(bin, args, cwd = root) {
  // Only batch files need cmd.exe. In particular, do not run process.execPath
  // through a shell: Windows Node installations commonly contain spaces.
  const result = spawnSync(bin, args, {
    cwd, stdio: 'inherit',
    shell: process.platform === 'win32' && /\.(bat|cmd)$/i.test(bin),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${bin} failed (${result.status}).`);
}
try {
  const command = process.argv[2];
  if (!(command in tasks)) throw new Error(`Usage: node scripts/android-build.js <${Object.keys(tasks).join('|')}>`);
  buildStatic();
  run(process.execPath, [require.resolve('@capacitor/cli/bin/capacitor'), 'sync', 'android']);
  if (tasks[command]) run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
    [tasks[command], '--no-daemon'], path.join(root, 'android'));
} catch (error) { console.error(error.message); process.exitCode = 1; }
