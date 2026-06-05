// This file is modified to be safe for both Node and Browser environments.
// Puppeteer and fs will only be imported and used in a Node environment.

let sharedBrowser: any = null;
let sharedBrowserPromise: Promise<any> | null = null;
let sharedBrowserVisible = false;
const SHARED_BROWSER_PROFILE_DIR = process.env.AGENDA_PORTAL_PROFILE_DIR
    || `${process.cwd()}\\.portal-browser-profile`;

// Mutex to serialize all scraping missions and prevent concurrent browser launches
let scraperMutex = Promise.resolve();

type StructuredPortalItem = {
    task: string;
    dueDate?: string | null;
    details?: string | null;
    href?: string | null;
};

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

export type ScrapePortalOptions = {
    /** When true, reuse the saved portal profile without opening a visible login window. */
    sessionReady?: boolean;
};

async function pageLooksLoggedIn(page: any): Promise<boolean> {
    try {
        return await page.evaluate(`(() => {
            const text = (document.body?.innerText || "").toLowerCase();
            const href = (location.href || "").toLowerCase();
            if (href.includes("okta.com") && !href.includes("callback")) return false;
            const signedIn = ["logout", "log out", "sign out", "my courses", "course home", "d2l/home", "dropbox", "assignments"]
                .some((token) => text.includes(token));
            const visiblePassword = Array.from(document.querySelectorAll('input[type="password"]'))
                .some((input) => {
                    const el = input;
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && !el.disabled;
                });
            return signedIn && !visiblePassword;
        })()`);
    } catch {
        return false;
    }
}

async function getOrCreatePortalPage(browser: any, url: string) {
    const pages = (await listBrowserPages(browser)).filter((candidate: any) => {
        try {
            return candidate && !candidate.isClosed();
        } catch {
            return false;
        }
    });

    let host = "";
    try {
        host = new URL(url).hostname;
    } catch {
        host = "";
    }

    const portalPage = pages.find((candidate: any) => {
        try {
            const pageUrl = candidate.url();
            return pageUrl.includes("d2l") || (host && pageUrl.includes(host));
        } catch {
            return false;
        }
    });

    if (portalPage) {
        return portalPage;
    }

    const reusable = pages.find((candidate: any) => {
        try {
            const pageUrl = candidate.url();
            return pageUrl === "about:blank" || pageUrl === "chrome://newtab/";
        } catch {
            return false;
        }
    }) || pages[0];

    if (reusable) {
        return reusable;
    }

    return browser.newPage();
}

async function pruneExtraTabs(browser: any, keepPage: any) {
    const pages = await listBrowserPages(browser);
    for (const candidate of pages) {
        if (candidate === keepPage) continue;
        try {
            if (!candidate.isClosed()) {
                await candidate.close();
            }
        } catch {
            // ignore stale tabs
        }
    }
}

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

