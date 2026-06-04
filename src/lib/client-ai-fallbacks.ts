import { parsePortalTextHeuristically as _parsePortalTextHeuristically } from "./portal-text-parser";
import type { Assignment as ParsedAssignment } from "@/ai/schemas/assignment";

/**
 * Fallback parser for natural language assignment input when Ollama is unavailable.
 * Uses regex to extract task, course, and due date.
 */
export function parseAssignmentHeuristically(
    text: string,
    currentDate = new Date()
): ParsedAssignment {
    const lower = text.toLowerCase();

    // 1. Extract Task
    // Try to remove common noise and take the first part
    let task = text
        .replace(/(due|for|in|class|course|by)\s+.*$/i, "")
        .replace(/^(add|create|new|assignment|task)\s+/i, "")
        .trim();

    if (!task) task = "Untitled Task";

    // 2. Extract Course
    // Match common course codes like CS101, MATH 200, etc.
    const courseMatch = text.match(/([A-Z]{2,5}\s?\d{2,4})/i);
    const course = courseMatch ? courseMatch[1].toUpperCase() : "General";

    // 3. Extract Due Date
    let dueDate = new Date();

    if (lower.includes("tomorrow")) {
        dueDate.setDate(dueDate.getDate() + 1);
    } else if (lower.includes("next week")) {
        dueDate.setDate(dueDate.getDate() + 7);
    } else if (lower.includes("next friday")) {
        const day = 5; // Friday
        dueDate.setDate(dueDate.getDate() + (day + 7 - dueDate.getDay()) % 7 || 7);
    } else if (lower.includes("next monday")) {
        const day = 1; // Monday
        dueDate.setDate(dueDate.getDate() + (day + 7 - dueDate.getDay()) % 7 || 7);
    } else {
        // Simple MM/DD match
        const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})/);
        if (dateMatch) {
            const m = parseInt(dateMatch[1]) - 1;
            const d = parseInt(dateMatch[2]);
            const year = currentDate.getFullYear();
            dueDate = new Date(year, m, d);
            // If date already passed, assume next year
            if (dueDate < currentDate) {
                dueDate.setFullYear(year + 1);
            }
        }
    }

    return {
        task,
        dueDate: dueDate.toISOString().split('T')[0],
        course,
        details: text,
        priority: lower.includes("urgent") || lower.includes("important") ? "high" : "medium"
    };
}

/**
 * Fallback parser for grades when Ollama is unavailable.
 * Searches for course names and percentages.
 */
export function buildStudyScheduleHeuristic(
    assignments: Array<{ title: string; dueDate: Date }>
) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const sorted = [...assignments]
        .filter((a) => a.title.trim())
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const suggestedSchedule = sorted.slice(0, 8).map((assignment, index) => ({
        day: days[index % days.length],
        startTime: "17:00",
        endTime: "18:30",
        assignment: assignment.title,
    }));

    return {
        suggestedSchedule,
        reasoning:
            sorted.length === 0
                ? "Add assignments first, then generate a plan."
                : "Study blocks were scheduled on this device based on your upcoming due dates.",
    };
}

export function tutorReplyHeuristic(input: {
    question: string;
    context?: {
        assignments?: Array<{ title?: string; course?: string; dueDate?: Date | string }>;
        currentDate?: string;
    };
}): { response: string } {
    const upcoming = input.context?.assignments?.length ?? 0;
    const question = input.question.trim();

    let response =
        "I'm running entirely on your device — no computer or server setup needed.\n\n";

    if (upcoming > 0) {
        response += `You have **${upcoming}** upcoming assignment(s) in Agenda+. `;
    }

    response +=
        `For your question: *${question.slice(0, 200)}*\n\n` +
        "Open your **Assignments** and **Calendar** tabs for due dates. " +
        "For course-specific help, check the material in your school portal or ask your instructor.";

    return { response };
}

export function parseGradesHeuristically(text: string) {
    const courses: any[] = [];
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        // Look for something like "Course Name 95%" or "Course: 88.5"
        const match = line.match(/(.+?)\s*[:|-]?\s*(\d{1,3}(?:\.\d+)?)\s*%/);
        if (match) {
            courses.push({
                id: Math.random().toString(36).substr(2, 9),
                name: match[1].trim(),
                grade: parseFloat(match[2]),
                lastUpdated: new Date().toISOString()
            });
        }
    }

    return { courses };
}


/**
 * Unified client-side executor that tries the AI backend first,
 * then falls back to heuristic parsing.
 */
export async function smartFetch<T>(
    url: string,
    options: RequestInit,
    fallbackFn: (body: any) => T
): Promise<T> {
    try {
        const response = await fetch(url, {
            ...options,
            // Short timeout for AI calls on mobile
            signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
            return await response.json();
        }
        console.warn(`Backend returned ${response.status}, falling back to client-side logic.`);
    } catch (error) {
        console.warn("Backend unreachable, falling back to client-side logic.", error);
    }

    // Return the result of the deterministic fallback
    const body = options.body ? JSON.parse(options.body as string) : {};
    return fallbackFn(body);
}
