import type { ParsedAssignment } from "@/ai/schemas/assignment";
import {
  isValidAssignmentTitle,
  isValidDiscussionTitle,
  isValidQuizTitle,
  isJunkCourseName,
  normalizeAssignmentTitle,
  sanitizeCourseName,
  extractCourseCode,
} from "@/lib/assignment-quality";
import {
  inferDueDateForAssignment,
  resolveAssignmentDueDates,
} from "@/lib/due-date-inference";

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

export type PortalParseResult = {
  assignments: ParsedAssignment[];
  announcements: { title: string; content?: string | null; date?: string | null; course?: string | null }[];
  discussions: { title: string; content?: string | null; dueDate?: string | null; postedDate: string; course?: string | null }[];
  quizzes: ParsedAssignment[];
  grades: { course: string; grade: string; details?: string | null }[];
};

type PortalItem = PortalParseResult;

type StructuredD2LRow = {
  task: string;
  dueDate?: string | null;
  course?: string;
  details?: string | null;
  href?: string | null;
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

/** Extract D2L assignment rows (full "Week N Assignment M: Title" labels). */
function extractD2LAssignmentRecords(
  blob: string,
  anchorYear: number
): { task: string; dueDate: string | null }[] {
  const records: { task: string; dueDate: string | null }[] = [];
  const patterns = [
    /((?:Week\s*\d+\s*)?Assignment\s*\d+\s*:[^\n]+?)(?=\s*(?:Week\s*\d+\s*)?Assignment\s*\d+\s*:|Feedback\s*:|$|\d+\s*Submission)/gi,
    /(Assignment\s*\d+\s*:[^\n]{8,200})/gi,
  ];

  for (const pattern of patterns) {

    const seen = new Set(records.map((r) => r.task.toLowerCase()));
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(blob)) !== null) {
      const task = normalizeAssignmentTitle(match[1]);
      if (!isValidAssignmentTitle(task)) continue;
      const key = task.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const windowText = blob.slice(
        Math.max(0, match.index - 40),
        match.index + match[0].length + 220
      );
      const dueDate = findDueDateInText(windowText, anchorYear);

      records.push({ task, dueDate });
    }
  }

  return records;
}

function extractD2LDiscussionRecords(blob: string): { title: string; dueDate: string | null }[] {
  const records: { title: string; dueDate: string | null }[] = [];
  const seen = new Set<string>();

  const add = (raw: string, dueDate: string | null = null) => {
    const title = normalizeAssignmentTitle(raw);
    if (!isValidDiscussionTitle(title)) return;
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    records.push({ title, dueDate });
  };

  const topicPattern =
    /((?:Week\s*\d+\s*)?(?:Discussion|Topic)\s*\d*\s*:[^\n]+?)(?=\s*(?:Week\s*\d+\s*)?(?:Discussion|Topic)\s*\d*\s*:|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = topicPattern.exec(blob)) !== null) {
    add(match[1]);
  }

  for (const line of blob.split(/\r?\n/)) {
    const trimmed = line.replace(/\s+/g, " ").trim();
    if (!trimmed || isIrrelevantPortalLine(trimmed) || isD2LTableNoise(trimmed)) continue;
    if (trimmed.length >= 10 && trimmed.length <= 180) {
      add(trimmed);
    }
  }

  return records;
}

function isIrrelevantPortalLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (!lower || lower.length < 6) return true;
  if (line.length > 200) return true;

  const noisePatterns = [
    /^hit a key or click anywhere/i,
    /^are you still there/i,
    /^oh, there you are/i,
    /^view history$/i,
    /^completion status$/i,
    /^evaluation status$/i,
    /^national university/i,
    /^brightspace$/i,
    /^sign in|^log in|^logout/i,
    /^skip to/i,
    /^table of contents$/i,
    /^course home$/i,
    /^assignments?\s*[-–—]\s*[a-z]{2,5}\s*\d/i,
    /session expires|stay logged in/i,
    /^(name|due date|status|score|grade|points|feedback|actions|topic|threads|posts)$/i,
    /^(completed|not submitted|published|hidden|visible|not started|started)$/i,
    /copyright|privacy policy|cookie/i,
    /page not found|cannot be found|not authorized|access denied/i,
    /english\s*\(united/i,
  ];

  return noisePatterns.some((pattern) => pattern.test(lower) || pattern.test(line));
}

function isD2LTableNoise(line: string): boolean {
  return /^(name|due date|status|score|grade|points|completed|not submitted|feedback|availability|actions|topic|threads|posts|last post|started|not started|attempts|evaluation status|publish|published|hidden|visible)$/i.test(
    line.trim()
  );
}

