import { parsePortalTextHeuristically } from "./portal-text-parser";
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
