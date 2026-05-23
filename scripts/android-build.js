const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const tempRootDir = path.join(rootDir, '.android-build-temp');
const tempProjectDir = path.join(tempRootDir, 'project');
const tempOutDir = path.join(tempProjectDir, 'out');
const realOutDir = path.join(rootDir, 'out');
const isWindows = process.platform === 'win32';

const command = process.argv[2];
const excludedPathPrefixes = [
  '.android-build-temp',
  '.git',
  '.gradle',
  '.idea',
  '.next',
  '.portal-browser-profile',
  'android',
  'electron',
  'node_modules',
];
const excludedExactPaths = new Set(['package-lock.json']);

function run(bin, args, options = {}) {
  const spawnOptions = {
    cwd: options.cwd || rootDir,
    env: { ...process.env, ...(options.env || {}) },
    stdio: 'inherit',
    shell: false,
  };

  const result = isWindows
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', [bin, ...args].join(' ')], spawnOptions)
    : spawnSync(bin, args, spawnOptions);

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    const error = new Error(`${bin} exited with code ${result.status}`);
    error.exitCode = result.status;
    throw error;
  }
}

function buildWeb(cwd = rootDir) {
  run('npx', ['next', 'build', '--webpack'], {
    cwd,
    env: {
      CAPACITOR_BUILD: 'true',
    },
  });
}

function syncAndroid() {
  run('npx', ['cap', 'sync', 'android']);
}

function assemble(task) {
  run(isWindows ? 'gradlew' : './gradlew', [task], {
    cwd: androidDir,
  });
}

function normalizeRelativePath(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function shouldCopyPath(sourcePath) {
  const relativePath = path.relative(rootDir, sourcePath);

  if (!relativePath) {
    return true;
  }

  const normalizedPath = normalizeRelativePath(relativePath);

  if (excludedExactPaths.has(normalizedPath)) {
    return false;
  }

  if (normalizedPath === 'src/app/api' || normalizedPath.startsWith('src/app/api/')) {
    return false;
  }

  return !excludedPathPrefixes.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  );
}

function prepareTempProject() {
  fs.rmSync(tempProjectDir, { recursive: true, force: true });
  fs.mkdirSync(tempProjectDir, { recursive: true });

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const sourcePath = path.join(rootDir, entry.name);

    if (!shouldCopyPath(sourcePath)) {
      continue;
    }

    fs.cpSync(sourcePath, path.join(tempProjectDir, entry.name), {
      recursive: true,
      filter: shouldCopyPath,
    });
  }
}

function syncBuiltOutDir() {
  if (!fs.existsSync(tempOutDir)) {
    throw new Error(`Expected Android export at ${tempOutDir}, but it was not created.`);
  }

  fs.rmSync(realOutDir, { recursive: true, force: true });
  fs.cpSync(tempOutDir, realOutDir, { recursive: true });
}

function cleanupTempProject() {
  fs.rmSync(tempProjectDir, { recursive: true, force: true });

  if (fs.existsSync(tempRootDir) && fs.readdirSync(tempRootDir).length === 0) {
    fs.rmdirSync(tempRootDir);
  }
}

function buildWebForAndroid() {
  prepareTempProject();
  console.log('Building the Capacitor export from a temp project copy without src/app/api.');
  buildWeb(tempProjectDir);
  syncBuiltOutDir();
}

function runAndroidBuildPipeline(task) {
  try {
    buildWebForAndroid();
    syncAndroid();

    if (task) {
      assemble(task);
    }
  } finally {
    cleanupTempProject();
  }
}

try {
  switch (command) {
    case 'build-android':
      runAndroidBuildPipeline();
      break;
    case 'apk-debug':
      runAndroidBuildPipeline('assembleDebug');
      break;
    case 'apk-release':
      runAndroidBuildPipeline('assembleRelease');
      break;
    default:
      console.error('Usage: node scripts/android-build.js <build-android|apk-debug|apk-release>');
      process.exit(1);
  }
} catch (error) {
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }

  process.exit(typeof error?.exitCode === 'number' ? error.exitCode : 1);
}