function findDueDateInText(text: string, anchorYear: number): string | null {
  const labeled = text.match(
    /(?:due|due date|end date|deadline)\s*[:\-]?\s*([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/i
  );
  if (labeled) {
    return normalizeDate(labeled[1], anchorYear);
  }

  const dates = [
    ...text.matchAll(/\d{4}-\d{2}-\d{2}/g),
    ...text.matchAll(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g),
    ...text.matchAll(/[A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?/g),
  ];

  for (const match of dates) {
    const normalized = normalizeDate(match[0], anchorYear);
    if (normalized) return normalized;
  }

  return null;
}

function findDueDateNearLines(lines: string[], index: number, anchorYear: number): string | null {
  for (let offset = 0; offset <= 4; offset++) {
    const candidates = [lines[index + offset], lines[index - offset]].filter(Boolean);
    for (const candidate of candidates) {
      const dueOnly = candidate.match(/^(?:due|due date|end date|deadline)\s*[:\-]?\s*(.+)$/i);
      if (dueOnly) {
        const parsed = normalizeDate(dueOnly[1], anchorYear);
        if (parsed) return parsed;
      }
      const inline = findDueDateInText(candidate, anchorYear);
      if (inline) return inline;
    }
  }
  return null;
}

function parseStructuredSections(portalText: string, currentDate: string): PortalItem | null {
  const structuredBlocks = [...portalText.matchAll(/===\s*STRUCTURED:\s*(\w+)\s*===\s*([\s\S]*?)(?=\n===|$)/gi)];
  if (structuredBlocks.length === 0) return null;

  const result = {
    assignments: [] as ParsedAssignment[],
    announcements: [] as NonNullable<PortalItem["announcements"]>,
    discussions: [] as NonNullable<PortalItem["discussions"]>,
    quizzes: [] as ParsedAssignment[],
    grades: [] as { course: string; grade: string; details?: string | null }[],
  };

  const seen = new Set<string>();

  const pushAssignment = (row: StructuredD2LRow, fallbackCourse: string) => {
    const rawTask = (row.task || "").trim();
    if (!rawTask || !isValidAssignmentTitle(rawTask)) return;
    const task = normalizeAssignmentTitle(rawTask);
    let dueDate = row.dueDate ? normalizeDate(row.dueDate, new Date().getFullYear()) : null;
    if (!dueDate) {
      const inferred = inferDueDateForAssignment(task, {
        details: row.details,
        currentDate,
        portalText,
      });
      dueDate = inferred?.dueDate ?? null;
    }

    const course = sanitizeCourseName(row.course || fallbackCourse);
    const key = `assign|${task.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    result.assignments.push({
      task,
      dueDate: dueDate ?? null,
      course,
      details: row.details || null,
    });
  };

  const pushQuiz = (row: StructuredD2LRow, fallbackCourse: string) => {
    const rawTask = (row.task || "").trim();
    if (!rawTask || /assignment\s*\d+\s*:/i.test(rawTask) || !isValidQuizTitle(rawTask)) return;
    const task = normalizeAssignmentTitle(rawTask);
    let dueDate = row.dueDate ? normalizeDate(row.dueDate, new Date().getFullYear()) : null;
    if (!dueDate) {
      const inferred = inferDueDateForAssignment(task, {
        details: row.details,
        currentDate,
        portalText,
      });
      dueDate = inferred?.dueDate ?? null;
    }
    const course = sanitizeCourseName(row.course || fallbackCourse);
    const key = `quiz|${task.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);

    result.quizzes.push({
      task,
      dueDate,
      course,
      details: row.details || null,
    });
  };

  for (const block of structuredBlocks) {
    const section = block[1].toLowerCase();
    const payload = block[2].trim();
    let parsed: { course?: string; items?: StructuredD2LRow[] } | null = null;

    try {
      parsed = JSON.parse(payload);
    } catch {
      continue;
    }

    const course = sanitizeCourseName(parsed?.course || "Course");
    const items = parsed?.items || [];

    for (const row of items) {
      if (section.includes("quiz")) {
        pushQuiz(row, course);
      } else if (section.includes("discussion")) {
        const task = normalizeAssignmentTitle(row.task || "");
        if (!isValidDiscussionTitle(task)) continue;
        const dueDate = row.dueDate ? normalizeDate(row.dueDate, new Date().getFullYear()) : null;
        const key = `discussion|${task.toLowerCase()}|${course.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.discussions.push({
          title: task,
          dueDate,
          postedDate: new Date().toLocaleDateString("en-CA"),
          course,
          content: row.details || undefined,
        });
      } else if (section.includes("announcement")) {
        const title = normalizeAssignmentTitle(row.task || "");
        if (!title || title.length < 8 || isIrrelevantPortalLine(title)) continue;
        const key = `announce|${title.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.announcements.push({
          title,
          content: row.details || undefined,
          course,
          date: row.dueDate || currentDate,
        });
      } else if (section.includes("assignment")) {
        pushAssignment(row, course);
      } else if (section.includes("grade")) {
        const title = (row.task || "").trim();
        const gradeVal = (row.details || "").trim();
        if (title && gradeVal) {
          result.grades.push({
            course,
            grade: gradeVal,
            details: title,
          });
        }
      }
    }
  }

  return result;
}

/** Deterministic parser — works without Ollama when portal text was scraped successfully. */
export function parsePortalTextHeuristically(
  portalText: string,
  currentDate = new Date().toLocaleDateString("en-CA")
): PortalParseResult {
  const structured = parseStructuredSections(portalText, currentDate);
  const anchorYear = Number(currentDate.slice(0, 4)) || new Date().getFullYear();
  const assignments: ParsedAssignment[] = [...(structured?.assignments ?? [])];
  const quizzes: ParsedAssignment[] = [...(structured?.quizzes ?? [])];
  const discussions: PortalParseResult["discussions"] = [...(structured?.discussions ?? [])];
  const grades: PortalParseResult["grades"] = [...(structured?.grades ?? [])];
  const seenAssignments = new Set<string>(
    assignments.map((a) => `${a.task.toLowerCase()}|${a.dueDate}|${(a.course || "").toLowerCase()}`)
  );
  const seenQuizzes = new Set<string>(
    quizzes.map((q) => `${q.task.toLowerCase()}|${q.dueDate}|${(q.course || "").toLowerCase()}`)
  );
  const seenDiscussions = new Set<string>(
    discussions.map((d) => `${d.title.toLowerCase()}|${(d.course || "").toLowerCase()}`)
  );

  const assignmentSection =
    portalText.split(/===\s*SECTION:\s*Assignments\s*===/i)[1]?.split(/===\s*SECTION:/i)[0] ||
    portalText;

  let currentCourse = "Course";
  for (const line of assignmentSection.split(/\r?\n/)) {
    const trimmed = line.replace(/\s+/g, " ").trim();
    if (!trimmed || isIrrelevantPortalLine(trimmed) || /quiz\s*list/i.test(trimmed)) continue;
    if (/SOC\s*\d{3}|[A-Z]{2,5}\s*\d{2,4}/i.test(trimmed)) {
      const candidate = sanitizeCourseName(trimmed);
      if (!isJunkCourseName(candidate)) {
        currentCourse = candidate;
      }
    }
  }

  const assignmentLines = assignmentSection
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const addAssignment = (
    task: string,
    dueDate: string | null,
    course = currentCourse,
    details?: string | null
  ) => {
    const cleanedTask = normalizeAssignmentTitle(task);
    if (!isValidAssignmentTitle(cleanedTask)) return;

    let resolvedDue = dueDate;
    if (!resolvedDue) {
      const inferred = inferDueDateForAssignment(cleanedTask, {
        details,
        currentDate,
        portalText,
      });
      resolvedDue = inferred?.dueDate ?? null;
    }
    const normalizedCourse = isJunkCourseName(course)
      ? currentCourse
      : sanitizeCourseName(course);
    if (isJunkCourseName(normalizedCourse)) return;

    const key = cleanedTask.toLowerCase();
    if (seenAssignments.has(key)) return;
    seenAssignments.add(key);

    assignments.push({
      task: cleanedTask,
      dueDate: resolvedDue ?? null,
      course: normalizedCourse,
      details: details || null,
    });
  };

  const addQuiz = (
    task: string,
    dueDate: string | null,
    course = currentCourse,
    details?: string | null
  ) => {
    const cleanedTask = normalizeAssignmentTitle(task);
    if (/assignment\s*\d+\s*:/i.test(cleanedTask)) return;
    if (!isValidQuizTitle(cleanedTask)) return;

    let resolvedDue = dueDate;
    if (!resolvedDue) {
      const inferred = inferDueDateForAssignment(cleanedTask, {
        details,
        currentDate,
        portalText,
      });
      resolvedDue = inferred?.dueDate ?? null;
    }
    const normalizedCourse = sanitizeCourseName(course);
    const key = cleanedTask.toLowerCase();
    if (seenQuizzes.has(key)) return;
    seenQuizzes.add(key);

    quizzes.push({
      task: cleanedTask,
      dueDate: resolvedDue,
      course: normalizedCourse,
      details: details || null,
    });
  };

  const addDiscussion = (title: string, dueDate: string | null, course = currentCourse) => {
    const cleaned = normalizeAssignmentTitle(title);
    if (!isValidDiscussionTitle(cleaned)) return;
    const normalizedCourse = sanitizeCourseName(course);
    const key = `${cleaned.toLowerCase()}|${normalizedCourse.toLowerCase()}`;
    if (seenDiscussions.has(key)) return;
    seenDiscussions.add(key);
    discussions.push({
      title: cleaned,
      dueDate,
      postedDate: currentDate,
      course: normalizedCourse,
    });
  };

  for (const record of extractD2LAssignmentRecords(assignmentSection, anchorYear)) {
    addAssignment(record.task, record.dueDate, currentCourse);
  }

  const quizSection =
    portalText.split(/===\s*SECTION:\s*Quizzes\s*===/i)[1]?.split(/===\s*SECTION:/i)[0] || "";
  const quizPattern =
    /((?:Week\s*\d+\s*)?Quiz\s*\d+\s*:[^\n]+?)(?=\s*(?:Week\s*\d+\s*)?Quiz\s*\d+\s*:|Feedback\s*:|$|\d+\s*Submission)/gi;
  let quizMatch: RegExpExecArray | null;
  while ((quizMatch = quizPattern.exec(quizSection)) !== null) {
    const task = normalizeAssignmentTitle(quizMatch[1]);
    if (!isValidQuizTitle(task)) continue;
    const windowText = quizSection.slice(
      Math.max(0, quizMatch.index - 40),
      quizMatch.index + quizMatch[0].length + 220
    );
    const dueDate = findDueDateInText(windowText, anchorYear);
    addQuiz(task, dueDate, currentCourse);
  }

  const discussionSection =
    portalText.split(/===\s*SECTION:\s*Discussions\s*===/i)[1]?.split(/===\s*SECTION:/i)[0] ||
    "";
  for (const record of extractD2LDiscussionRecords(discussionSection)) {
    addDiscussion(record.title, record.dueDate, currentCourse);
  }

  // Line-by-line within Assignments section only.
  for (let i = 0; i < assignmentLines.length; i++) {
    const line = assignmentLines[i];
    if (isIrrelevantPortalLine(line) || isD2LTableNoise(line)) continue;

    for (const record of extractD2LAssignmentRecords(line, anchorYear)) {
      const dueDate = findDueDateNearLines(assignmentLines, i, anchorYear) || record.dueDate;
      addAssignment(record.task, dueDate, currentCourse);
    }

    const dueMatch = line.match(/^(?:due|due date|end date|deadline)\s*[:\-]?\s*(.+)$/i);
    if (!dueMatch) continue;

    const dueDate = normalizeDate(dueMatch[1], anchorYear);
    if (!dueDate) continue;

    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      for (const record of extractD2LAssignmentRecords(assignmentLines[j], anchorYear)) {
        addAssignment(record.task, dueDate, currentCourse);
      }
    }
  }

  const announcements: PortalItem["announcements"] = [...(structured?.announcements ?? [])];
  const announcementSection =
    portalText.split(/===\s*SECTION:\s*Announcements\s*===/i)[1]?.split(/===\s*SECTION:/i)[0] ||
    "";
  const seenAnnouncements = new Set(
    announcements.map((a) => (a.title || "").toLowerCase())
  );
  for (const line of announcementSection.split(/\r?\n/)) {
    const trimmed = line.replace(/\s+/g, " ").trim();
    if (!trimmed || trimmed.length < 10 || trimmed.length > 200) continue;
    if (isIrrelevantPortalLine(trimmed) || isD2LTableNoise(trimmed)) continue;
    if (/^(announcements?|news|posted|author|date)$/i.test(trimmed)) continue;
    const title = normalizeAssignmentTitle(trimmed);
    if (!title || seenAnnouncements.has(title.toLowerCase())) continue;
    seenAnnouncements.add(title.toLowerCase());
    announcements.push({
      title,
      course: sanitizeCourseName(currentCourse),
      date: currentDate,
    });
  }

  const resolvedAssignments = resolveAssignmentDueDates(assignments, portalText, currentDate);
  const resolvedQuizzes = resolveAssignmentDueDates(quizzes, portalText, currentDate);
  const resolvedDiscussions = discussions;

  const gradesSection =
    portalText.split(/===\s*SECTION:\s*Grades\s*===/i)[1]?.split(/===\s*SECTION:/i)[0] ||
    "";
  if (gradesSection) {
    let gradeCourse = currentCourse;
    for (const line of gradesSection.split(/\r?\n/)) {
      const trimmed = line.replace(/\s+/g, " ").trim();
      if (!trimmed || isIrrelevantPortalLine(trimmed)) continue;
      if (/[A-Z]{2,5}\s*\d{2,4}/i.test(trimmed)) {
        const candidate = sanitizeCourseName(trimmed);
        if (!isJunkCourseName(candidate)) {
          gradeCourse = candidate;
          break;
        }
      }
    }

    const lines = gradesSection.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (
        line.includes("final calculated grade") ||
        line.includes("final grade") ||
        line.includes("calculated final grade") ||
        line.includes("calculated grade")
      ) {
        let foundGrade: string | null = null;
        for (let j = i; j < Math.min(lines.length, i + 4); j++) {
          const match = lines[j].match(/(\d{1,3}(?:\.\d+)?\s*%)/);
          if (match) {
            foundGrade = match[1];
            break;
          }
        }
        if (foundGrade) {
          const hasAlready = grades.some(
            (g) => g.course.toLowerCase() === gradeCourse.toLowerCase()
          );
          if (!hasAlready) {
            grades.push({
              course: gradeCourse,
              grade: foundGrade,
              details: "Final Calculated Grade",
            });
          }
          break;
        }
      }
    }

    if (grades.length === 0) {
      for (const line of lines) {
        const match = line.match(/(.+?)\s*[:|-]?\s*(\d{1,3}(?:\.\d+)?)\s*%/);
        if (match) {
          const candidateCourse = sanitizeCourseName(match[1]);
          if (
            !isJunkCourseName(candidateCourse) &&
            !candidateCourse.toLowerCase().includes("final calculated grade") &&
            !candidateCourse.toLowerCase().includes("final grade")
          ) {
            const hasAlready = grades.some(
              (g) => g.course.toLowerCase() === candidateCourse.toLowerCase()
            );
            if (!hasAlready) {
              grades.push({
                course: candidateCourse,
                grade: match[2] + "%",
                details: null,
              });
            }
          }
        }
      }
    }
  }

  return {
    assignments: resolvedAssignments,
    announcements,
    discussions: resolvedDiscussions,
    quizzes: resolvedQuizzes,
    grades,
  };
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

export function mergePortalParseResults<T extends PortalParseResult>(
  primary: T,
  fallback: T
): T {
  const dedupeAssignments = (items: ParsedAssignment[], forQuizzes = false) => {
    const seen = new Set<string>();
    return items
      .filter((item) => {
        const task = (item.task || (item as { title?: string }).title || "").trim();
        if (!task || task.length < 8) return false;
        if (/^untitled(\s+assignment|\s+quiz)?$/i.test(task)) return false;
        if (forQuizzes) {
          if (/assignment\s*\d+\s*:/i.test(task)) return false;
          if (!isValidQuizTitle(task)) return false;
        } else {
          if (!isValidAssignmentTitle(task)) return false;
        }
        const key = task.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({
        ...item,
        task: item.task || (item as { title?: string }).title || "Untitled",
        course: isJunkCourseName(item.course || "")
          ? sanitizeCourseName(extractCourseCode(item.course || "") || "Course")
          : sanitizeCourseName(item.course || "Course"),
      }));
  };

  const primaryCount = countPortalItems(primary);
  const fallbackCount = countPortalItems(fallback);
  const richer = fallbackCount > primaryCount ? fallback : primary;
  const poorer = richer === fallback ? primary : fallback;

  const dedupeGrades = (items: any[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = (item.course || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const mergedAssignments = dedupeAssignments([...(richer.assignments ?? []), ...(poorer.assignments ?? [])]);
  const mergedQuizzes = dedupeAssignments([...(richer.quizzes ?? []), ...(poorer.quizzes ?? [])], true);
  const mergedGrades = dedupeGrades([...(richer.grades ?? []), ...(poorer.grades ?? [])]);

  return {
    ...richer,
    assignments: mergedAssignments,
    quizzes: mergedQuizzes,
    announcements: [...(richer.announcements ?? []), ...(poorer.announcements ?? [])],
    discussions: [...(richer.discussions ?? []), ...(poorer.discussions ?? [])],
    grades: mergedGrades,
  } as T;
}
