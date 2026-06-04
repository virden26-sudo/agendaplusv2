const net = require("net");
const os = require("os");
const {spawn} = require("child_process");
const path = require("path");

const isWindows = process.platform === "win32";

let ollamaProcess = null;
let nextProcess = null;
let shuttingDown = false;

function checkOllama(timeoutMs = 1500) {
    return new Promise((resolve) => {
        const socket = net.createConnection({host: "127.0.0.1", port: 11434});
        let settled = false;

        const finish = (ready) => {
            if (settled) {
                return;
            }

            settled = true;
            socket.destroy();
            resolve(ready);
        };

        socket.setTimeout(timeoutMs);
        socket.on("connect", () => finish(true));
        socket.on("timeout", () => finish(false));
        socket.on("error", () => finish(false));
    });
}

function waitForOllama(timeoutMs = 30000) {
    const startedAt = Date.now();

    return new Promise((resolve) => {
        const poll = async () => {
            if (await checkOllama()) {
                resolve(true);
                return;
            }

            if (Date.now() - startedAt > timeoutMs) {
                resolve(false);
                return;
            }

            setTimeout(poll, 1000);
        };

        void poll();
    });
}

function prefixOutput(stream, prefix, transformLine = (line) => line) {
    stream.on("data", (chunk) => {
        for (const line of chunk.toString().split(/\r?\n/)) {
            const trimmed = line.trimEnd();
            if (!trimmed) {
                continue;
            }

            const output = transformLine(trimmed);
            if (output) {
                console.log(`${prefix} ${output}`);
            }
        }
    });
}

function killTree(child) {
    if (!child || child.killed) {
        return;
    }

    if (isWindows) {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {stdio: "ignore"});
    } else {
        child.kill("SIGTERM");
    }
}

function getLanUrls(port) {
    const urls = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
    const interfaces = os.networkInterfaces();

    for (const addresses of Object.values(interfaces)) {
        for (const address of addresses || []) {
            if (address.family === "IPv4" && !address.internal) {
                urls.push(`http://${address.address}:${port}`);
            }
        }
    }

    return Array.from(new Set(urls));
}

async function shutdown(exitCode = 0) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    console.log("\n[dev] Stopping Agenda+ dev services...");

    killTree(nextProcess);

    if (ollamaProcess) {
        console.log("[dev] Stopping Ollama server started by this session...");
        killTree(ollamaProcess);
    }

    setTimeout(() => process.exit(exitCode), 500);
}

async function main() {
    const ollamaAlreadyRunning = await checkOllama();

    if (ollamaAlreadyRunning) {
        console.log("[dev] Ollama is already running.");
    } else {
        console.log("[dev] Starting Ollama...");
        ollamaProcess = spawn("ollama", ["serve"], {
            shell: false,
            stdio: ["ignore", "pipe", "pipe"],
        });

        prefixOutput(ollamaProcess.stdout, "[ollama]");
        prefixOutput(ollamaProcess.stderr, "[ollama]");

        ollamaProcess.on("exit", async (code) => {
            if (shuttingDown) {
                return;
            }

            if (await checkOllama()) {
                console.log("[dev] Ollama is available from another process.");
                ollamaProcess = null;
                return;
            }

            console.error(`[dev] Ollama stopped unexpectedly with exit code ${code}.`);
            await shutdown(code || 1);
        });

        const ollamaReady = await waitForOllama();
        if (!ollamaReady) {
            console.error("[dev] Ollama did not become ready at 127.0.0.1:11434.");
            await shutdown(1);
            return;
        }
    }

    console.log("[dev] Starting Next.js (listening on all interfaces for phone/LAN testing).");
    console.log("[dev] Open the app in your browser at:");
    for (const url of getLanUrls(3000)) {
        console.log(`[dev]   ${url}`);
    }
    console.log("[dev] Do NOT use http://0.0.0.0:3000 — browsers cannot open that address.");

    const rewriteDevUrls = (line) =>
        line
            .replace(/https?:\/\/0\.0\.0\.0:3000/gi, "http://localhost:3000")
            .replace(/\b0\.0\.0\.0:3000\b/g, "localhost:3000");

    const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
    nextProcess = spawn(process.execPath, [nextBin, "dev", "-p", "3000", "-H", "0.0.0.0", "--webpack"], {
        cwd: path.join(__dirname, ".."),
        stdio: ["ignore", "pipe", "pipe"],
    });

    prefixOutput(nextProcess.stdout, "[next]", rewriteDevUrls);
    prefixOutput(nextProcess.stderr, "[next]", rewriteDevUrls);

    nextProcess.on("exit", async (code) => {
        await shutdown(code || 0);
    });
}

process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));
process.on("uncaughtException", async (error) => {
    console.error(error);
    await shutdown(1);
});

void main();
