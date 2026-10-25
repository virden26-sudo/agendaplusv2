import type { ParsedAssignment } from "@/ai/schemas/assignment";
import { normalizeAssignmentTitle, sanitizeCourseName, isObviousJunkTitle } from "@/lib/assignment-quality";

export type PortalParseResult = {
  assignments: ParsedAssignment[];
  announcements: { title: string; content?: string | null; date?: string | null; course?: string | null }[];
  discussions: { title: string; content?: string | null; dueDate?: string | null; postedDate: string; course?: string | null }[];
  quizzes: ParsedAssignment[];
  grades: { course: string; grade: string; details?: string | null }[];
};
type Section = keyof PortalParseResult;
const empty = (): PortalParseResult => ({ assignments: [], announcements: [], discussions: [], quizzes: [], grades: [] });
const sectionName = (value: string): Section | null => {
  if (/^(assignments?|dropbox|homework|readings?)$/i.test(value)) return 'assignments';
  if (/^(quizzes|quiz|exams?|tests?)$/i.test(value)) return 'quizzes';
  if (/^(discussions?|forums?)$/i.test(value)) return 'discussions';
  if (/^(announcements?|news)$/i.test(value)) return 'announcements';
  if (/^grades?$/i.test(value)) return 'grades';
  return null;
};
const noise = (text: string) => !text || isObviousJunkTitle(text) || /^(name|title|due date|status|score|grade|points|feedback|availability|actions|topic|threads|posts|last post|attempts|evaluation status|completed|not submitted|not started|published|unread|start a new thread|subscribe|show all|total|\d+)$/i.test(text);

