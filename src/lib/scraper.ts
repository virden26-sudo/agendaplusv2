// This file is modified to be safe for both Node and Browser environments.
// Puppeteer and fs will only be imported and used in a Node environment.

let sharedBrowser: any = null;
let sharedBrowserPromise: Promise<any> | null = null;
let sharedBrowserVisible = false;
const SHARED_BROWSER_PROFILE_DIR = process.env.AGENDA_PORTAL_PROFILE_DIR
    || `${process.cwd()}\\.portal-browser-profile`;

// Mutex to serialize all scraping missions and prevent concurrent browser launches
let scraperMutex = Promise.resolve();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isNavigationError = (error: unknown) => {
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return (
        message.includes("execution context was destroyed") ||
        message.includes("cannot find context") ||
        message.includes("target closed") ||
        message.includes("session closed") ||
        message.includes("detached frame") ||
        message.includes("frame was detached") ||
        message.includes("lifecyclewatcher disposed") ||
        message.includes("navigating frame was detached")
    );
};

const listBrowserPages = async (browser: any) => {
    if (!browser?.pages) {
        return [];
    }

    const rawPages = browser.pages();
    const resolved = rawPages && typeof rawPages.then === "function" ? await rawPages : rawPages;
    return Array.isArray(resolved) ? resolved : [];
};

const getStablePage = async (browser: any, preferred?: any) => {
    const pages = (await listBrowserPages(browser)).filter((candidate: any) => {
        try {
            return candidate && !candidate.isClosed();
        } catch {
            return false;
        }
    });

    if (pages.length === 0) {
        return preferred;
    }

    const d2lPage = pages.find((candidate: any) => {
        try {
            return candidate.url().includes("d2l");
        } catch {
            return false;
        }
    });

    return d2lPage || pages[pages.length - 1] || preferred;
};

async function safeGoto(page: any, url: string, timeout = 45000) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            if (!page || page.isClosed()) {
                throw new Error("Browser page closed before navigation completed.");
            }

            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout,
            });
            await sleep(1200);
            return;
        } catch (error) {
            if (!isNavigationError(error) || attempt === 3) {
                throw error;
            }

            console.warn(`GenesisAI Scraper: Navigation retry ${attempt}/3 for ${url}`);
            await sleep(1000);
        }
    }
}

async function extractVisibleText(page: any): Promise<string> {
    const extractFromFrame = async (frame: any) => {
        if (!frame || frame.isDetached()) {
            return "";
        }

        try {
            return await frame.evaluate(`(() => {
                const clone = document.documentElement.cloneNode(true);
                const toRemove = clone.querySelectorAll('script, style, noscript, .nav-bar, .footer, footer, header, .sidebar');
                toRemove.forEach((element) => element.remove());
                return clone.innerText;
            })()`);
        } catch (error) {
            if (isNavigationError(error)) {
                return "";
            }
            throw error;
        }
    };

    const mainText = await extractFromFrame(page.mainFrame());
    if (mainText.length > 200) {
        return mainText;
    }

    const frameTexts = await Promise.all(
        page.frames().map((frame: any) => extractFromFrame(frame))
    );

    return Array.from(new Set(frameTexts.filter((text: string) => text.length > 0))).join("\n");
}

