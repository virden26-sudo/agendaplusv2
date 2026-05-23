const { spawn } = require('child_process');
const path = require('path');

const nextProcess = spawn('npx', ['next', 'dev', '-p', '9002', '--webpack'], {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
});

const bridgeProcess = spawn('node', [path.join(__dirname, '..', 'ai-bridge.js')], {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
});

function handleOutput(data, source) {
    const output = data.toString();
    process.stdout.write(`[${source}] ${output}`);
}

nextProcess.stdout.on('data', (data) => handleOutput(data, 'Next.js'));
nextProcess.stderr.on('data', (data) => handleOutput(data, 'Next.js ERR'));

bridgeProcess.stdout.on('data', (data) => handleOutput(data, 'Bridge'));
bridgeProcess.stderr.on('data', (data) => handleOutput(data, 'Bridge ERR'));

function stopServers() {
    console.log('[WATCHDOG] Shutting down...');
    nextProcess.kill();
    bridgeProcess.kill();
    process.exit(0);
}

process.on('SIGINT', stopServers);
process.on('SIGTERM', stopServers);

console.log('\x1b[36m%s\x1b[0m', `[WATCHDOG] Servers started.`);
