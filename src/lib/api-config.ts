import { Capacitor } from '@capacitor/core';
import { getElectronBackendCandidates, getElectronBackendHeaders, isElectronShell } from '@/lib/electron-bridge';

/**
 * Centralized API configuration — discovers the local Next.js API automatically.
 * No manual Backend URL is required for desktop or browser dev.
 */

const API_BASE_STORAGE_KEY = "agendaApiBaseUrl";

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

/** Explicit remote connections apply to requests AND readiness checks. */
export const getRemoteApiBaseUrl = () => typeof window === 'undefined' ? ''
    : normalizeBaseUrl(localStorage.getItem('agendaRemoteApiBaseUrl'));

export const getStaticApiBaseCandidates = (manualOverride?: string) => {
    const explicit = normalizeBaseUrl(manualOverride) || getRemoteApiBaseUrl();
    if (explicit) return [explicit];
    const configured = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
    if (typeof window === 'undefined') return configured ? [configured] : [];
    if (configured) return [configured];
    // A phone's localhost is the phone, not the user's computer. Do not scan it.
    // Electron obtains its actual random loopback port through the preload bridge.
    if (isStaticCapacitorHost()) return [];
    // Also supports production web servers on arbitrary ports/domains.
    return [''];
};

export async function collectApiBaseCandidates(manualOverride?: string): Promise<string[]> {
    const candidates = getStaticApiBaseCandidates(manualOverride);
    if (normalizeBaseUrl(manualOverride) || getRemoteApiBaseUrl()) return candidates;
    const electronUrls = (await getElectronBackendCandidates()).map(normalizeBaseUrl).filter(Boolean);
    return uniq([...electronUrls, ...candidates]);
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

    if (!isElectronShell() && (await collectApiBaseCandidates(manualOverride)).length === 0) return null;
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
    const remote = getRemoteApiBaseUrl();
    const candidates = await collectApiBaseCandidates(manualOverride);
    const failures: string[] = [];

    for (const candidate of candidates) {
        const url = `${candidate}${formattedEndpoint}`;

        try {
            // Explicit caller deadlines cover long portal scans and model generation.
            const signal = init?.signal || AbortSignal.timeout(15000);

            const headers = new Headers(init?.headers);
            if (remote && candidate === remote) {
                const token = sessionStorage.getItem('agendaRemoteApiToken');
                if (token) headers.set('X-Agenda-Token', token);
            }
            for (const [name, value] of Object.entries(await getElectronBackendHeaders(candidate))) {
                headers.set(name, value);
            }
            const response = await fetch(url, { ...init, headers, signal });

            if (response.status === 404 || response.redirected) {
                failures.push(`${candidate || "relative"} (${response.redirected ? "redirected" : "404"})`);
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

    throw new Error(candidates.length === 0
        ? 'Automatic extraction and broader AI need a connected service. Open Optional AI and portal service to configure it. Text import and local practice remain available.'
        : `Agenda+ could not reach the connected service (${failures.join('; ')}). Check the connection and access token.`);
}
