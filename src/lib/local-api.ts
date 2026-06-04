import {
    parseAssignmentHeuristically,
    parseGradesHeuristically,
    buildStudyScheduleHeuristic,
    tutorReplyHeuristic,
} from "@/lib/client-ai-fallbacks";
import { parsePortalDataOnDevice } from "@/lib/portal-sync-client";
import type { TutorInput, TutorOutput } from "@/ai/schemas";
import type { ParsedAssignment } from "@/ai/schemas/assignment";

/** All Agenda+ features run on-device — no backend URL or PC required. */

export function parsePortal(input: { portalText?: string; currentDate?: string }) {
    const text = input.portalText?.trim();
    if (!text) {
        throw new Error("Copy your assignments from your school portal, then paste them here.");
    }
    return parsePortalDataOnDevice(text, input.currentDate);
}

export function parseAssignmentText(assignmentText: string): ParsedAssignment {
    return parseAssignmentHeuristically(assignmentText);
}

export function parseGradesText(text: string) {
    return parseGradesHeuristically(text);
}

export function parseSyllabusText(text: string): ParsedAssignment[] {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const assignments: ParsedAssignment[] = [];

    for (const line of lines) {
        if (line.length < 8) continue;
        if (/^(week|module|chapter|syllabus|course)/i.test(line)) continue;
        try {
            assignments.push(parseAssignmentHeuristically(line));
        } catch {
            // skip unparseable lines
        }
    }

    if (assignments.length === 0 && text.trim()) {
        assignments.push(parseAssignmentHeuristically(text.slice(0, 500)));
    }

    return assignments;
}

export function suggestStudySchedule(assignmentsJson: string) {
    let items: Array<{ title?: string; task?: string; dueDate?: string | Date }> = [];
    try {
        items = JSON.parse(assignmentsJson) as typeof items;
    } catch {
        items = [];
    }

    const normalized = items.map((item) => ({
        title: item.title || item.task || "Assignment",
        dueDate: item.dueDate ? new Date(item.dueDate) : new Date(),
    }));

    const plan = buildStudyScheduleHeuristic(normalized);
    return {
        suggestedSchedule: JSON.stringify(plan.suggestedSchedule),
        reasoning: plan.reasoning,
    };
}

export function askTutorOnDevice(input: TutorInput): TutorOutput {
    return tutorReplyHeuristic(input);
}

export function extractItemsFromText(text: string) {
    return parsePortal({ portalText: text });
}
