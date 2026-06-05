/** Shared rules for rejecting portal UI noise and keeping real academic tasks. */

const JUNK_TITLE_PATTERNS = [
  /stay logged in/i,
  /hit a key or click/i,
  /are you still there/i,
  /view history/i,
  /^view\b/i,
  /completion status/i,
  /evaluation status/i,
  /national university system/i,
  /^assignments?\s*[-–—]/i,
  /^[a-z]\s*[-–—]\s*soc/i,
  /^\w\s*-\s*soc\d/i,
  /feedback\s*:\s*read/i,
  /\d+\s*\/\s*\d+\s*[-–]\s*\d+\s*%/,
  /\d+\s*submission[s]?,\s*\d+\s*file/i,
  /brightspace|d2l brightspace/i,
  /table of contents|course home|skip to/i,
  /^name$|^due date$|^status$|^score$/i,
  /^quiz\s*list\b/i,
  /^discussions?\s*list\b/i,
  /^oh,?\s*there you are/i,
];

const VALID_TITLE_PATTERNS = [
  /(?:week\s*\d+\s*)?(?:assignment|quiz)\s*\d+\s*:\s*.+/i,
];

export function isValidQuizTitle(title: string): boolean {
  const raw = (title || "").trim();
  if (!raw || raw.length < 6 || isObviousJunkTitle(raw)) return false;
  if (/^(name|due date|status|attempts|score)$/i.test(raw)) return false;
  return /quiz|exam|test/i.test(raw) || raw.length >= 12;
}

export function isValidDiscussionTitle(title: string): boolean {
  const raw = (title || "").trim();
  if (!raw || raw.length < 5 || isObviousJunkTitle(raw)) return false;
  if (/^(name|due date|topic|threads|posts|last post|forum|author|unread)$/i.test(raw)) return false;
  if (/quiz\s*list|assignments?\s*list/i.test(raw)) return false;
  return raw.length >= 6;
}

export function isJunkCourseName(name: string): boolean {
  const raw = (name || "").trim();
  if (!raw) return true;
  if (isObviousJunkTitle(raw)) return true;
  if (/quiz\s*list|are you still there|oh,?\s*there you are/i.test(raw)) return true;
  if (/^\d+\s*\/\s*\d+|\d+\s*%\s*$|feedback\s*:\s*read/i.test(raw)) return true;
  if (/submission[s]?,\s*\d+\s*file|completion status|evaluation status/i.test(raw)) return true;
  return false;
}

export function extractCourseCode(raw: string): string | null {
  const match = (raw || "").match(/\b([A-Z]{2,5}\s*\d{2,4})\b/i);
  return match ? match[1].replace(/\s+/g, "") : null;
}

export function sanitizeCourseName(raw: string): string {
  let course = (raw || "")
    .replace(/^(quiz\s*list|assignments?|quizzes?|discussions?|grades?|dropbox)\s*[-–—]\s*/i, "")
    .replace(/\s*[-–—]\s*(national university|university system|brightspace|d2l).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!course || isJunkCourseName(course)) {
    const soc = extractCourseCode(raw || course);
    return soc || "Course";
  }

  const codeMatch = course.match(/^([A-Z]{2,5}\s*\d{2,4})\s*[-–—]?\s*(.+)$/i);
  if (codeMatch) {
    course = `${codeMatch[1].replace(/\s+/g, "")} — ${codeMatch[2].trim()}`;
  }

  return course.slice(0, 80) || "Course";
}

export function normalizeAssignmentTitle(raw: string): string {
  let title = (raw || "")
    .replace(/^(dropbox|checklist)\s*[:|-]?\s*/i, "")
    .replace(/^(completion status|score|evaluation status|status|feedback|availability|submissions?)\s*/gi, "")
    .replace(/\d+\s*submission[s]?,\s*\d+\s*file[s]?/gi, "")
    .replace(/\d+\s*\/\s*\d+\s*[-–]\s*\d+\s*%/g, "")
    .replace(/feedback\s*:\s*read/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const embedded = title.match(
    /((?:week\s*\d+\s*)?assignment\s*\d+\s*:\s*.+?)(?=(?:week\s*\d+\s*)?assignment\s*\d+\s*:|$)/i
  );
  if (embedded) {
    title = embedded[1].trim();
  }

  return title;
}

export function isValidAssignmentTitle(title: string): boolean {
  const raw = (title || "").trim();
  if (!raw || raw.length < 5 || raw.length > 250) {
    return false;
  }

  const lower = raw.toLowerCase();
  if (JUNK_TITLE_PATTERNS.some((pattern) => pattern.test(lower))) {
    return false;
  }

  // Any reasonably long title that isn't junk is likely a valid task.
  // We prioritize structured D2L titles (Assignment N, Quiz M) but allow others.
  if (raw.length >= 10) {
    return true;
  }

  return (
    /(assignment|quiz|exam|project|paper|essay|discussion|homework|lab|reading|task|module)/i.test(lower)
  );
}

export function isObviousJunkTitle(title: string): boolean {
  const lower = (title || "").toLowerCase();
  return JUNK_TITLE_PATTERNS.some((pattern) => pattern.test(lower));
}

/** @deprecated Use isObviousJunkTitle — course breadcrumb must not block import */
export function isValidStoredAssignment(title: string, _course: string): boolean {
  return isValidAssignmentTitle(title) && !isObviousJunkTitle(title);
}
