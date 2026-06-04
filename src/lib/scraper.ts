// This file is modified to be safe for both Node and Browser environments.
// Puppeteer and fs will only be imported and used in a Node environment.

let sharedBrowser: unknown;
let sharedBrowserPromise: Promise<unknown> | null = null;
let sharedBrowserVisible = false;
const SHARED_BROWSER_PROFILE_DIR = "C:\\AgendaPlusv2\\.portal-browser-profile";

export async function scrapePortal(url: string, user?: string, pass?: string): Promise<string> {
    console.log(`GenesisAI Scraper: Starting mission for ${url}`);

    if (typeof window !== 'undefined') {
        // We are in the browser (Android WebView or Web)
        console.warn("GenesisAI Agent: Direct scraping is not supported in the browser. Call the /api/scrape endpoint.");
        return `[BROWSER_SCRAPE_SIMULATION] Simulated content for ${url}. Please use the server-side scraper for real data.`;
    }

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
            throw new Error('No Chrome or Edge installation found. Please install a browser to use the scraper.');
        }
        // Default for Linux/Mac (adjust as needed)
        return '/usr/bin/google-chrome';
    }

    try {
        const executablePath = getExecutablePath();
        let browser = await getSharedBrowser(puppeteer, executablePath, fs, false) as any;

        let [page] = await browser.pages();

        // Set a timeout of 60 seconds
        (page as any).setDefaultNavigationTimeout(60000);
        console.log(`GenesisAI Scraper: Navigating to ${url}...`);
        await (page as any).goto(url, {waitUntil: 'networkidle2'});
        console.log(`GenesisAI Scraper: Navigation to ${url} successful.`);

        const needsInteractiveLogin = async () => {
            if (isOktaUrl((page as any).url())) {
                return true;
            }

            try {
                return await (page as any).evaluate(`(() => {
                    return Array.from(document.querySelectorAll("input")).some((input) => {
                        const type = (input.type || "").toLowerCase();
                        const name = (input.name || "").toLowerCase();
                        const id = (input.id || "").toLowerCase();
                        const placeholder = (input.placeholder || "").toLowerCase();

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
                    });
                })()`);
            } catch {
                return false;
            }
        };

        if (!sharedBrowserVisible && await needsInteractiveLogin()) {
            console.log("GenesisAI Scraper: Login required. Opening visible browser for authentication.");
            await (browser as any).close().catch(() => {});
            sharedBrowser = null;
            sharedBrowserPromise = null;

            browser = await getSharedBrowser(puppeteer, executablePath, fs, true);
            [page] = await (browser as any).pages();
            (page as any).setDefaultNavigationTimeout(60000);
            await (page as any).goto(url, {waitUntil: 'networkidle2'});
        } else {
            console.log("GenesisAI Scraper: Existing portal session available. Continuing silently.");
        }

        // Handle Login if credentials provided
        if (user && pass) {
            console.log("GenesisAI Scraper: Attempting automatic login...");
            try {
                // Common login selectors for username/email
                const userSelectors = [
                    'input[type="text"]',
                    'input[type="email"]',
                    'input[name="username"]',
                    'input[name="loginfmt"]', // Microsoft/Okta
                    '#username',
                    '#userNameInput',
                    '#login',
                    '[autocomplete="username"]'
                ];

                const passSelectors = [
                    'input[type="password"]',
                    'input[name="password"]',
                    '#password',
                    '#passwordInput',
                    '[autocomplete="current-password"]'
                ];

                const submitSelectors = [
                    'button[type="submit"]',
                    'input[type="submit"]',
                    '#submitButton',
                    '#nextButton', // Multi-step login
                    '.btn-primary',
                    'button:not([disabled])'
                ];

                // Check if we are already logged in
                const bodyText = await (page as any).evaluate(() => document.body.innerText.toLowerCase());
                const looksLoggedIn = ["logout", "sign out", "dashboard", "my courses"].some(term => (bodyText as string).includes(term));

                if (!looksLoggedIn) {
                    let userFieldFound = false;
                    for (const selector of userSelectors) {
                        try {
                            await (page as any).waitForSelector(selector, {timeout: 2000});
                            await (page as any).click(selector, {clickCount: 3}); // Select all
                            await (page as any).keyboard.press('Backspace');
                            await (page as any).type(selector, user, {delay: 50});
                            userFieldFound = true;
                            break;
                        } catch (_e) {
                        }
                    }

                    if (userFieldFound) {
                        // Sometimes the password field only appears after entering username and clicking next
                        let passFieldFound = false;
                        for (const selector of passSelectors) {
                            try {
                                await (page as any).waitForSelector(selector, {timeout: 2000});
                                await (page as any).type(selector, pass, {delay: 50});
                                passFieldFound = true;
                                break;
                            } catch (_e) {
                            }
                        }

                        if (!passFieldFound) {
                            // Try clicking "Next" if password field isn't visible yet (multi-step login)
                            console.log("GenesisAI Scraper: Password field not found, trying multi-step login...");
                            for (const selector of submitSelectors) {
                                try {
                                    const btn = await (page as any).$(selector);
                                    if (btn) {
                                        await btn.click();
                                        await (page as any).waitForNavigation({
                                            waitUntil: 'networkidle2',
                                            timeout: 5000
                                        }).catch(() => {
                                        });
                                        break;
                                    }
                                } catch (_e) {
                                }
                            }

                            // Try password again
                            for (const selector of passSelectors) {
                                try {
                                    await (page as any).waitForSelector(selector, {timeout: 3000});
                                    await (page as any).type(selector, pass, {delay: 50});
                                    passFieldFound = true;
                                    break;
                                } catch (_e) {
                                }
                            }
                        }

                        if (passFieldFound) {
                            await (page as any).keyboard.press('Enter');
                            await (page as any).waitForNavigation({waitUntil: 'networkidle2', timeout: 10000}).catch(() => {
                            });
                        }
                    }
                } else {
                    console.log("GenesisAI Scraper: Already looks logged in, skipping automated credentials.");
                }
            } catch (loginErr) {
                console.log("GenesisAI Scraper: Automatic login encountered issues. Switching to manual intervention.", loginErr);
            }
        }

        // Wait for manual intervention or successful landing
        console.log("GenesisAI Scraper: Waiting for user to reach dashboard or 5s of inactivity...");
        await handleManualIntervention(page);
        console.log("GenesisAI Scraper: Manual intervention phase completed.");

        let activePage = page;
        const pages = await (browser as any).pages();
        activePage = (pages as any[]).find((candidate: any) => !candidate.isClosed()) || page;

        const activeUrl = (activePage as any).url();

        // D2L interface targeting
        if (activeUrl.includes('d2l') && (activeUrl.includes('/lms/home.d2l') || activeUrl.includes('/d2l/home/'))) {
            console.log("GenesisAI Scraper: D2L detected. Aggregating course data...");
            try {
                const match = activeUrl.match(/[?&]ou=(\d+)/) || activeUrl.match(/\/d2l\/home\/(\d+)/);
                const origin = new URL(activeUrl).origin;
                const ou = match?.[1];

                if (ou) {
                    const targets = [
                        { name: 'Assignments', url: `${origin}/d2l/lms/dropbox/user/folders_list.d2l?ou=${ou}&isprv=0` },
                        { name: 'Quizzes', url: `${origin}/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${ou}` },
                        { name: 'Discussions', url: `${origin}/d2l/lms/discussions/user/discussions_list.d2l?ou=${ou}` },
                        { name: 'Grades', url: `${origin}/d2l/lms/grades/user/grades_list.d2l?ou=${ou}` }
                    ];

                    let aggregatedContent = "";

                    for (const target of targets) {
                        console.log(`GenesisAI Scraper: Visiting ${target.name} area: ${target.url}`);
                        try {
                            await (activePage as any).goto(target.url, {
                                waitUntil: 'networkidle2',
                                timeout: 10000
                            });
                            
                            // Extract content from current page/frames
                            const frames = (activePage as any).frames();
                            const frameTexts = await Promise.all(
                                (frames as any[]).map(async (frame: any) => {
                                    try {
                                        if (frame.isDetached()) return "";
                                        return await frame.evaluate(`(() => {
                                            const clone = document.documentElement.cloneNode(true);
                                            const toRemove = clone.querySelectorAll('script, style, noscript, .nav-bar, .footer, footer, header, .sidebar');
                                            toRemove.forEach((element) => element.remove());
                                            return clone.innerText;
                                        })()`);
                                    } catch { return ""; }
                                })
                            );
                            
                            const pageContent = Array.from(new Set(frameTexts.filter((text) => (text as string).length > 0))).join("\n");
                            aggregatedContent += `\n\n=== SECTION: ${target.name} ===\n\n${pageContent}`;
                        } catch (err) {
                            console.warn(`GenesisAI Scraper: Failed to extract ${target.name}`, err);
                        }
                    }

                    console.log(`GenesisAI Scraper: Multi-section extraction complete. Total: ${aggregatedContent.length} chars.`);
                    return aggregatedContent;

                } else {
                    console.warn(`GenesisAI Scraper: Could not infer D2L org unit from ${activeUrl}`);
                }
            } catch (err) {
                console.warn("GenesisAI Scraper: D2L data aggregation failed", err);
            }
        }

        if (isOktaUrl(activeUrl)) {
            throw new Error(`Authentication did not complete. The monitored browser is still on Okta: ${activeUrl}`);
        }

        // SEARCH FIX: Wait for common LMS content indicators
        console.log("GenesisAI Scraper: Analyzing page content for LMS indicators...");
        try {
            await (activePage as any).waitForFunction(`(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('assignment') || 
                 text.includes('course') || 
                 text.includes('grade') || 
                 text.includes('schedule') ||
                 text.includes('module') ||
                 text.includes('announcement');
      })()`, {timeout: 10000});
            console.log("GenesisAI Scraper: LMS content indicators found.");
        } catch (_error) {
            console.log("GenesisAI Scraper: Content indicators not found or frame changed, continuing anyway.");
        }

        // Extract content from the main page and all accessible frames.
        const frames = (activePage as any).frames();
        console.log(`GenesisAI Scraper: Inspecting ${frames.length} frame(s).`);

        const frameTexts = await Promise.all(
            (frames as any[]).map(async (frame: any, index: number) => {
                try {
                    if (frame.isDetached()) {
                        console.log(`GenesisAI Scraper: Frame ${index} is detached.`);
                        return "";
                    }

                    const text = await frame.evaluate(`(() => {
            const clone = document.documentElement.cloneNode(true);
            const toRemove = clone.querySelectorAll('script, style, noscript, .nav-bar, .footer, footer, header, .sidebar');
            toRemove.forEach((element) => element.remove());
            return clone.innerText;
          })()`);

                    console.log(`GenesisAI Scraper: Frame ${index} extracted ${typeof text === "string" ? text.length : 0} characters.`);
                    return typeof text === "string" ? text.trim() : "";
                } catch (_error) {
                    console.log(`GenesisAI Scraper: Frame ${index} extraction failed.`);
                    return "";
                }
            })
        );

        const content = Array.from(new Set(frameTexts.filter((text) => text.length > 0))).join("\n\n--- FRAME BREAK ---\n\n");

        console.log(`GenesisAI Scraper: Mission complete. Extracted ${content.length} characters.`);
        console.log(`GenesisAI Scraper: Preview => ${content.slice(0, 500).replace(/\s+/g, " ")}`);

        return content;

    } catch (error: unknown) {
        console.error("GenesisAI Scraper: Mission Failed!", error);
        throw error;
    }
}

