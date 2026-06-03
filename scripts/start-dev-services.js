const http = require("http");
const {spawn} = require("child_process");

const OLLAMA_URL = "http://127.0.0.1:11434/api/tags";
const isWindows = process.platform === "win32";

let ollamaProcess = null;
let nextProcess = null;
let shuttingDown = false;

function checkOllama(timeoutMs = 1500) {
    return new Promise((resolve) => {
        const request = http.get(OLLAMA_URL, {timeout: timeoutMs}, (response) => {
            response.resume();
            resolve(response.statusCode >= 200 && response.statusCode < 500);
        });

        request.on("timeout", () => {
            request.destroy();
            resolve(false);
        });

        request.on("error", () => resolve(false));
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

function prefixOutput(stream, prefix) {
    stream.on("data", (chunk) => {
        for (const line of chunk.toString().split(/\r?\n/)) {
            if (line.trim()) {
                console.log(`${prefix} ${line}`);
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
            shell: isWindows,
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

    console.log("[dev] Starting Next.js on http://localhost:9002...");
    nextProcess = spawn(isWindows ? "npx.cmd" : "npx", ["next", "dev", "-p", "9002", "--webpack"], {
        stdio: "inherit",
    });

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
