import { Capacitor } from '@capacitor/core';
import { getElectronBackendCandidates, isElectronShell } from '@/lib/electron-bridge';

/**
 * Centralized API configuration — discovers the local Next.js API automatically.
 * No manual Backend URL is required for desktop or browser dev.
 */

const API_BASE_STORAGE_KEY = "agendaApiBaseUrl";
const API_PORT = 3000;

const normalizeEndpoint = (endpoint: string) => {
    const endpointWithLeadingSlash = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return (
        endpointWithLeadingSlash.length > 1
            ? endpointWithLeadingSlash.replace(/\/+$/, '')
            : endpointWithLeadingSlash
    );
};

export const normalizeBaseUrl = (baseUrl?: string | null) => {
    let normalized = (baseUrl || '').trim().replace(/\/+$/, '');

    if (!normalized || normalized.includes('your-api-server.com')) {
        return '';
    }

    if (/^https?:\/\/0\.0\.0\.0(?::\d+)?/i.test(normalized)) {
        normalized = normalized.replace(/0\.0\.0\.0/i, '127.0.0.1');
    }

    return normalized;
};

const uniq = (values: string[]) => Array.from(new Set(values));

const isStaticCapacitorHost = () => {
    if (typeof window === "undefined") {
        return false;
    }

    const platform = Capacitor.getPlatform();
    return (
        isElectronShell() ||
        window.location.protocol === "capacitor:" ||
        platform === "android" ||
        platform === "ios"
    );
};

const isNextDevServerOrigin = () =>
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "[::1]") &&
    window.location.port === "3000" &&
    window.location.protocol.startsWith("http");

const defaultLocalApiUrls = () => [
    `http://127.0.0.1:${API_PORT}`,
    `http://localhost:${API_PORT}`,
    `http://[::1]:${API_PORT}`,
];

/** Sync candidate list (no health probe). Manual override is lowest priority. */
export const getStaticApiBaseCandidates = (manualOverride?: string) => {
    if (typeof window === "undefined") {
        const env = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
        return env ? [env] : [];
    }

    const platform = Capacitor.getPlatform();
    const cached = normalizeBaseUrl(localStorage.getItem(API_BASE_STORAGE_KEY));
    const manual = normalizeBaseUrl(manualOverride);
    const envBackendUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

    const auto: string[] = [];

    if (cached) {
        auto.push(cached);
    }

    auto.push(...defaultLocalApiUrls());

    if (platform === "android") {
        auto.push(`http://10.0.2.2:${API_PORT}`);
    }

    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]") {
        auto.push(`${window.location.protocol}//${host}:${API_PORT}`);
    }

    if (isNextDevServerOrigin() && !isStaticCapacitorHost()) {
        auto.push("");
    }

    if (envBackendUrl) {
        auto.push(envBackendUrl);
    }

    if (manual) {
        auto.push(manual);
    }

    let unique = uniq(auto.filter(Boolean));

    if (isNextDevServerOrigin() && !isStaticCapacitorHost()) {
        unique = ["", ...unique.filter((c) => c !== "")];
    } else if (isStaticCapacitorHost()) {
        unique = unique.filter((c) => c !== "");
        unique = [
            ...unique.filter((c) => c.includes("127.0.0.1") || c.includes("localhost")),
            ...unique.filter((c) => !c.includes("127.0.0.1") && !c.includes("localhost")),
        ];
    } else {
        unique = [
            ...unique.filter((c) => c.includes(`:${API_PORT}`)),
            ...unique.filter((c) => !c.includes(`:${API_PORT}`)),
        ];
    }

    return unique.length > 0 ? unique : defaultLocalApiUrls();
};

/** Full candidate list including Electron sidecar URLs (highest priority after cache). */
export async function collectApiBaseCandidates(manualOverride?: string): Promise<string[]> {
    const electronUrls = (await getElectronBackendCandidates())
        .map((url) => normalizeBaseUrl(url))
        .filter(Boolean);

    const staticCandidates = getStaticApiBaseCandidates(manualOverride);

    if (electronUrls.length === 0) {
        return staticCandidates;
    }

    const rest = staticCandidates.filter((c) => !electronUrls.includes(c));
    return uniq([...electronUrls, ...rest]);
}

/** @deprecated Use collectApiBaseCandidates — kept for callers that expect sync list. */
export const getApiBaseCandidates = (overrideBaseUrl?: string) =>
    getStaticApiBaseCandidates(overrideBaseUrl);