/** Pull assignment/quiz rows from D2L tables instead of relying on messy innerText. */
async function enrichStructuredAssignmentDueDates(page: any, structuredBlock: string): Promise<string> {
    const header = /===\s*STRUCTURED:\s*Assignments\s*===\s*/i;
    if (!header.test(structuredBlock)) {
        return structuredBlock;
    }

    const jsonText = structuredBlock.replace(header, "").trim();
    let payload: { course?: string; items?: StructuredPortalItem[] };
    try {
        payload = JSON.parse(jsonText);
    } catch {
        return structuredBlock;
    }

    const items = payload.items || [];
    const pending = items.filter((item) => !item.dueDate && item.href);
    if (pending.length === 0) {
        return structuredBlock;
    }

    const { findDueDateInBlob, isReasonableDueDate } = await import("@/lib/due-date-inference");
    const anchor = new Date();
    const anchorYear = anchor.getFullYear();
    const limit = Math.min(pending.length, 15);

    console.log(`GenesisAI Scraper: Resolving due dates from ${limit} assignment detail pages...`);

    for (const item of pending.slice(0, limit)) {
        if (!item.href) continue;
        try {
            await safeGoto(page, item.href, 25000);
            await sleep(1000);

            const dueFromDom = await page.evaluate(`(() => {
                const parseNamed = (raw) => {
                    const text = (raw || "").replace(/\\s+/g, " ").trim();
                    const iso = text.match(/(\\d{4}-\\d{2}-\\d{2})/);
                    if (iso) return iso[1];
                    const named = text.match(/([A-Za-z]+)\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?/);
                    if (!named) return null;
                    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
                    const m = months[named[1].slice(0,3).toLowerCase()];
                    if (m === undefined) return null;
                    const y = named[3] ? Number(named[3]) : new Date().getFullYear();
                    return y + "-" + String(m + 1).padStart(2, "0") + "-" + named[2].padStart(2, "0");
                };

                for (const timeEl of document.querySelectorAll("time[datetime]")) {
                    const dt = timeEl.getAttribute("datetime") || "";
                    const iso = dt.match(/(\\d{4}-\\d{2}-\\d{2})/);
                    if (iso) return iso[1];
                }

                const labelWords = ["due date", "end date", "deadline", "closes", "available until"];
                for (const el of document.querySelectorAll("label, dt, th, .d2l-label, .d2l-datalabel")) {
                    const label = (el.textContent || "").trim().toLowerCase();
                    if (!labelWords.some((w) => label === w || label.startsWith(w))) continue;
                    const sibling = el.nextElementSibling || el.parentElement?.querySelector(".d2l-datalabel-value, dd, time, span");
                    const parsed = parseNamed(sibling?.textContent || el.parentElement?.textContent || "");
                    if (parsed) return parsed;
                }

                const body = document.body?.innerText || "";
                const labeled = body.match(/(?:due\\s*date|end\\s*date)\\s*[:\\-]?\\s*([A-Za-z]+\\s+\\d{1,2},?\\s*\\d{4})/i);
                return labeled ? parseNamed(labeled[1]) : null;
            })()`);

            let dueDate = dueFromDom || null;
            if (!dueDate) {
                const detailText = await extractVisibleText(page);
                dueDate = findDueDateInBlob(detailText, anchorYear, anchor);
            }

            if (dueDate && isReasonableDueDate(dueDate, anchor)) {
                item.dueDate = dueDate;
                console.log(`GenesisAI Scraper: Found due date for "${item.task}": ${dueDate}`);
            }
        } catch (error) {
            console.warn(`GenesisAI Scraper: Could not read due date from ${item.href}`, error);
        }
    }

    return `\n\n=== STRUCTURED: Assignments ===\n${JSON.stringify(payload)}\n`;
}