async function getSharedBrowser(puppeteer: any, executablePath: string, fs: typeof import("fs"), visible = false) {
    if (sharedBrowser && (sharedBrowser as any).isConnected() && sharedBrowserVisible === visible) {
        return sharedBrowser;
    }

    if (sharedBrowser && (sharedBrowser as any).isConnected()) {
        await (sharedBrowser as any).close().catch(() => {});
        sharedBrowser = null;
    }

    if (sharedBrowserPromise) {
        return sharedBrowserPromise;
    }

    sharedBrowserPromise = (async () => {
        try {
            if (!fs.existsSync(SHARED_BROWSER_PROFILE_DIR)) {
                fs.mkdirSync(SHARED_BROWSER_PROFILE_DIR, {recursive: true});
            }

            console.log(`GenesisAI Scraper: Using browser at ${executablePath}`);
            console.log(`GenesisAI Scraper: Using persistent profile at ${SHARED_BROWSER_PROFILE_DIR}`);

            const browser = await puppeteer.launch({
                executablePath,
                headless: visible ? false : "new",
                defaultViewport: null,
                userDataDir: SHARED_BROWSER_PROFILE_DIR,
                args: [
                    visible ? '--start-maximized' : '--window-position=-32000,-32000',
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            });

            sharedBrowser = browser;
            sharedBrowserVisible = visible;
            return browser;
        } finally {
            sharedBrowserPromise = null;
        }
    })();

    return sharedBrowserPromise;
}


async function handleManualIntervention(page: unknown) {
    const isOktaUrl = (url: string) => /(^https?:\/\/)?[^/]*okta\.com/i.test(url);
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const isNavigationError = (error: unknown) => {
        const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
        return (
            message.includes("execution context was destroyed") ||
            message.includes("cannot find context") ||
            message.includes("target closed") ||
            message.includes("session closed") ||
            message.includes("detached frame")
        );
    };

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
