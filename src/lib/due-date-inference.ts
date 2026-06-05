import type { ParsedAssignment } from "@/ai/schemas/assignment";
import { normalizeAssignmentTitle } from "@/lib/assignment-quality";

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizePortalDate(raw: string, anchorYear: number): string | null {
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

/** Reject scraped noise dates (e.g. random "Feb 1" from unrelated portal text). */
export function isReasonableDueDate(iso: string, anchor = new Date()): boolean {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;

  const min = new Date(anchor);
  min.setFullYear(min.getFullYear() - 1);
  min.setMonth(min.getMonth() - 6);

  const max = new Date(anchor);
  max.setFullYear(max.getFullYear() + 1);
  max.setMonth(max.getMonth() + 8);

  return parsed >= min && parsed <= max;
}

/** Best guess for when the current academic term started (used for Week N math). */
export function inferCourseStartDate(anchor = new Date()): Date {
  const year = anchor.getFullYear();
  const candidates = [
    new Date(year, 7, 19),
    new Date(year, 0, 6),
    new Date(year - 1, 7, 19),
  ].filter((d) => d.getTime() <= anchor.getTime());

  return candidates.sort((a, b) => b.getTime() - a.getTime())[0] || new Date(year, 0, 6);
}

/** Week number from dropbox section header stored in details ("Week 4"), not from title prose. */
function extractWeekFromDetails(details?: string | null): number | null {
  const match = (details || "").trim().match(/^week\s*(\d{1,2})\s*$/i);
  return match ? Number(match[1]) : null;
}

/** Title mentions like "ahead to Week 4" describe content, not the due week. */
function extractMisleadingTitleWeek(task: string): boolean {
  return /(?:ahead\s+to|looking\s+ahead\s+to|for)\s+week\s*\d+/i.test(task);
}

/** Maps "Assignment N" to the Week header row above it on the D2L dropbox list. */
export function buildAssignmentWeekIndex(portalText: string): Map<number, number> {
  const index = new Map<number, number>();
  let currentWeek: number | null = null;

  const assignmentSection =
    portalText.split(/===\s*SECTION:\s*Assignments\s*===/i)[1]?.split(/===\s*SECTION:/i)[0] ||
    portalText;

  for (const rawLine of assignmentSection.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;

    const weekOnly = line.match(/^week\s*(\d{1,2})\s*$/i);
    if (weekOnly) {
      currentWeek = Number(weekOnly[1]);
      continue;
    }

    const assignInLine = line.match(/assignment\s*(\d+)\s*:/i);
    if (assignInLine && currentWeek != null) {
      index.set(Number(assignInLine[1]), currentWeek);
    }
  }

  const structuredBlocks = [
    ...portalText.matchAll(/===\s*STRUCTURED:\s*Assignments\s*===\s*([\s\S]*?)(?=\n===|$)/gi),
  ];
  for (const block of structuredBlocks) {
    try {
      const payload = JSON.parse(block[1].trim());
      for (const row of payload?.items || []) {
        const task = (row.task || "").trim();
        const details = (row.details || "").trim();
        const weekMatch = details.match(/^week\s*(\d{1,2})$/i);
        const assignMatch = task.match(/assignment\s*(\d+)\s*:/i);
        if (weekMatch && assignMatch) {
          index.set(Number(assignMatch[1]), Number(weekMatch[1]));
        }
      }
    } catch {
      // ignore malformed structured payloads
    }
  }

  return index;
}

export function inferDueDateFromAssignmentWeekIndex(
  task: string,
  portalText: string,
  anchor = new Date()
): string | null {
  const numMatch = task.match(/assignment\s*(\d+)\s*:/i);
  if (!numMatch) return null;

  const week = buildAssignmentWeekIndex(portalText).get(Number(numMatch[1]));
  if (!week) return null;

  return inferDueDateFromWeekNumber(week, anchor);
}

/** End-of-week date from course start + week number (dropbox Week N headers only). */
export function inferDueDateFromWeekNumber(week: number, anchor = new Date()): string | null {
  if (week < 1 || week > 20) return null;

  const start = inferCourseStartDate(anchor);
  const due = new Date(start);
  due.setDate(due.getDate() + week * 7 - 1);

  const termEnd = new Date(start);
  termEnd.setMonth(termEnd.getMonth() + 6);

  if (due > termEnd) {
    due.setTime(start.getTime());
    due.setDate(due.getDate() + week * 7 - 1);
  }

  return toIso(due);
}

/** @deprecated Prefer inferDueDateFromWeekNumber — title week mentions are often misleading. */
export function inferDueDateFromWeek(task: string, anchor = new Date()): string | null {
  if (extractMisleadingTitleWeek(task)) return null;

  const ahead = task.match(/(?:ahead to|for|by|in|during)\s+week\s*(\d{1,2})/i);
  if (ahead) return null;

  const leading = task.match(/^week\s*(\d{1,2})\b/i);
  if (leading) return inferDueDateFromWeekNumber(Number(leading[1]), anchor);

  return null;
}

export function findDueDateInBlob(text: string, anchorYear: number, anchor = new Date()): string | null {
  const labeled = [
    ...text.matchAll(
      /(?:due\s*date|end\s*date|deadline|closes?|available\s+until|submit\s+by)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|[A-Za-z]+\s+\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/gi
    ),
  ];

  for (const match of labeled) {
    const parsed = normalizePortalDate(match[1], anchorYear);
    if (parsed && isReasonableDueDate(parsed, anchor)) return parsed;
  }

  const isoDates = [...text.matchAll(/\d{4}-\d{2}-\d{2}/g)];
  for (const match of isoDates) {
    const parsed = normalizePortalDate(match[0], anchorYear);
    if (parsed && isReasonableDueDate(parsed, anchor)) return parsed;
  }

  return null;
}

/** Index assignment-like labels to dates scraped from the calendar section only. */
export function buildCalendarDateIndex(portalText: string, anchorYear: number): Map<string, string> {
  const index = new Map<string, string>();
  const lines = portalText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const dateOnly = normalizePortalDate(lines[i], anchorYear);
    if (dateOnly && lines[i + 1]) {
      const key = normalizeAssignmentTitle(lines[i + 1]).toLowerCase();
      if (key.length > 8) index.set(key, dateOnly);
      continue;
    }

    const inline = lines[i].match(
      /^(.{10,120}?)\s+((?:[A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?)|(?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)|(?:\d{4}-\d{2}-\d{2}))\s*$/i
    );
    if (inline) {
      const parsed = normalizePortalDate(inline[2], anchorYear);
      if (parsed) {
        index.set(normalizeAssignmentTitle(inline[1]).toLowerCase(), parsed);
      }
    }
  }

  return index;
}

function fuzzyCalendarLookup(task: string, calendarIndex: Map<string, string>): string | null {
  const key = normalizeAssignmentTitle(task).toLowerCase();
  if (calendarIndex.has(key)) return calendarIndex.get(key)!;

  for (const [label, date] of calendarIndex.entries()) {
    if (key === label) return date;
    const assignmentNum = key.match(/assignment\s*(\d+)/i);
    const labelNum = label.match(/assignment\s*(\d+)/i);
    if (assignmentNum && labelNum && assignmentNum[1] === labelNum[1]) return date;
  }

  return null;
}

export function inferDueDateForAssignment(
  task: string,
  options?: {
    details?: string | null;
    portalText?: string;
    calendarIndex?: Map<string, string>;
    currentDate?: string;
  }
): { dueDate: string; source: "explicit" | "calendar" | "week" | "detail" } | null {
  const anchorYear = Number((options?.currentDate || new Date().toLocaleDateString("en-CA")).slice(0, 4));
  const anchor = new Date(options?.currentDate || Date.now());
  const blob = `${task} ${options?.details || ""}`;

  const explicit = findDueDateInBlob(blob, anchorYear, anchor);
  if (explicit) return { dueDate: explicit, source: "explicit" };

  if (options?.portalText) {
    const fromIndex = inferDueDateFromAssignmentWeekIndex(task, options.portalText, anchor);
    if (fromIndex && isReasonableDueDate(fromIndex, anchor)) {
      return { dueDate: fromIndex, source: "week" };
    }
  }

  const weekFromDetails = extractWeekFromDetails(options?.details);
  if (weekFromDetails) {
    const fromDetails = inferDueDateFromWeekNumber(weekFromDetails, anchor);
    if (fromDetails && isReasonableDueDate(fromDetails, anchor)) {
      return { dueDate: fromDetails, source: "week" };
    }
  }

  const calendarIndex = options?.calendarIndex;
  if (calendarIndex && calendarIndex.size > 0) {
    const fromCalendar = fuzzyCalendarLookup(task, calendarIndex);
    if (fromCalendar && isReasonableDueDate(fromCalendar, anchor)) {
      return { dueDate: fromCalendar, source: "calendar" };
    }
  }

  return null;
}

/** Last-resort due date so imports are not dropped when D2L omits dates on the list view. */
export function fallbackImportDueDate(currentDate = new Date().toLocaleDateString("en-CA")): string {
  const anchor = new Date(currentDate);
  anchor.setDate(anchor.getDate() + 21);
  return toIso(anchor);
}

export function resolveDueDateForImport(
  task: string,
  options: {
    dueDate?: string | null;
    details?: string | null;
    portalText: string;
    currentDate: string;
  }
): { dueDate: string; estimated: boolean } {
  const anchor = new Date(options.currentDate);
  const anchorYear = Number(options.currentDate.slice(0, 4)) || anchor.getFullYear();

  if (options.dueDate && isReasonableDueDate(options.dueDate, anchor)) {
    return { dueDate: options.dueDate, estimated: false };
  }

  const assignmentSection =
    options.portalText.split(/===\s*SECTION:\s*Assignments\s*===/i)[1]?.split(/===\s*SECTION:/i)[0] ||
    options.portalText;

  const calendarSection =
    options.portalText.split(/===\s*SECTION:\s*Calendar\s*===/i)[1]?.split(/===\s*SECTION:/i)[0] || "";
  const calendarIndex = buildCalendarDateIndex(calendarSection, anchorYear);

  const inferred = inferDueDateForAssignment(task, {
    details: options.details,
    portalText: assignmentSection,
    calendarIndex,
    currentDate: options.currentDate,
  });

  if (inferred?.dueDate) {
    return { dueDate: inferred.dueDate, estimated: true };
  }

  return { dueDate: fallbackImportDueDate(options.currentDate), estimated: true };
}

export function resolveAssignmentDueDates(
  items: ParsedAssignment[],
  portalText: string,
  currentDate = new Date().toLocaleDateString("en-CA")
): ParsedAssignment[] {
  return items.map((item) => {
    const resolved = resolveDueDateForImport(item.task, {
      dueDate: item.dueDate,
      details: item.details,
      portalText,
      currentDate,
    });

    const note = resolved.estimated
      ? "Due date not listed on portal; estimated for planning."
      : null;

    return {
      ...item,
      dueDate: resolved.dueDate,
      details: note
        ? item.details
          ? `${item.details} (${note})`
          : note
        : item.details,
    };
  });
}
