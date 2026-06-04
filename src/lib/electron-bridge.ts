export type AgendaBackendStatus = {
    ready: boolean;
    projectRoot: string | null;
    port: number;
    urls: string[];
};

type AgendaElectronApi = {
    getBackendStatus?: () => Promise<AgendaBackendStatus>;
    sendLogout?: () => void;
};

/** URLs reported by the Electron main process (sidecar Next.js on port 9002). */
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