export const getApiUrl = (endpoint: string, overrideBaseUrl?: string) => {
    const baseUrl = getStaticApiBaseCandidates(overrideBaseUrl)[0] || '';
    const formattedEndpoint = normalizeEndpoint(endpoint);
    return `${baseUrl}${formattedEndpoint}`;
};

const probeBackend = async (baseUrl: string) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    const healthUrl = baseUrl ? `${baseUrl}/api/health` : "/api/health";

    try {
        const response = await fetch(healthUrl, {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
        });

        if (!response.ok) {
            return false;
        }

        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        if (contentType.includes("text/html")) {
            return false;
        }

        const data = await response.json();
        return Boolean(data && (data.ok === true || data.status === "ok"));
    } catch {
        return false;
    } finally {
        window.clearTimeout(timeoutId);
    }
};

const findHealthyBase = async (candidates: string[]) => {
    const batchSize = 4;

    for (let index = 0; index < candidates.length; index += batchSize) {
        const batch = candidates.slice(index, index + batchSize);
        const probes = await Promise.all(
            batch.map(async (candidate) => ({
                candidate,
                ok: await probeBackend(candidate),
            }))
        );

        const match = probes.find((result) => result.ok);
        if (match) {
            return match.candidate;
        }
    }

    return null;
};

const persistDiscoveredBase = (baseUrl: string) => {
    localStorage.setItem(API_BASE_STORAGE_KEY, baseUrl);
    const manual = normalizeBaseUrl(localStorage.getItem("backendUrl"));
    if (manual && manual !== baseUrl) {
        localStorage.removeItem("backendUrl");
    }
};

export async function resolveApiBaseUrl(manualOverride?: string): Promise<string | null> {
    if (typeof window === "undefined") {
        return normalizeBaseUrl(manualOverride || process.env.NEXT_PUBLIC_API_BASE_URL) || null;
    }

    const candidates = await collectApiBaseCandidates(manualOverride);
    const healthy = await findHealthyBase(candidates);

    if (healthy !== null) {
        persistDiscoveredBase(healthy);
        return healthy;
    }

    const manual = normalizeBaseUrl(manualOverride);
    if (manual) {
        localStorage.removeItem("backendUrl");
    }
    localStorage.removeItem(API_BASE_STORAGE_KEY);

    return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait until /api/health responds (Electron sidecar may need up to ~2 min on first launch). */
export async function waitForApiBackend(
    manualOverride?: string,
    options?: { maxWaitMs?: number; intervalMs?: number }
): Promise<string | null> {
    const maxWaitMs = options?.maxWaitMs ?? (isElectronShell() ? 120_000 : 90_000);
    const intervalMs = options?.intervalMs ?? 1_500;
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
        const baseUrl = await resolveApiBaseUrl(manualOverride);
        if (baseUrl !== null) {
            return baseUrl;
        }

        await sleep(intervalMs);
    }

    return null;
}

const looksLikeJsonResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return true;
    }

    const sample = (await response.clone().text()).trimStart();
    return sample.startsWith("{") || sample.startsWith("[");
};

export async function apiFetch(endpoint: string, init?: RequestInit, manualOverride?: string) {
    const formattedEndpoint = normalizeEndpoint(endpoint);
    const candidates = await collectApiBaseCandidates(manualOverride);
    const failures: string[] = [];

    for (const candidate of candidates) {
        const url = `${candidate}${formattedEndpoint}`;

        try {
            const response = await fetch(url, init);

            if (response.status === 404 || response.redirected) {
                failures.push(`${candidate || "relative"} (${response.redirected ? "redirected" : "404"})`);
                continue;
            }

            if (!response.ok) {
                failures.push(`${candidate || "relative"} (HTTP ${response.status})`);
                continue;
            }

            if (!(await looksLikeJsonResponse(response))) {
                failures.push(`${candidate || "relative"} (HTML instead of JSON)`);
                continue;
            }

            persistDiscoveredBase(candidate);
            return response;
        } catch (error) {
            failures.push(`${candidate || "relative"} (${error instanceof Error ? error.message : "failed"})`);
        }
    }

    const hint = isStaticCapacitorHost()
        ? " Keep Agenda+ open — the desktop app starts the API automatically. First launch can take up to two minutes."
        : " Run \"npm run dev\" from the Agenda+ project folder.";

    throw new Error(
        `Agenda+ could not reach its local API.${hint} Tried: ${failures.join(", ") || "no candidates"}`
    );
}
