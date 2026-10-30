'use client';
import {useAssignments} from '@/context/assignments-context';
import {useQuizzes} from '@/context/quizzes-context';
import {usePortal} from '@/context/portal-context';
import {useGrades} from '@/context/grades-context';
import type {PortalSyncPayload} from '@/lib/portal-sync-client';
const id = () => crypto.randomUUID();
const date = (value?: string | null) => value ? new Date(value + (value.length === 10 ? 'T12:00:00' : '')) : undefined;
export function useCourseworkImport() {
  const {addMultipleAssignments} = useAssignments();
  const {quizzes, loadData} = useQuizzes();
  const {addDiscussions, addAnnouncements} = usePortal();
  const {courses, setCourses} = useGrades();
  return (data: PortalSyncPayload) => {
    addMultipleAssignments(data.assignments);
    const merged = new Map(quizzes.map(q => [`${q.course.toLowerCase()}|${q.title.toLowerCase()}`, q]));
    for (const q of data.quizzes) {
      const course = q.course || 'Course';
      const key = `${course.toLowerCase()}|${q.task.toLowerCase()}`;
      merged.set(key, {...merged.get(key), id: merged.get(key)?.id || id(), title:q.task, course, dueDate:date(q.dueDate), details:q.details || undefined});
    }
    loadData([...merged.values()]);
    addDiscussions(data.discussions.map(d => ({id:id(), title:d.title, course:d.course || 'Course', content:d.content || undefined, dueDate:date(d.dueDate), postedDate:date(d.postedDate) || new Date()})));
    addAnnouncements(data.announcements.map(a => ({id:id(), title:a.title, course:a.course || 'Course', content:a.content || '', date:date(a.date) || new Date(), important:false})));
    const grades = new Map(courses.map(c => [c.name.toLowerCase(),c]));
    for (const g of data.grades) {const grade = Number.parseFloat(g.grade); if (Number.isFinite(grade)) grades.set(g.course.toLowerCase(), {id:grades.get(g.course.toLowerCase())?.id || id(), name:g.course, grade});}
    setCourses([...grades.values()]);
    return data.assignments.length + data.quizzes.length + data.discussions.length + data.announcements.length + data.grades.length;
  };
}