/** Only explicit due dates are accepted. Availability dates and neighbouring rows are not deadlines. */
export function parseExplicitDueDate(text: string, year: number): string | null {
  const labeled = text.match(/(?:\bdue(?: date)?|deadline)\s*[:–—-]?\s*(?:on\s+)?(.+)/i);
  if (!labeled) return null;
  const raw = labeled[1];
  let parts: number[] | undefined;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  const named = raw.match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
  if (iso) parts = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (slash) parts = [slash[3] ? Number(slash[3]) : year, Number(slash[1]), Number(slash[2])];
  else if (named) {
    const month = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(named[1].slice(0,3).toLowerCase()) + 1;
    if (month) parts = [named[3] ? Number(named[3]) : year, month, Number(named[2])];
  }
  if (!parts) return null;
  let [y,m,d] = parts;
  if (y < 100) y += 2000;
  const date = new Date(Date.UTC(y,m-1,d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m-1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0,10);
}

const key = (title: string, course?: string | null) => `${(course || 'Course').trim().toLowerCase()}|${title.trim().toLowerCase()}`;

export function mergePortalParseResults<T extends PortalParseResult>(primary: T, fallback: T): T {
  const result = empty();
  for (const section of Object.keys(result) as Section[]) {
    const seen = new Map<string, Record<string, unknown>>();
    for (const item of [...primary[section], ...fallback[section]]) {
      const row = item as unknown as Record<string, unknown>;
      const title = String(row.task || row.title || row.details || row.course || '');
      const id = key(title, row.course as string);
      const existing = seen.get(id);
      if (existing) {
        // Fill missing metadata without replacing evidence from the primary parser.
        for (const [field, value] of Object.entries(row)) if (!existing[field] && value) existing[field] = value;
      } else seen.set(id, { ...row });
    }
    (result[section] as unknown[]) = [...seen.values()];
  }
  return { ...primary, ...result } as T;
}

/** Section-aware parser shared by pasted text, syllabi, Android and scraped D2L pages. */
export function parsePortalTextHeuristically(portalText: string, currentDate = new Date().toISOString().slice(0,10)): PortalParseResult {
  const result = empty();
  const year = Number(currentDate.slice(0,4)) || new Date().getFullYear();
  const add = (section: Section, title: string, course: string, details: string, dueDate: string | null) => {
    title = normalizeAssignmentTitle(title.replace(/^[•*\-]\s*/, '').replace(/\s+(?:due(?: date)?|deadline)\b.*$/i, '').trim());
    if (title.length < 3 || noise(title)) return;
    if (section === 'discussions') result.discussions.push({title, course, content: details, dueDate, postedDate: currentDate});
    else if (section === 'announcements') result.announcements.push({title, course, content: details, date: null});
    else if (section === 'grades') {
      const match = details.match(/\b(\d{1,3}(?:\.\d+)?)\s*%/);
      if (match && Number(match[1]) <= 100) result.grades.push({course, grade: match[1]+'%', details: title});
    } else result[section].push({task: title, course, details, dueDate});
  };
  // Structured data is authoritative about item type and course. Do not reparse its JSON as prose.
  const text = portalText.replace(/===\s*STRUCTURED:\s*(\w+)\s*===\s*([\s\S]*?)(?=\n===|$)/gi, (_block, label, payload) => {
    const section = sectionName(label);
    try {
      const data = JSON.parse(payload.trim());
      if (section && Array.isArray(data.items)) for (const row of data.items) {
        const course = sanitizeCourseName(row.course || data.course || 'Course');
        const title = row.task || row.title || '';
        add(section, title, course, row.details || row.content || '', row.dueDate ? parseExplicitDueDate('Due: '+row.dueDate, year) : null);
      }
    } catch { /* Malformed structured blocks do not poison other sections. */ }
    return '\n';
  });
  let course = 'Course';
  let section: Section | null = null;
  let pending: {section: Section; title: string; course: string; lines: string[]} | null = null;
  const flush = () => {
    if (!pending) return;
    const details = pending.lines.join('\n');
    add(pending.section, pending.title, pending.course, details, parseExplicitDueDate(details, year));
    pending = null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t+/g,' ').trim();
    if (!line) continue;
    const marker = line.match(/^===\s*SECTION:\s*(.+?)\s*===$/i);
    const heading = sectionName((marker?.[1] || line).replace(/:$/, ''));
    if (heading) { flush(); section = heading; continue; }
    // Course headers must start with a course code; instructions may mention another course.
    if (/^(?:Course:\s*)?[A-Z]{2,5}\s*[-]?\d{2,4}(?:\b|\s)/.test(line) && !/\b(due|assignment|quiz|discussion)\b/i.test(line)) {
      flush(); course = sanitizeCourseName(line.replace(/^Course:\s*/i,'')); continue;
    }
    if (noise(line)) {
      if (pending && /^(not submitted|submitted|completed|not started)$/i.test(line)) pending.lines.push('Status: '+line);
      continue;
    }
    const explicit = /\b(discussion|forum|topic)\s*\d*\s*[:–—-]|\bdiscussion\s+\d+/i.test(line) ? 'discussions'
      : /\b(quiz|exam|midterm|final exam|test)\b/i.test(line) ? 'quizzes'
      : /\b(assignment|homework|project|essay|lab|reading)\s*(?:\d+|[:–—-])/i.test(line) ? 'assignments' : null;
    const metadata = /^(?:due|deadline|available|opens?|closes?|starts?|ends?|instructions?|description|requirements?|attempts?|grade|score|points|submitted|not submitted|completed|read chapter|write |explain |create |discuss |reply |respond |post |use |the |a |an )/i.test(line);
    const isTitle = !metadata && line.length <= 220 && (explicit || (section && (!pending || pending.lines.some(l => /^(due|deadline|score|grade|attempt|status)/i.test(l)))));
    if (isTitle) {
      flush(); pending = {section: explicit || section || 'assignments', title: line, course, lines: [line]};
    } else if (pending) pending.lines.push(line);
  }
  flush();
  return mergePortalParseResults(result, empty());
}
export function countPortalItems(result: Partial<Record<Section, unknown[]>>) {
  return Object.values(result).reduce((sum, items) => sum + (items?.length || 0), 0);
}