export async function scrapePortal(url: string, user?: string, pass?: string): Promise<string> {
    console.log(`GenesisAI Scraper: Starting mission for ${url}`);

    if (typeof window !== 'undefined') {
        console.warn("GenesisAI Agent: Direct scraping is not supported in the browser. Call the /api/scrape endpoint.");
        return `[BROWSER_SCRAPE_SIMULATION] Simulated content for ${url}.`;
    }

    // Wrap the entire mission in a mutex to prevent concurrent Puppeteer launches with the same profile
    return new Promise((resolve, reject) => {
        scraperMutex = scraperMutex.then(async () => {
            try {
                const result = await runScrapingMission(url, user, pass);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        }).catch((err) => {
            // Ensure the chain continues even on failure
            console.error("GenesisAI Scraper: Mutex chain error:", err);
            reject(err);
        });
    });
}

async function runScrapingMission(url: string, user?: string, pass?: string): Promise<string> {
    // Use dynamic imports for Node-only modules
    const puppeteer = (await import('puppeteer-core')).default;
    const fs = await import('fs');
    const isOktaUrl = (candidateUrl: string) => /(^https?:\/\/)?[^/]*okta\.com/i.test(candidateUrl);

    function getExecutablePath() {
        if (process.platform === 'win32') {
            const paths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
            ];
            for (const p of paths) {
                if (fs.existsSync(p)) return p;
            }
            throw new Error('No Chrome or Edge installation found.');
        }
        return '/usr/bin/google-chrome';
    }

    const executablePath = getExecutablePath();
    let browser = await getSharedBrowser(puppeteer, executablePath, fs, false);
    let page = await browser.newPage();

    try {
        // Set a timeout of 60 seconds
        page.setDefaultNavigationTimeout(60000);
        console.log(`GenesisAI Scraper: Navigating to ${url}...`);
        await safeGoto(page, url);

        const needsInteractiveLogin = async () => {
            if (isOktaUrl(page.url())) return true;
            try {
                return await page.evaluate(`(() => {
                    return Array.from(document.querySelectorAll("input")).some((input) => {
                        const type = (input.type || "").toLowerCase();
                        const name = (input.name || "").toLowerCase();
                        const id = (input.id || "").toLowerCase();
                        const placeholder = (input.placeholder || "").toLowerCase();
                        return (
                            type === "password" || name.includes("password") || id.includes("password") || placeholder.includes("password") ||
                            name.includes("username") || id.includes("username") || placeholder.includes("username") || placeholder.includes("email")
                        );
                    });
                })()`);
            } catch { return false; }
        };

        if (!sharedBrowserVisible && await needsInteractiveLogin()) {
            console.log("GenesisAI Scraper: Login required. Switching to visible browser.");
            await page.close().catch(() => {});
            await browser.close().catch(() => {});
            sharedBrowser = null;
            sharedBrowserPromise = null;

            browser = await getSharedBrowser(puppeteer, executablePath, fs, true);
            page = await browser.newPage();
            page.setDefaultNavigationTimeout(60000);
            await safeGoto(page, url);
        }

        if (user && pass) {
            console.log("GenesisAI Scraper: Attempting automatic login...");
            try {
                const userSelectors = ['input[type="text"]', 'input[type="email"]', 'input[name="username"]', '#username', '#userNameInput', '[autocomplete="username"]'];
                const passSelectors = ['input[type="password"]', 'input[name="password"]', '#password', '#passwordInput', '[autocomplete="current-password"]'];
                const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', '#submitButton', '#nextButton', '.btn-primary'];

                const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
                const looksLoggedIn = ["logout", "sign out", "dashboard", "my courses"].some(term => bodyText.includes(term));

                if (!looksLoggedIn) {
                    let userFieldFound = false;
                    for (const selector of userSelectors) {
                        try {
                            await page.waitForSelector(selector, {timeout: 2000});
                            await page.click(selector, {clickCount: 3});
                            await page.keyboard.press('Backspace');
                            await page.type(selector, user, {delay: 50});
                            userFieldFound = true;
                            break;
                        } catch {}
                    }

                    if (userFieldFound) {
                        let passFieldFound = false;
                        for (const selector of passSelectors) {
                            try {
                                await page.waitForSelector(selector, {timeout: 2000});
                                await page.type(selector, pass, {delay: 50});
                                passFieldFound = true;
                                break;
                            } catch {}
                        }

                        if (!passFieldFound) {
                            for (const selector of submitSelectors) {
                                try {
                                    const btn = await page.$(selector);
                                    if (btn) {
                                        await btn.click();
                                        await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 5000}).catch(() => {});
                                        break;
                                    }
                                } catch {}
                            }
                            for (const selector of passSelectors) {
                                try {
                                    await page.waitForSelector(selector, {timeout: 3000});
                                    await page.type(selector, pass, {delay: 50});
                                    passFieldFound = true;
                                    break;
                                } catch {}
                            }
                        }

                        if (passFieldFound) {
                            await page.keyboard.press('Enter');
                            await page.waitForNavigation({waitUntil: 'networkidle2', timeout: 10000}).catch(() => {});
                        }
                    }
                }
            } catch (loginErr) {
                console.log("GenesisAI Scraper: Automatic login issues.", loginErr);
            }
        }

        await handleManualIntervention(page);

        let activePage = await getStablePage(browser, page);
        if (!activePage || activePage.isClosed()) {
            throw new Error("Portal browser closed before scraping could finish. Keep the login window open and try Rescan.");
        }

        const activeUrl = activePage.url();

        const d2lOuMatch =
            activeUrl.match(/[?&]ou=(\d+)/) ||
            activeUrl.match(/\/d2l\/home\/(\d+)/) ||
            activeUrl.match(/\/content\/(\d+)\//) ||
            activeUrl.match(/\/le\/content\/(\d+)\//);

        if (activeUrl.includes('d2l') && d2lOuMatch?.[1]) {
            console.log("GenesisAI Scraper: D2L detected.");
            try {
                const origin = new URL(activeUrl).origin;
                const ou = d2lOuMatch[1];

                if (ou) {
                    const targets = [
                        { name: 'Assignments', url: `${origin}/d2l/lms/dropbox/user/folders_list.d2l?ou=${ou}&isprv=0` },
                        { name: 'Quizzes', url: `${origin}/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${ou}` },
                        { name: 'Discussions', url: `${origin}/d2l/lms/discussions/user/discussions_list.d2l?ou=${ou}` },
                        { name: 'Grades', url: `${origin}/d2l/lms/grades/user/grades_list.d2l?ou=${ou}` }
                    ];

                    let aggregatedContent = "";
                    for (const target of targets) {
                        try {
                            activePage = await getStablePage(browser, activePage);
                            if (!activePage || activePage.isClosed()) {
                                throw new Error("Browser page closed during D2L extraction.");
                            }

                            await safeGoto(activePage, target.url, 30000);
                            const pageContent = await extractVisibleText(activePage);
                            console.log(`GenesisAI Scraper: ${target.name} extracted ${pageContent.length} characters.`);
                            aggregatedContent += `\n\n=== SECTION: ${target.name} ===\n\n${pageContent}`;
                        } catch (err) {
                            console.warn(`Failed to extract ${target.name}`, err);
                        }
                    }
                    console.log(`GenesisAI Scraper: D2L aggregation extracted ${aggregatedContent.length} characters.`);

                    if (aggregatedContent.trim().length > 500) {
                        return aggregatedContent;
                    }
                }
            } catch (err) {
                console.warn("D2L aggregation failed", err);
            }
        }

        if (isOktaUrl(activeUrl)) throw new Error("Authentication did not complete.");

        activePage = await getStablePage(browser, activePage);
        if (!activePage || activePage.isClosed()) {
            throw new Error("Portal browser closed before content could be read.");
        }

        try {
            await activePage.waitForFunction(`(() => {
                const text = document.body.innerText.toLowerCase();
                return ["assignment", "course", "grade", "schedule", "module", "announcement"].some(t => text.includes(t));
            })()`, {timeout: 10000});
        } catch {
            // Continue with best-effort extraction.
        }

        const fallbackText = await extractVisibleText(activePage);
        if (fallbackText.trim().length < 200) {
            throw new Error(
                "Portal page loaded but contained too little text. Stay on your course home or assignments page, then Rescan."
            );
        }

        return fallbackText;

    } finally {
        // Keep the shared browser session alive for the next sync.
    }
}

