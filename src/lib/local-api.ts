import {
    parseAssignmentHeuristically,
    parseGradesHeuristically,
    buildStudyScheduleHeuristic,
    tutorReplyHeuristic,
} from "@/lib/client-ai-fallbacks";
import { parsePortalDataOnDevice } from "@/lib/portal-sync-client";
import type { TutorInput, TutorOutput } from "@/ai/schemas";
import { AssignmentSchema, type ParsedAssignment } from "@/ai/schemas/assignment";
import { apiFetch } from "@/lib/api-config";

/** All Agenda+ features run on-device — no backend URL or PC required. */

export function parsePortal(input: { portalText?: string; currentDate?: string }) {
    const text = input.portalText?.trim();
    if (!text) {
        throw new Error("Copy your assignments from your school portal, then paste them here.");
    }
    return parsePortalDataOnDevice(text, input.currentDate);
}

export async function parseAssignmentText(assignmentText: string): Promise<ParsedAssignment> {
    try {
        const response = await apiFetch("/api/parse-assignment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                assignmentText,
                currentDate: new Date().toLocaleDateString("en-CA"),
            }),
        });
        if (response && response.ok) {
            const data = await response.json();
            const parsed = AssignmentSchema.safeParse(data);
            if (!data?.offline && parsed.success && parsed.data.task.trim()) {
                return parsed.data;
            }
        }
    } catch (e) {
        console.warn("AI parsing failed or unreachable, falling back to heuristics:", e);
    }
    return parseAssignmentHeuristically(assignmentText);
}

export function parseGradesText(text: string) {
    return parseGradesHeuristically(text);
}

export function parseSyllabusText(text: string): ParsedAssignment[] {
    const parsed = parsePortalDataOnDevice(text);
    return [...parsed.assignments,
      ...parsed.quizzes.map(q => ({...q, details: `[Quiz / Exam] ${q.details || ''}`})),
      ...parsed.discussions.map(d => ({task:d.title, course:d.course, dueDate:d.dueDate, details:`[Discussion] ${d.content || ''}`})),
    ];
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