async function extractD2LStructured(page: any, sectionName: string): Promise<string> {
    try {
        const payload = await page.evaluate(`((section) => {
            const normalize = (value) => (value || "").replace(/\\s+/g, " ").trim();
            const parseDue = (text) => {
                const raw = normalize(text);
                if (!raw) return null;
                const iso = raw.match(/(\\d{4})-(\\d{2})-(\\d{2})/);
                if (iso) return iso[0];
                const slash = raw.match(/(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?/);
                if (slash) {
                    const year = slash[3] ? (slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3])) : new Date().getFullYear();
                    return year + "-" + slash[1].padStart(2, "0") + "-" + slash[2].padStart(2, "0");
                }
                const named = raw.match(/([A-Za-z]+)\\s+(\\d{1,2})(?:,?\\s*(\\d{4}))?/);
                if (named) {
                    const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
                    const month = months[named[1].slice(0,3).toLowerCase()];
                    if (month === undefined) return null;
                    const year = named[3] ? Number(named[3]) : new Date().getFullYear();
                    return year + "-" + String(month + 1).padStart(2, "0") + "-" + named[2].padStart(2, "0");
                }
                return null;
            };

            const parseDueFromNode = (node) => {
                if (!node) return null;
                const timeEl = node.querySelector("time[datetime]");
                if (timeEl) {
                    const dt = timeEl.getAttribute("datetime") || "";
                    const iso = dt.match(/(\\d{4}-\\d{2}-\\d{2})/);
                    if (iso) return iso[1];
                }
                const labeled = (node.textContent || "").match(/(?:due|end)\\s*date\\s*[:\\-]?\\s*([A-Za-z]+\\s+\\d{1,2}[^\\n,]{0,20}(?:\\d{4})?)/i);
                if (labeled) return parseDue(labeled[1]);
                return null;
            };

            const heading = document.querySelector(".d2l-page-heading, h1, h2");
            let course = normalize(heading ? heading.textContent : "");
            course = course.replace(/^(Quiz\\s*List|Assignments|Quizzes|Discussions|Grades)\\s*[-–—]\\s*/i, "");

            const items = [];
            const seen = new Set();

            const sectionLower = (section || "").toLowerCase();
            const isDiscussions = sectionLower.includes("discussion");
            const isQuizzes = sectionLower.includes("quiz");
            const isAssignments = sectionLower.includes("assignment");
            const isGrades = sectionLower.includes("grade");

            const acceptTitle = (title) => {
                if (!title || title.length < 5) return false;
                if (/hit a key|stay logged in|view history|completion status|evaluation status|national university/i.test(title)) return false;
                if (isDiscussions) {
                    return title.length >= 5 && !/^(name|due date|topic|threads|posts|forum)$/i.test(title);
                }
                if (isQuizzes) {
                    return title.length >= 5 && !/^(name|due date|status|attempts|score)$/i.test(title);
                }
                if (isAssignments) {
                    if (/are you still there|quiz\s*list|view history|oh,?\s*there you are/i.test(title)) return false;
                    return /assignment\s*\d+\s*:/i.test(title) || (title.length >= 8 && !/^(name|due date|status|score|feedback|actions)$/i.test(title));
                }
                const isAnnouncements = sectionLower.includes("announcement");
                if (isAnnouncements) {
                    return title.length >= 10 && !/^(name|date|posted|author)$/i.test(title);
                }
                return title.length >= 8;
            };

            const pushItem = (task, dueText, details, href) => {
                const title = normalize(task);
                if (!acceptTitle(title)) return;
                const dueDate = parseDue(dueText || "");
                const key = sectionLower + "|" + title.toLowerCase();
                if (seen.has(key)) return;
                seen.add(key);
                items.push({ task: title, dueDate: dueDate || null, details: normalize(details) || null, href: href || null });
            };

            let currentWeek = null;

            document.querySelectorAll("table").forEach((table) => {
                const headerCells = [...table.querySelectorAll("thead th, tr th")].map((cell) => normalize(cell.textContent).toLowerCase());
                const dueIdx = headerCells.findIndex((h) => h.includes("due") || h.includes("end date"));
                const nameIdx = headerCells.findIndex((h) => h === "name" || h.includes("title") || h.includes("assignment") || h.includes("submission"));

                table.querySelectorAll("tbody tr").forEach((row) => {
                    const cells = [...row.querySelectorAll("td")];
                    const rowText = normalize(row.textContent);
                    const weekHeader = rowText.match(/^week\s*(\d{1,2})\b/i);
                    if (weekHeader && (!cells.length || cells.length <= 2)) {
                        currentWeek = weekHeader[1];
                        return;
                    }
                    if (cells.length === 0) return;
                    const link = row.querySelector("a[href*='dropbox'], a[href*='folders'], a[href]");
                    const nameCell = nameIdx >= 0 ? cells[nameIdx] : cells[0];
                    const task = normalize(link ? link.textContent : nameCell ? nameCell.textContent : "");
                    const dueCell = dueIdx >= 0 ? cells[dueIdx] : null;
                    let dueText = dueCell ? dueCell.textContent : "";
                    if (!dueText) dueText = parseDueFromNode(row) || "";
                    const weekHint = currentWeek ? "Week " + currentWeek : "";
                    pushItem(task, dueText, weekHint, link ? link.href : null);
                });
            });

            if (isGrades) {
                document.querySelectorAll("tr").forEach((row) => {
                    const rowText = normalize(row.textContent);
                    const rowTextLower = rowText.toLowerCase();
                    if (rowTextLower.includes("final calculated grade") || rowTextLower.includes("final grade") || rowTextLower.includes("calculated grade")) {
                        let gradePct = "";
                        row.querySelectorAll("td, th").forEach((cell) => {
                            const text = normalize(cell.textContent);
                            const match = text.match(/(\d{1,3}(?:\.\d+)?\s*%)/);
                            if (match) {
                                gradePct = match[1];
                            }
                        });
                        if (gradePct) {
                            pushItem("Final Calculated Grade", "", gradePct, null);
                        }
                    }
                });
                return { section, course, items };
            }

            if (isAssignments) {
                document.querySelectorAll("a[href*='dropbox'], a[href*='folders_list']").forEach((link) => {
                    const task = normalize(link.textContent || "");
                    if (!acceptTitle(task)) return;
                    const row = link.closest("tr");
                    let dueText = "";
                    let weekHint = currentWeek ? "Week " + currentWeek : "";
                    if (row) {
                        dueText = parseDueFromNode(row) || "";
                        const prevRows = row.parentElement ? [...row.parentElement.querySelectorAll("tr")] : [];
                        const idx = prevRows.indexOf(row);
                        for (let i = idx - 1; i >= 0 && i >= idx - 6; i--) {
                            const weekMatch = normalize(prevRows[i].textContent).match(/^week\\s*(\\d{1,2})\\b/i);
                            if (weekMatch) {
                                weekHint = "Week " + weekMatch[1];
                                break;
                            }
                        }
                    }
                    pushItem(task, dueText, weekHint, link.href || null);
                });
                return { section, course, items };
            }

            if (isDiscussions) {
                document.querySelectorAll("a[href*='discussions'], a[href*='topic']").forEach((link) => {
                    const task = normalize(link.textContent || "");
                    if (!acceptTitle(task)) return;
                    pushItem(task, "", "", link.href || null);
                });
                return { section, course, items };
            }

            document.querySelectorAll("d2l-list-item, .d2l-datalist-item, li").forEach((node) => {
                const link = node.querySelector("a[href]");
                const task = normalize(link ? link.textContent : node.textContent);
                if (!task) return;
                pushItem(task, node.textContent, "", link ? link.href : null);
            });

            return { section, course, items };
        })(${JSON.stringify(sectionName)})`);

        if (!payload?.items?.length) {
            return "";
        }

        return `\n\n=== STRUCTURED: ${sectionName} ===\n${JSON.stringify(payload)}\n`;
    } catch (error) {
        console.warn(`GenesisAI Scraper: Structured ${sectionName} extraction failed`, error);
        return "";
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

export async function scrapePortal(
    url: string,
    user?: string,
    pass?: string,
    options?: ScrapePortalOptions
): Promise<string> {
    console.log(`GenesisAI Scraper: Starting mission for ${url}`, {
        sessionReady: Boolean(options?.sessionReady),
    });

    if (typeof window !== 'undefined') {
        console.warn("GenesisAI Agent: Direct scraping is not supported in the browser. Call the /api/scrape endpoint.");
        return `[BROWSER_SCRAPE_SIMULATION] Simulated content for ${url}.`;
    }

    // Wrap the entire mission in a mutex to prevent concurrent Puppeteer launches with the same profile
    return new Promise((resolve, reject) => {
        scraperMutex = scraperMutex.then(async () => {
            try {
                const result = await runScrapingMission(url, user, pass, options);
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

async function runScrapingMission(
    url: string,
    user?: string,
    pass?: string,
    options?: ScrapePortalOptions
): Promise<string> {
    const { normalizePortalScrapeUrl } = await import("@/lib/d2l-portal");
    url = normalizePortalScrapeUrl(url);

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
    const sessionReady = Boolean(options?.sessionReady);
    const browserAlreadyRunning = Boolean(sharedBrowser?.isConnected());

    // One browser for the whole app session. Visible window only for first-time login.
    const launchVisible = !sessionReady && !browserAlreadyRunning;
    let browser = await getSharedBrowser(puppeteer, executablePath, fs, launchVisible);
    let page = await getOrCreatePortalPage(browser, url);

    try {
        page.setDefaultNavigationTimeout(60000);
        console.log(`GenesisAI Scraper: Navigating to ${url} (reuse tab: ${browserAlreadyRunning})...`);
        await safeGoto(page, url);

        const loggedIn = await pageLooksLoggedIn(page);

        if (!loggedIn && !sharedBrowserVisible) {
            console.log("GenesisAI Scraper: Login required. Opening visible browser once.");
            await browser.close().catch(() => {});
            sharedBrowser = null;
            sharedBrowserPromise = null;

            browser = await getSharedBrowser(puppeteer, executablePath, fs, true);
            page = await getOrCreatePortalPage(browser, url);
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

        let readyAfterNav = await pageLooksLoggedIn(page);
        if (!readyAfterNav) {
            await handleManualIntervention(page);
            readyAfterNav = await pageLooksLoggedIn(page);
        } else {
            console.log("GenesisAI Scraper: Reusing saved portal session (no login window).");
            await sleep(1500);
        }

        if (sharedBrowserVisible && readyAfterNav) {
            ({ browser, page } = await hideBrowserAfterLogin(puppeteer, executablePath, fs, browser, page));
        }

        let activePage = await getStablePage(browser, page);
        if (!activePage || activePage.isClosed()) {
            throw new Error("Portal browser closed before scraping could finish. Keep the login window open and try Rescan.");
        }

        const activeUrl = activePage.url();

        const d2lOuMatch =
            activeUrl.match(/[?&]ou=(\d+)/) ||
            activeUrl.match(/\/d2l\/home\/(\d+)/) ||
            activeUrl.match(/\/le\/lessons\/(\d+)/) ||
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
                        { name: 'Calendar', url: `${origin}/d2l/le/calendar/${ou}/events` },
                        { name: 'Quizzes', url: `${origin}/d2l/lms/quizzing/user/quizzes_list.d2l?ou=${ou}` },
                        { name: 'Discussions', url: `${origin}/d2l/lms/discussions/user/discussions_list.d2l?ou=${ou}` },
                        { name: 'Announcements', url: `${origin}/d2l/lms/news/user/news_list.d2l?ou=${ou}` },
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
                            await sleep(1500);

                            const isErrorPage = await activePage.evaluate(() => {
                                const title = (document.title || "").toLowerCase();
                                const bodyText = (document.body?.innerText || "").toLowerCase();
                                const h1Texts = Array.from(document.querySelectorAll("h1")).map(h => (h.textContent || "").toLowerCase());
                                return title.includes("page not found") ||
                                    title.includes("404") ||
                                    title.includes("not authorized") ||
                                    title.includes("access denied") ||
                                    bodyText.includes("page not found") ||
                                    bodyText.includes("page you are looking for cannot be found") ||
                                    bodyText.includes("not authorized") ||
                                    bodyText.includes("access denied") ||
                                    h1Texts.some(t => t.includes("not found") || t.includes("error"));
                            }).catch(() => false);

                            if (isErrorPage) {
                                console.warn(`GenesisAI Scraper: Skipping ${target.name} due to Page Not Found or Access Denied on D2L.`);
                                continue;
                            }

                            let structured = await extractD2LStructured(activePage, target.name);
                            if (target.name === "Assignments" && structured) {
                                structured = await enrichStructuredAssignmentDueDates(activePage, structured);
                            }
                            const pageContent = await extractVisibleText(activePage);
                            console.log(`GenesisAI Scraper: ${target.name} extracted ${pageContent.length} characters (${structured ? "structured" : "text only"}).`);
                            aggregatedContent += structured + `\n\n=== SECTION: ${target.name} ===\n\n${pageContent}`;
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

        if (isOktaUrl(activeUrl)) {
            throw new Error(`Authentication did not complete. Browser is still at: ${activeUrl}`);
        }

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
        try {
            const stable = await getStablePage(browser, page);
            if (stable) {
                await pruneExtraTabs(browser, stable);
            }
        } catch {
            // Keep shared browser alive even if tab cleanup fails.
        }
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

/** After login, close the visible Chrome window and continue in headless mode (cookies stay in profile). */
async function hideBrowserAfterLogin(
    puppeteer: any,
    executablePath: string,
    fs: typeof import("fs"),
    browser: any,
    page: any
): Promise<{ browser: any; page: any }> {
    if (!sharedBrowserVisible) {
        return { browser, page };
    }

    const stable = await getStablePage(browser, page);
    const resumeUrl = stable?.url() || page.url();
    console.log("GenesisAI Scraper: Login complete — hiding sign-in browser.");

    await browser.close().catch(() => {});
    sharedBrowser = null;
    sharedBrowserPromise = null;
    sharedBrowserVisible = false;

    const headlessBrowser = await getSharedBrowser(puppeteer, executablePath, fs, false);
    const newPage = await getOrCreatePortalPage(headlessBrowser, resumeUrl);
    newPage.setDefaultNavigationTimeout(60000);

    if (resumeUrl && !resumeUrl.startsWith("about:")) {
        await safeGoto(newPage, resumeUrl, 45000);
        await sleep(1200);
    }

    return { browser: headlessBrowser, page: newPage };
}

async function getSharedBrowser(puppeteer: any, executablePath: string, fs: typeof import("fs"), visible = false) {
    if (sharedBrowser && sharedBrowser.isConnected()) {
        return sharedBrowser;
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

                    const hasEnoughContent = totalTextLength > 1500 || maxFrameTextLength > 1000;

                    const shouldClose = !stillInAuthFlow &&
                        loginLikeInputs === 0 &&
                        (
                            (looksLikePortal && hasEnoughContent && inactiveTime > 2500) ||
                            (looksLikePortal && !hasEnoughContent && inactiveTime > 15000)
                        );

                    if (shouldClose) {
                        const reason = looksLikePortal && hasEnoughContent 
                            ? "Portal detected with content." 
                            : "Portal detected but content is minimal (timeout).";
                        console.log(`GenesisAI Scraper: Condition met for closing. ${reason}`);
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

export async function closeSharedBrowser() {
    if (sharedBrowser) {
        console.log("GenesisAI Scraper: Closing shared browser...");
        await sharedBrowser.close().catch(() => {});
        sharedBrowser = null;
        sharedBrowserPromise = null;
        sharedBrowserVisible = false;
    }
}

if (typeof process !== "undefined") {
    const cleanup = () => {
        if (sharedBrowser) {
            sharedBrowser.close().catch(() => {});
            sharedBrowser = null;
            sharedBrowserPromise = null;
            sharedBrowserVisible = false;
        }
    };
    process.on("exit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
}
