/** Safe localStorage reads for useState lazy initializers (avoids effect hydration). */

export function readLocalStorage(key: string): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function readLocalStorageJson<T>(key: string): T | null {
    const raw = readLocalStorage(key);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}
