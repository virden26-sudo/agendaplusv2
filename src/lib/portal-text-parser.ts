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
    "are you still there", "oh, there you are", "session expires",
  ];
  return noise.some((token) => lower.includes(token));
}

function isD2LTableNoise(line: string): boolean {
  return /^(name|due date|status|score|grade|points|completed|not submitted|feedback|availability|actions|topic|threads|posts|last post|started|not started|attempts|evaluation status|publish|published|hidden|visible)$/i.test(line);
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
): {
  assignments: ParsedAssignment[];
  announcements: { title: string; content?: string; date?: string; course?: string }[];
  discussions: { title: string; content?: string; dueDate?: string | null; postedDate: string; course?: string }[];
  quizzes: ParsedAssignment[];
} {
  const anchorYear = Number(currentDate.slice(0, 4)) || new Date().getFullYear();
  const assignments: ParsedAssignment[] = [];
  const quizzes: ParsedAssignment[] = [];
  const discussions: { title: string; content?: string; dueDate?: string | null; postedDate: string; course?: string }[] = [];
  const seen = new Set<string>();

  const lines = portalText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const dueInline = /(.{8,140}?)\s+(?:due|due date|deadline)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/gi;

  const addAssignment = (target: ParsedAssignment[], task: string, dueDate: string | null, course = "Portal") => {
    const cleanedTask = cleanTitle(task);
    if (!cleanedTask || isNoiseLine(cleanedTask)) return;
    const key = `${cleanedTask.toLowerCase()}|${dueDate ?? ""}|${course.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    target.push({ task: cleanedTask, dueDate, course });
  };

  for (const line of lines) {
    let match: RegExpExecArray | null;
    dueInline.lastIndex = 0;
    while ((match = dueInline.exec(line)) !== null) {
      const task = cleanTitle(match[1]);
      const dueDate = normalizeDate(match[2], anchorYear);
      if (!task || !dueDate) continue;
      addAssignment(assignments, task, dueDate, inferCourse(lines, lines.indexOf(line)) ?? "Portal");
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
    addAssignment(assignments, task, dueDate, inferCourse(lines, i) ?? "Portal");
  }

  let section = "";
  let currentCourse = lines.find((line) => /[A-Z]{2,5}\s*\d{2,4}|Cultural Diversity|SOC350/i.test(line)) || "Portal";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(/^=+\s*SECTION:\s*(.+?)\s*=+$/i);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      continue;
    }

    if (/SOC\s*350|Cultural Diversity/i.test(line)) {
      currentCourse = line.slice(0, 90);
    }

    if (isNoiseLine(line)) continue;
    if (/^(assignments?|quizzes?|discussions?|grades?|course home|calendar|content|table of contents)$/i.test(line)) continue;
    if (isD2LTableNoise(line)) continue;

    const explicitDate = normalizeDate(line, anchorYear);
    const nextLineDate = lines[i + 1] ? normalizeDate(lines[i + 1], anchorYear) : null;
    const dueDate = explicitDate || nextLineDate;
    const taskish =
      /assignment|paper|essay|quiz|exam|discussion|post|journal|project|worksheet|read|review|complete|participate|module|chapter/i.test(line);

    const inAssignmentSection = section.includes("assignment") || section.includes("dropbox");
    const inDiscussionSection = section.includes("discussion");
    const inQuizSection = section.includes("quiz");
    const usefulSectionLine = Boolean(section) && !isD2LTableNoise(line) && !normalizeDate(line, anchorYear);

    if (inQuizSection && (taskish || usefulSectionLine)) {
      addAssignment(quizzes, line, dueDate, currentCourse);
      continue;
    }

    if (inDiscussionSection && (taskish || usefulSectionLine)) {
      const title = cleanTitle(line);
      const key = `discussion|${title.toLowerCase()}|${dueDate ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        discussions.push({
          title,
          dueDate,
          postedDate: currentDate,
          course: currentCourse,
        });
      }
      continue;
    }

    if (inAssignmentSection && (taskish || usefulSectionLine)) {
      addAssignment(assignments, line, dueDate, currentCourse);
      continue;
    }

    // D2L tables: title line followed by a date-only line (no "due" prefix).
    if (inAssignmentSection && nextLineDate && !explicitDate && line.length >= 8 && line.length <= 120) {
      addAssignment(assignments, line, nextLineDate, currentCourse);
    }
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

  return { assignments, announcements, discussions, quizzes };
}

export function countPortalItems(result: {
  assignments?: unknown[];
  announcements?: unknown[];
  discussions?: unknown[];
  quizzes?: unknown[];
  grades?: unknown[];
}) {
  return (
    (result.assignments?.length ?? 0) +
    (result.quizzes?.length ?? 0) +
    (result.discussions?.length ?? 0) +
    (result.announcements?.length ?? 0) +
    (result.grades?.length ?? 0)
  );
}

export function mergePortalParseResults<T extends { assignments?: ParsedAssignment[]; announcements?: unknown[]; discussions?: unknown[]; quizzes?: ParsedAssignment[] }>(
  primary: T,
  fallback: T
): T {
  const dedupeAssignments = (items: ParsedAssignment[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const task = (item.task || (item as { title?: string }).title || "").trim();
      if (!task) return false;
      if (/^untitled(\s+assignment|\s+quiz)?$/i.test(task)) return false;
      const key = `${task.toLowerCase()}|${item.dueDate ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((item) => ({
      ...item,
      task: item.task || (item as { title?: string }).title || "Untitled",
    }));
  };

  const primaryCount = countPortalItems(primary);
  const fallbackCount = countPortalItems(fallback);
  const richer = fallbackCount > primaryCount ? fallback : primary;
  const poorer = richer === fallback ? primary : fallback;

  return {
    ...richer,
    assignments: dedupeAssignments([
      ...(richer.assignments ?? []),
      ...(poorer.assignments ?? []),
    ]),
    quizzes: dedupeAssignments([
      ...(richer.quizzes ?? []),
      ...(poorer.quizzes ?? []),
    ]),
    announcements: [
      ...(richer.announcements ?? []),
      ...(poorer.announcements ?? []),
    ],
    discussions: [
      ...(richer.discussions ?? []),
      ...(poorer.discussions ?? []),
    ],
  } as T;
}
