import { parseGradesHeuristically } from "@/lib/client-ai-fallbacks";
import { parsePortalTextHeuristically } from "@/lib/portal-text-parser";
import type { ParsedAssignment } from "@/ai/schemas/assignment";

export type PortalSyncPayload = {
    assignments: ParsedAssignment[];
    announcements: { title: string; content?: string; date?: string; course?: string }[];
    discussions: {
        title: string;
        content?: string;
        dueDate?: string | null;
        postedDate: string;
        course?: string;
    }[];
    quizzes: ParsedAssignment[];
    grades: { course: string; grade: string; details?: string | null }[];
};

/** Parse copied portal text entirely on this device — no server or PC. */
export function parsePortalDataOnDevice(
    portalText: string,
    currentDate = new Date().toLocaleDateString("en-CA")
): PortalSyncPayload {
    const parsed = parsePortalTextHeuristically(portalText, currentDate);
    const gradeRows = parseGradesHeuristically(portalText).courses.map((course) => ({
        course: course.name,
        grade: String(course.grade),
        details: null as string | null,
    }));

    return {
        assignments: parsed.assignments,
        announcements: parsed.announcements,
        discussions: parsed.discussions,
        quizzes: parsed.quizzes,
        grades: gradeRows,
    };
}

export function openStudentPortal(portalUrl: string) {
    const target = portalUrl.trim() || "https://navigate.nu.edu/d2l/home";
    window.open(target, "_blank", "noopener,noreferrer");
}

export async function readClipboardText(): Promise<string> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
        return "";
    }

    try {
        return (await navigator.clipboard.readText()).trim();
    } catch {
        return "";
    }
}
