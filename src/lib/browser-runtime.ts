import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Find a real installed browser; never report a platform guess as an executable. */
export function findBrowserExecutable(options: {
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    home?: string;
    exists?: (file: string) => boolean;
} = {}): string {
    const platform = options.platform ?? process.platform;
    const env = options.env ?? process.env;
    const home = options.home ?? os.homedir();
    const exists = options.exists ?? fs.existsSync;
    const explicit = env.AGENDA_BROWSER_EXECUTABLE || env.PUPPETEER_EXECUTABLE_PATH;
    if (explicit) {
        if (!exists(explicit)) throw new Error('The configured portal browser executable does not exist.');
        return explicit;
    }
    let candidates: string[];
    if (platform === 'win32') {
        const roots = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA,
            'C:\\Program Files', 'C:\\Program Files (x86)'].filter(Boolean) as string[];
        candidates = roots.flatMap(root => [
            path.win32.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.win32.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ]);
    } else if (platform === 'darwin') {
        candidates = ['/Applications', path.join(home, 'Applications')].flatMap(root => [
            path.join(root, 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
            path.join(root, 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge'),
            path.join(root, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
        ]);
    } else {
        candidates = ['/usr/bin', '/usr/local/bin', '/snap/bin', ...(env.PATH || '').split(path.delimiter)]
            .filter(Boolean).flatMap(root => ['google-chrome', 'google-chrome-stable', 'chromium',
                'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable'].map(name => path.join(root, name)));
    }
    const found = candidates.find(file => exists(file));
    if (!found) throw new Error('Install Chrome, Chromium or Edge for automatic portal extraction, or set AGENDA_BROWSER_EXECUTABLE. Text import and local practice remain available.');
    return found;
}