async function stopBrowsersUsingProfile(profileDir: string) {
    if (process.platform !== "win32") {
        return;
    }

    const {execFile} = await import("child_process");
    const command = `Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'chrome|msedge') -and ($_.CommandLine -like '*${profileDir.replace(/\\/g, "\\\\")}*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;

    await new Promise<void>((resolve) => {
        execFile("powershell.exe", ["-NoProfile", "-Command", command], () => resolve());
    });
}

async function getSharedBrowser(puppeteer: any, executablePath: string, fs: typeof import("fs"), visible = false) {
    if (sharedBrowser && sharedBrowser.isConnected()) {
        if (sharedBrowserVisible === visible || (sharedBrowserVisible && !visible)) {
            return sharedBrowser;
        }
        console.log("GenesisAI Scraper: Closing browser to change visibility.");
        await sharedBrowser.close().catch(() => {});
        sharedBrowser = null;
        sharedBrowserPromise = null;
    }

    if (sharedBrowserPromise) return sharedBrowserPromise;

    sharedBrowserPromise = (async () => {
        try {
            if (!fs.existsSync(SHARED_BROWSER_PROFILE_DIR)) {
                fs.mkdirSync(SHARED_BROWSER_PROFILE_DIR, {recursive: true});
            }
            console.log(`GenesisAI Scraper: Launching browser (visible: ${visible})`);
            const createLaunchOptions = (userDataDir: string, forceVisible = visible) => ({
                executablePath,
                headless: forceVisible ? false : "new",
                defaultViewport: null,
                userDataDir,
                args: [
                    forceVisible ? '--start-maximized' : '--window-position=-32000,-32000',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            });

            const launchOptions = createLaunchOptions(SHARED_BROWSER_PROFILE_DIR);

            let browser;
            try {
                browser = await puppeteer.launch(launchOptions);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (!message.includes("browser is already running")) {
                    throw error;
                }

                console.warn("GenesisAI Scraper: Browser profile is locked. Stopping stale profile browser and retrying once.");
                await stopBrowsersUsingProfile(SHARED_BROWSER_PROFILE_DIR);
                try {
                    browser = await puppeteer.launch(launchOptions);
                } catch (retryError) {
                    const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
                    if (!retryMessage.includes("browser is already running")) {
                        throw retryError;
                    }

                    const recoveryProfileDir = `${SHARED_BROWSER_PROFILE_DIR}-recovery`;
                    if (!fs.existsSync(recoveryProfileDir)) {
                        fs.mkdirSync(recoveryProfileDir, {recursive: true});
                    }

                    console.warn(`GenesisAI Scraper: Main browser profile is still locked. Using recovery profile at ${recoveryProfileDir}.`);
                    browser = await puppeteer.launch(createLaunchOptions(recoveryProfileDir, true));
                    sharedBrowserVisible = true;
                }
            }

            sharedBrowser = browser;
            sharedBrowserVisible = sharedBrowserVisible || visible;
            browser.on('disconnected', () => {
                if (sharedBrowser === browser) {
                    sharedBrowser = null;
                    sharedBrowserPromise = null;
                }
            });
            return browser;
        } catch (err) {
            sharedBrowserPromise = null;
            throw err;
        }
    })();

    return sharedBrowserPromise;
}


async function handleManualIntervention(page: unknown) {
    const isOktaUrl = (url: string) => /(^https?:\/\/)?[^/]*okta\.com/i.test(url);

    const injectTracker = async () => {
        try {
            await (page as any).evaluate(`
        if (!window.genesisaiMonitorInitialized) {
          window.genesisaiLastActivity = Date.now();
          const updateActivity = () => {
            window.genesisaiLastActivity = Date.now();
          };
          ["mousemove", "keydown", "mousedown", "scroll", "input", "click"].forEach((eventName) =>
            window.addEventListener(eventName, updateActivity)
          );
          window.genesisaiMonitorInitialized = true;
        }
      `);
            return true;
        } catch (error) {
            if (isNavigationError(error)) {
                return false;
            }
            throw error;
        }
    };

    return new Promise<void>((resolve, reject) => {
        let cancelled = false;

        const poll = async () => {
            while (!cancelled) {
                try {
                    const injected = await injectTracker();
                    if (!injected) {
                        await sleep(250);
                        continue;
                    }

                    const frameSnapshots = await Promise.all(
                        ((page as any).frames() as any[]).map(async (frame: any) => {
                            try {
                                if (frame.isDetached()) {
                                    return {textLength: 0, loginLikeInputs: 0, looksLikePortal: false};
                                }

                                return await frame.evaluate(`(() => {
                  const bodyText = document.body.innerText.toLowerCase();
                  const loginLikeInputs = Array.from(document.querySelectorAll("input")).filter((input) => {
                    const element = input;
                    const type = (element.type || "").toLowerCase();
                    const name = (element.name || "").toLowerCase();
                    const id = (element.id || "").toLowerCase();
                    const placeholder = (element.placeholder || "").toLowerCase();
                    return (
                      type === "password" ||
                      name.includes("password") ||
                      id.includes("password") ||
                      placeholder.includes("password") ||
                      name.includes("username") ||
                      id.includes("username") ||
                      placeholder.includes("username") ||
                      placeholder.includes("email")
                    );
                  }).length;

                  const looksLikePortal = [
                    "assignment",
                    "course",
                    "grade",
                    "schedule",
                    "announcement",
                    "module",
                    "discussion",
                    "quiz",
                    "dropbox",
                    "content",
                  ].some((token) => bodyText.includes(token));

                  return {
                    textLength: bodyText.length,
                    loginLikeInputs,
                    looksLikePortal,
                  };
                })()`);
                            } catch (_error) {
                                return {textLength: 0, loginLikeInputs: 0, looksLikePortal: false};
                            }
                        })
                    );

                    const pageStatus = await (page as any).evaluate(`(() => ({
            lastActivity: window.genesisaiLastActivity || Date.now(),
            url: window.location.href,
          }))()`) as { lastActivity: number; url: string };

                    const totalTextLength = (frameSnapshots as any[]).reduce((sum, frame) => sum + frame.textLength, 0);
                    const maxFrameTextLength = (frameSnapshots as any[]).reduce((max, frame) => Math.max(max, frame.textLength), 0);
                    const loginLikeInputs = (frameSnapshots as any[]).reduce((sum, frame) => sum + frame.loginLikeInputs, 0);
                    const looksLikePortal = (frameSnapshots as any[]).some((frame) => frame.looksLikePortal);
                    const inactiveTime = Date.now() - pageStatus.lastActivity;
                    const stillInAuthFlow = isOktaUrl(pageStatus.url);

                    console.log("GenesisAI Scraper: monitor snapshot", {
                        url: pageStatus.url,
                        frames: frameSnapshots.length,
                        totalTextLength,
                        maxFrameTextLength,
                        loginLikeInputs,
                        looksLikePortal,
                        stillInAuthFlow,
                        inactiveTime,
                    });

                    const hasEnoughContent = totalTextLength > 2000 || maxFrameTextLength > 1200;

                    const shouldClose = !stillInAuthFlow &&
                        loginLikeInputs === 0 &&
                        (
                            (looksLikePortal && hasEnoughContent && inactiveTime > 2000) ||
                            (inactiveTime > 5000)
                        );

                    if (shouldClose) {
                        console.log(`GenesisAI Scraper: Condition met for closing. ${looksLikePortal && hasEnoughContent ? "Portal detected." : "Inactivity timeout reached."}`);
                        cancelled = true;
                        resolve();
                        return;
                    }
                } catch (error) {
                    if (isNavigationError(error)) {
                        await sleep(250);
                        continue;
                    }

                    cancelled = true;
                    reject(error);
                    return;
                }

                await sleep(1000);
            }
        };

        void poll().catch((error) => {
            if (!cancelled) {
                cancelled = true;
                reject(error);
            }
        });

        setTimeout(() => {
            if (!cancelled) {
                cancelled = true;
                reject(new Error("Timed out waiting for the user to finish Okta authentication and reach the portal."));
            }
        }, 300000);
    });
}
