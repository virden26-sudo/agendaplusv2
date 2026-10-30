'use client';
import {AiConnection} from '@/components/ai-connection';
import {useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {parsePortalDataOnDevice, openStudentPortal, type PortalSyncPayload} from '@/lib/portal-sync-client';
import {countPortalItems} from '@/lib/portal-text-parser';
import {useCourseworkImport} from '@/hooks/use-coursework-import';
import {useUser} from '@/context/user-context';
import {apiFetch} from '@/lib/api-config';
export default function PortalPage() {
  const {portalUrl} = useUser();
  const importCoursework = useCourseworkImport();
  const [text, setText] = useState('');
  const [data, setData] = useState<PortalSyncPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const autoSync = async () => {
    setBusy(true); setMessage('Opening the portal through your connected desktop service. Complete sign-in if requested.');
    try {
      const response = await apiFetch('/api/parse-portal', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({portalUrl:portalUrl || 'https://navigate.nu.edu/d2l/home', mode:'manual'}), signal:AbortSignal.timeout(180000)});
      const result = await response.json();
      if (!response.ok || result.offline || !Array.isArray(result.assignments) || !Array.isArray(result.discussions) || !Array.isArray(result.quizzes) || !Array.isArray(result.announcements) || !Array.isArray(result.grades)) throw new Error(result.error || 'Automatic extraction needs a reachable desktop service. You can still paste portal text below.');
      setData(result); setMessage('Review the extracted coursework before importing.');
    } catch (error) {setMessage(error instanceof Error ? error.message : 'Automatic extraction failed. Paste portal text below.');}
    finally {setBusy(false);}
  };
  const rows = data ? [
    ...data.assignments.map(a => ({title:a.task, course:a.course, due:a.dueDate, details:a.details, type:'Assignment'})),
    ...data.quizzes.map(q => ({title:q.task, course:q.course, due:q.dueDate, details:q.details, type:'Quiz / Exam'})),
    ...data.discussions.map(d => ({title:d.title, course:d.course, due:d.dueDate, details:d.content, type:'Discussion'})),
    ...data.announcements.map(a => ({title:a.title, course:a.course, due:null, details:a.content, type:'Announcement'})),
    ...data.grades.map(g => ({title:g.details || g.course, course:g.course, due:null, details:g.grade, type:'Grade'})),
  ] : [];
  return <div className="mx-auto max-w-4xl space-y-6"><AiConnection /><Card><CardHeader><CardTitle>Import coursework</CardTitle><CardDescription>Import assignments, discussions, quizzes, exams, announcements and grades. Instructions are kept for your personal tutor.</CardDescription></CardHeader><CardContent className="space-y-4">
    <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => openStudentPortal(portalUrl)}>Open school portal</Button><Button variant="outline" disabled={busy} onClick={() => void autoSync()}>{busy ? 'Reading portal…' : 'Extract with desktop service'}</Button></div>
    <p className="text-sm text-muted-foreground">On any device, copy each course’s lists and instructions and paste them below. Include course names and section headings such as Assignments, Quizzes and Discussions. Missing deadlines stay unverified.</p>
    <label htmlFor="portal-text" className="block font-medium">Portal text or syllabus</label><Textarea id="portal-text" className="min-h-64" value={text} onChange={e => setText(e.target.value)} />
    <Button disabled={!text.trim() || busy} onClick={() => {const result = parsePortalDataOnDevice(text); setData(result); setMessage(`${countPortalItems(result)} items found. Review before importing.`);}}>Extract coursework</Button>
    {message && <p role="status">{message}</p>}
    {data && <section aria-label="Extracted coursework" className="space-y-4"><h2 className="font-semibold">Review {rows.length} items</h2>{rows.map((row,i) => <article key={i} className="rounded border p-3"><p className="text-sm text-muted-foreground">{row.type} · {row.course}</p><h3 className="font-semibold">{row.title}</h3><p>Due: {row.due || 'Unverified'}</p>{row.details && <p className="whitespace-pre-wrap text-sm">{row.details}</p>}</article>)}<Button disabled={!rows.length} onClick={() => {const count = importCoursework(data); setData(null); setText(''); setMessage(`Imported ${count} coursework items. Open Personal Tutor to test your understanding.`);}}>Confirm import</Button></section>}
  </CardContent></Card></div>;
}
