/** Client-side portal session gate — login UI at most once per calendar day. */

export const PORTAL_AUTH_DATE_KEY = "portalLastAuthDate";

export function getTodayDateKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function isPortalAuthedToday(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PORTAL_AUTH_DATE_KEY) === getTodayDateKey();
}

export function markPortalAuthedToday(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PORTAL_AUTH_DATE_KEY, getTodayDateKey());
}

export function clearPortalAuthToday(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PORTAL_AUTH_DATE_KEY);
}

/** True when the monitored browser may prompt for login (first open of the day). */
export function shouldAllowManualPortalLogin(): boolean {
  return !isPortalAuthedToday();
}
