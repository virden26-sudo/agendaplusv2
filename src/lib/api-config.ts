/**
 * Centralized API configuration for handling environment-specific URLs.
 * In a static export (Capacitor), relative /api/ routes don't work.
 */

export const getApiUrl = (endpoint: string, overrideBaseUrl?: string) => {
    // Priority: 1. overrideBaseUrl, 2. Env Var, 3. Empty string (relative)
    let baseUrl = overrideBaseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || '';

    // Safety check: if baseUrl is the placeholder, ignore it
    if (baseUrl.includes('your-api-server.com')) {
        baseUrl = '';
    }

    // Ensure endpoint starts with a slash
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${baseUrl}${formattedEndpoint}`;
};
