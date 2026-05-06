const cp = require('child_process');
const chokidar = require('chokidar');
const electron = require('electron');

let child = null;
const reloadWatcher = {
  debouncer: null,
  ready: false,
  watcher: null,
  restarting: false,
};

///*
function runBuild() {
  return new Promise((resolve) => {
    let tempChild = cp.spawn('npm', ['run', 'build'], { shell: true });
    tempChild.once('exit', () => {
      resolve();
    });
    tempChild.stdout.pipe(process.stdout);
  });
}
//*/

async function spawnElectron() {
  if (child !== null) {
    child.stdin.pause();
    child.kill();
    child = null;
  }
  child = cp.spawn(electron, ['--inspect=5858', './'], { shell: true });
  child.on('exit', () => {
    if (!reloadWatcher.restarting) {
      // Ensure the entire process tree dies on exit
      process.exit(0);
    }
  });
  child.stdout.pipe(process.stdout);
}

function setupReloadWatcher() {
  reloadWatcher.watcher = chokidar
    .watch('./src/**/*', {
      ignored: /[/\\]\./,
      persistent: true,
    })
    .on('ready', () => {
      reloadWatcher.ready = true;
    })
    .on('all', () => {
      if (reloadWatcher.ready) {
        clearTimeout(reloadWatcher.debouncer);
        reloadWatcher.debouncer = setTimeout(async () => {
          console.log('Restarting');
          reloadWatcher.restarting = true;
          await spawnElectron();
          reloadWatcher.restarting = false;
          reloadWatcher.ready = false;
          clearTimeout(reloadWatcher.debouncer);
          reloadWatcher.debouncer = null;
          reloadWatcher.watcher = null;
          setupReloadWatcher();
        }, 500);
      }
    });
}

(async () => {
  await runBuild();
  await spawnElectron();
  setupReloadWatcher();
})();
