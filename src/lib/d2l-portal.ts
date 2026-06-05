/** Normalize Brightspace/D2L URLs so scraping always hits assignments + calendar, not a random topic page. */

export function extractD2LOrgUnitId(url: string): string | null {
  const patterns = [
    /[?&]ou=(\d+)/i,
    /\/d2l\/home\/(\d+)/i,
    /\/le\/lessons\/(\d+)/i,
    /\/content\/(\d+)/i,
    /\/le\/content\/(\d+)/i,
    /\/d2l\/lms\/dropbox\/[^?]*[?&]ou=(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function normalizePortalScrapeUrl(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const ou = extractD2LOrgUnitId(trimmed);
    if (!ou || !parsed.hostname.includes("d2l")) {
      return trimmed;
    }

    if (/folders_list\.d2l/i.test(trimmed) && trimmed.includes(`ou=${ou}`)) {
      return trimmed;
    }

    return `${parsed.origin}/d2l/lms/dropbox/user/folders_list.d2l?ou=${ou}&isprv=0`;
  } catch {
    return trimmed;
  }
}

export function normalizePortalUrlForStorage(url: string): string {
  const trimmed = (url || "").trim();
  const ou = extractD2LOrgUnitId(trimmed);
  if (!ou) return trimmed;

  try {
    const origin = new URL(trimmed).origin;
    return `${origin}/d2l/home/${ou}`;
  } catch {
    return trimmed;
  }
}
