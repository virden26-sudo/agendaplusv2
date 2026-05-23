import type { ParsedAssignment } from "@/ai/schemas/assignment";

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function normalizeDate(raw: string, anchorYear: number): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");

  const iso = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = trimmed.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slash) {
    const month = slash[1].padStart(2, "0");
    const day = slash[2].padStart(2, "0");
    let year = slash[3] ? Number(slash[3]) : anchorYear;
    if (year < 100) year += 2000;
    return `${year}-${month}-${day}`;
  }

  const named = trimmed.match(/([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (named) {
    const monthIndex = MONTHS[named[1].toLowerCase()];
    if (monthIndex === undefined) return null;
    const year = named[3] ? Number(named[3]) : anchorYear;
    const month = String(monthIndex + 1).padStart(2, "0");
    const day = named[2].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
}

function cleanTitle(line: string): string {
  return line
    .replace(/^(assignment|quiz|exam|discussion|dropbox|checklist)\s*[:|-]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoiseLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (line.length < 4 || line.length > 180) return true;
  const noise = [
    "sign in", "log in", "logout", "password", "username", "okta",
    "copyright", "privacy", "help", "settings", "menu", "search",
    "frame break", "loading", "skip to", "cookie",
  ];
  return noise.some((token) => lower.includes(token));
}

function inferCourse(lines: string[], index: number): string | undefined {
  for (let i = index - 1; i >= Math.max(0, index - 4); i--) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;
    if (/^[A-Z]{2,5}[-\s]?\d{2,4}/.test(line) || line.includes(" - ")) {
      return line.slice(0, 80);
    }
  }
  return undefined;
}

/** Deterministic parser — works without Ollama when portal text was scraped successfully. */
export function parsePortalTextHeuristically(
  portalText: string,
  currentDate = new Date().toLocaleDateString("en-CA")
): { assignments: ParsedAssignment[]; announcements: { title: string; content?: string; date?: string; course?: string }[] } {
  const anchorYear = Number(currentDate.slice(0, 4)) || new Date().getFullYear();
  const assignments: ParsedAssignment[] = [];
  const seen = new Set<string>();

  const lines = portalText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const dueInline = /(.{8,140}?)\s+(?:due|due date|deadline)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/gi;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    dueInline.lastIndex = 0;
    while ((match = dueInline.exec(line)) !== null) {
      const task = cleanTitle(match[1]);
      const dueDate = normalizeDate(match[2], anchorYear);
      if (!task || !dueDate) continue;
      const key = `${task.toLowerCase()}|${dueDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      assignments.push({ task, dueDate, course: inferCourse(lines, lines.indexOf(line)) ?? "Portal" });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isNoiseLine(line)) continue;

    const dueMatch = line.match(/^(?:due|due date|deadline)\s*[:\-]?\s*(.+)$/i);
    if (!dueMatch) continue;

    const dueDate = normalizeDate(dueMatch[1], anchorYear);
    if (!dueDate) continue;

    let task = "";
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      const candidate = cleanTitle(lines[j]);
      if (!candidate || isNoiseLine(candidate)) continue;
      if (/^(due|course|module|week)\b/i.test(candidate)) continue;
      task = candidate;
      break;
    }

    if (!task) continue;
    const key = `${task.toLowerCase()}|${dueDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    assignments.push({
      task,
      dueDate,
      course: inferCourse(lines, i) ?? "Portal",
    });
  }

  const announcements: { title: string; content?: string; date?: string; course?: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/announcement/i.test(lines[i])) continue;
    const title = cleanTitle(lines[i + 1] || lines[i]);
    if (!title || title.length < 5) continue;
    announcements.push({
      title,
      content: lines[i + 2],
      course: inferCourse(lines, i),
      date: currentDate,
    });
  }

  return { assignments, announcements };
}

export function mergePortalParseResults<T extends { assignments?: ParsedAssignment[]; announcements?: unknown[]; discussions?: unknown[] }>(
  primary: T,
  fallback: T
): T {
  const dedupeAssignments = (items: ParsedAssignment[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const task = (item.task || (item as { title?: string }).title || "").trim();
      if (!task) return false;
      const key = `${task.toLowerCase()}|${item.dueDate ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((item) => ({
      ...item,
      task: item.task || (item as { title?: string }).title || "Untitled",
    }));
  };

  return {
    ...primary,
    assignments: dedupeAssignments([
      ...(primary.assignments ?? []),
      ...(fallback.assignments ?? []),
    ]),
    announcements: [
      ...(primary.announcements ?? []),
      ...(fallback.announcements ?? []),
    ],
    discussions: [
      ...(primary.discussions ?? []),
      ...(fallback.discussions ?? []),
    ],
  } as T;
}
