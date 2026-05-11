/**
 * Centralized API configuration for handling environment-specific URLs.
 * In a static export (Capacitor), relative /api/ routes don't work.
 */

export const getApiUrl = (endpoint: string) => {
    // If we have a base URL defined in environment variables, use it.
    // Otherwise, fallback to relative path (works in npm run dev on web).
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    // Ensure endpoint starts with a slash
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${baseUrl}${formattedEndpoint}`;
};
