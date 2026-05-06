
// This file is modified to be safe for both Node and Browser environments.
// Puppeteer and fs will only be imported and used in a Node environment.

export async function scrapePortal(url: string, user?: string, pass?: string): Promise<string> {
  console.log(`Budd-ie Scraper: Starting mission for ${url}`);
  
  if (typeof window !== 'undefined') {
    // We are in the browser (Android WebView or Web)
    console.warn("Budd-ie Agent: Direct scraping is not supported in the browser. Call the /api/scrape endpoint.");
    return `[BROWSER_SCRAPE_SIMULATION] Simulated content for ${url}. Please use the server-side scraper for real data.`;
  }

  // Use dynamic imports for Node-only modules
  const puppeteer = (await import('puppeteer-core')).default;
  const fs = await import('fs');

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

  let browser;
  try {
    const executablePath = getExecutablePath();
    console.log(`Budd-ie Scraper: Using browser at ${executablePath}`);

    browser = await puppeteer.launch({
      executablePath,
      headless: false, // Make it visible so the user can see what's happening or log in
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });

    const [page] = await browser.pages();
    
    // Set a timeout of 60 seconds
    page.setDefaultNavigationTimeout(60000);

    console.log(`Budd-ie Scraper: Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Handle Login if credentials provided
    if (user && pass) {
      console.log("Budd-ie Scraper: Attempting automatic login...");
      try {
        // Common login selectors
        await page.waitForSelector('input[type="text"], input[type="email"], input[name="username"]', { timeout: 5000 });
        await page.type('input[type="text"], input[type="email"], input[name="username"]', user);
        
        await page.waitForSelector('input[type="password"]', { timeout: 5000 });
        await page.type('input[type="password"]', pass);
        
        await Promise.all([
          page.keyboard.press('Enter'),
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {})
        ]);
      } catch (loginErr) {
        console.log("Budd-ie Scraper: Automatic login failed or not found. Switching to manual intervention.");
      }
    }

    // Wait for manual intervention or successful landing
    console.log("Budd-ie Scraper: Waiting for user to reach dashboard or 5s of inactivity...");
    await handleManualIntervention(page);

    // SEARCH FIX: Wait for common LMS content indicators
    console.log("Budd-ie Scraper: Analyzing page content...");
    await page.waitForFunction(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('assignment') || 
               text.includes('course') || 
               text.includes('grade') || 
               text.includes('schedule') ||
               text.includes('module') ||
               text.includes('announcement');
    }, { timeout: 10000 }).catch(() => console.log("Budd-ie Scraper: Content indicators not found, continuing anyway."));

    // Extract the content
    const content = await page.evaluate(() => {
        // Remove scripts, styles, and other noise
        const clone = document.documentElement.cloneNode(true) as HTMLElement;
        const toRemove = clone.querySelectorAll('script, style, iframe, noscript, .nav-bar, .footer, footer, header, .sidebar');
        toRemove.forEach(el => el.remove());
        
        // Return text content and some structural hints
        return clone.innerText;
    });

    console.log(`Budd-ie Scraper: Mission complete. Extracted ${content.length} characters.`);
    await browser.close();
    return content;

  } catch (error: any) {
    console.error("Budd-ie Scraper: Mission Failed!", error);
    if (browser) await browser.close();
    throw error;
  }
}


async function handleManualIntervention(page: any) {
  // Inject inactivity tracker and the "Done" button
  const injectTools = async () => {
    await page.evaluate(() => {
      // Inactivity Tracker
      (window as any).lastActivity = Date.now();
      if (!(window as any).buddieInitialized) {
          const updateActivity = () => { (window as any).lastActivity = Date.now(); };
          ['mousemove', 'keydown', 'mousedown', 'scroll'].forEach(ev => window.addEventListener(ev, updateActivity));
          (window as any).buddieInitialized = true;
      }

      // Floating "Done" Button
      if (!document.getElementById('budd-ie-finish-btn')) {
          const btn = document.createElement('button');
          btn.id = 'budd-ie-finish-btn';
          btn.innerHTML = '✨ Finish Login & Scan';
          btn.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 2147483647;
            padding: 16px 28px;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            color: white;
            border: 2px solid rgba(255,255,255,0.2);
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            font-weight: 800;
            font-size: 16px;
            font-family: system-ui, -apple-system, sans-serif;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          `;
          
          btn.onmouseover = () => { btn.style.transform = 'scale(1.05) translateY(-5px)'; };
          btn.onmouseout = () => { btn.style.transform = 'scale(1) translateY(0)'; };
          
          btn.onclick = () => {
            (window as any).buddieFinished = true;
            btn.innerHTML = '🚀 Resuming...';
            btn.disabled = true;
          };
          
          document.body.appendChild(btn);
      }
    });
  };

  return new Promise<void>((resolve) => {
    const checkInactivity = setInterval(async () => {
      try {
        await injectTools();

        const status = await page.evaluate(() => {
            return {
                finished: (window as any).buddieFinished,
                lastActivity: (window as any).lastActivity
            };
        });

        const inactiveTime = Date.now() - status.lastActivity;
        
        if (status.finished || inactiveTime > 8000) {
            clearInterval(checkInactivity);
            resolve();
        }
      } catch (e) {
        clearInterval(checkInactivity);
        resolve();
      }
    }, 1000);

    // Max 5 minutes total
    setTimeout(() => {
      clearInterval(checkInactivity);
      resolve();
    }, 300000);
  });
}
