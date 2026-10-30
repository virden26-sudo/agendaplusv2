// Build a static frontend without mutating the source API routes.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const stage = path.join(root, '.native-build', 'frontend');
const inputs = ['src', 'public', 'package.json', 'package-lock.json', 'next.config.mjs',
  'next-env.d.ts', 'tsconfig.json', 'postcss.config.mjs', 'tailwind.config.ts'];
function buildStatic() {
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });
  try {
    for (const name of inputs) {
      fs.cpSync(path.join(root, name), path.join(stage, name), {
        recursive: true,
        filter: (source) => !['src/app/api', 'src/main', 'src/proxy.ts'].some((excluded) => {
          const relative = path.relative(root, source).split(path.sep).join('/');
          return relative === excluded || relative.startsWith(`${excluded}/`);
        }),
      });
    }
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(stage, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir');
    const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', '--webpack'], {
      cwd: stage, stdio: 'inherit', env: { ...process.env, AGENDA_BUILD_TARGET: 'static' },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Static build failed (${result.status}).`);
    if (!fs.existsSync(path.join(stage, 'out', 'index.html'))) throw new Error('Missing exported index.html');
    fs.rmSync(path.join(root, 'out'), { recursive: true, force: true });
    fs.cpSync(path.join(stage, 'out'), path.join(root, 'out'), { recursive: true });
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}
module.exports = { buildStatic };
if (require.main === module) {
  try { buildStatic(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
