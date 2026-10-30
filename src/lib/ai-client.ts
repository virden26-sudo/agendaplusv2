import type {PortalData, TutorInput, TutorOutput} from '@/ai/schemas';
import {TutorOutputSchema} from '@/ai/schemas';
import {askTutorOnDevice, extractItemsFromText} from '@/lib/local-api';
import {apiFetch} from '@/lib/api-config';

export function extractItems(text: string): Promise<PortalData> {
    const parsed = extractItemsFromText(text);
    return Promise.resolve({courseName: parsed.assignments[0]?.course || parsed.quizzes[0]?.course || parsed.discussions[0]?.course || 'Portal', items: [
      ...parsed.assignments.map(a => ({title: a.task, dueDate: a.dueDate || '', type: 'Assignment' as const})),
      ...parsed.quizzes.map(q => ({title: q.task, dueDate: q.dueDate || '', type: 'Quiz' as const})),
      ...parsed.discussions.map(d => ({title: d.title, dueDate: d.dueDate || '', type: 'Discussion' as const})),
    ]});
}
export async function askTutor(input: TutorInput): Promise<TutorOutput> {
    try {
      const response = await apiFetch('/api/tutor', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(input), signal: AbortSignal.timeout(20000)});
      if (response.ok) {
        const result = TutorOutputSchema.safeParse(await response.json());
        if (result.success) return result.data;
      }
    } catch { /* The same learning workflow is available without an AI backend. */ }
    return askTutorOnDevice(input);
}
