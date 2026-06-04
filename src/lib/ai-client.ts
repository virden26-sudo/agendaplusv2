import type {PortalData, TutorInput, TutorOutput} from '@/ai/schemas';
import {askTutorOnDevice, extractItemsFromText} from '@/lib/local-api';

export function extractItems(text: string): Promise<PortalData> {
    const parsed = extractItemsFromText(text);
    const items = [
        ...parsed.assignments.map((a) => ({
            title: a.task,
            dueDate: a.dueDate || new Date().toISOString().slice(0, 10),
            type: 'Assignment' as const,
        })),
        ...parsed.quizzes.map((q) => ({
            title: q.task,
            dueDate: q.dueDate || new Date().toISOString().slice(0, 10),
            type: 'Quiz' as const,
        })),
    ];

    return Promise.resolve({
        courseName: parsed.assignments[0]?.course || parsed.quizzes[0]?.course || 'Portal',
        items,
    });
}

export function askTutor(input: TutorInput) {
    return Promise.resolve(askTutorOnDevice(input) as TutorOutput);
}
