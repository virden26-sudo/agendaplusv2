export type AgendaBackendStatus = {
    ready: boolean;
    projectRoot?: string | null;
    token?: string;
    port: number;
    urls: string[];
};

type AgendaElectronApi = {
    getBackendStatus?: () => Promise<AgendaBackendStatus>;
    sendLogout?: () => void;
};

export async function getElectronBackendHeaders(baseUrl: string): Promise<Record<string, string>> {
    if (typeof window === 'undefined') return {};
    const api = (window as Window & { electronAPI?: AgendaElectronApi }).electronAPI;
    try {
        const status = await api?.getBackendStatus?.();
        return status?.token && status.urls.includes(baseUrl) ? { 'X-Agenda-Token': status.token } : {};
    } catch { return {}; }
}

/** Loopback URLs reported by the Electron main process. */
export async function getElectronBackendCandidates(): Promise<string[]> {
    if (typeof window === "undefined") {
        return [];
    }

    const api = (window as Window & { electronAPI?: AgendaElectronApi }).electronAPI;
    if (!api?.getBackendStatus) {
        return [];
    }

    try {
        const status = await api.getBackendStatus();
        return Array.isArray(status.urls) ? status.urls : [];
    } catch {
        return [];
    }
}

export function isElectronShell() {
    return typeof window !== "undefined" && window.location.protocol === "capacitor-electron:";
}
