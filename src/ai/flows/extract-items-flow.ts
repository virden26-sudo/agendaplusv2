import {parsePortalTextHeuristically} from '@/lib/portal-text-parser';
import type {PortalData} from '@/ai/schemas';
/** All extracted types follow the same on-device rules; never infer an unsupported deadline. */
export async function extractPortalData(text: string): Promise<PortalData> {
  const parsed = parsePortalTextHeuristically(text);
  return {courseName:parsed.assignments[0]?.course || parsed.quizzes[0]?.course || parsed.discussions[0]?.course || '', items:[
    ...parsed.assignments.map(a => ({title:a.task, dueDate:a.dueDate || '', type:'Assignment' as const})),
    ...parsed.quizzes.map(q => ({title:q.task, dueDate:q.dueDate || '', type:/exam|midterm|test/i.test(q.task) ? 'Exam' as const : 'Quiz' as const})),
    ...parsed.discussions.map(d => ({title:d.title, dueDate:d.dueDate || '', type:'Discussion' as const})),
  ]};
}
