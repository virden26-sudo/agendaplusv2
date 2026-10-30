'use client';
import {AiConnection} from '@/components/ai-connection';
import {useEffect, useMemo, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useAssignments} from '@/context/assignments-context';
import {useQuizzes} from '@/context/quizzes-context';
import {usePortal} from '@/context/portal-context';
import {useGrades} from '@/context/grades-context';
import {askTutor} from '@/lib/ai-client';
import {apiFetch} from '@/lib/api-config';
import {DiagnosticQuestionsSchema} from '@/ai/diagnostic-schemas';
import {buildDiagnostic, buildRetest, recordAnswer, type Mastery, type PracticeQuestion} from '@/lib/tutor-engine';
import Markdown from 'react-markdown';

export default function TutorPage() {
  const {assignments, loading: assignmentsLoading} = useAssignments();
  const {quizzes, loading: quizzesLoading} = useQuizzes();
  const {discussions, loading: portalLoading} = usePortal();
  const {courses} = useGrades();
  const [notes, setNotes] = useState('');
  const [mastery, setMastery] = useState<Mastery>({});
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [missed, setMissed] = useState<PracticeQuestion[]>([]);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<{role: 'student' | 'tutor'; text: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [diagnosticLoading,setDiagnosticLoading]=useState(false);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('agendaTutorMastery') || '{}');
      if (stored && typeof stored === 'object' && !Array.isArray(stored)) setMastery(Object.fromEntries(Object.entries(stored).filter(([,v]) => v && typeof v === 'object' && Number.isFinite((v as {correct:number}).correct) && Number.isFinite((v as {attempts:number}).attempts)) ) as Mastery);
      setNotes(localStorage.getItem('agendaTutorNotes') || '');
    } catch { /* Ignore corrupt optional learning progress. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) {localStorage.setItem('agendaTutorMastery', JSON.stringify(mastery)); localStorage.setItem('agendaTutorNotes', notes);} }, [mastery, notes, ready]);
  const sources = useMemo(() => [
    ...assignments.map(a => ({...a, kind: 'Assignment'})),
    ...quizzes.map(q => ({...q, kind: 'Quiz'})),
    ...discussions.map(d => ({...d, details: d.content, kind: 'Discussion'})),
    ...(notes.trim() ? [{id: 'study-notes', title: 'My study notes', course: courses[0]?.name || '', details: notes, kind: 'Notes'}] : []),
  ], [assignments, quizzes, discussions, notes, courses]);
  const bank = useMemo(() => buildDiagnostic(sources, mastery), [sources, mastery]);
  const current = queue[index];
  const start = (questions = bank) => {
    if (!questions.length) {setNotice('No supported questions yet. Import instructions with Java topics, or paste explanatory notes containing definitions. Due dates alone are not enough to build a test.'); return;}
    setQueue(questions); setIndex(0); setSelected(null); setChecked(false); setMissed([]); setNotice('');
  };
  const generateDiagnostic = async () => {
    setDiagnosticLoading(true); setNotice('Generating practice questions from your coursework…');
    try {
      const response=await apiFetch('/api/diagnostic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sources:sources.slice(0,50).map(s=>({...s,details:s.details?.slice(0,16000)})),weakTopics:Object.entries(mastery).filter(([,m])=>m.correct<m.attempts).map(([topic])=>topic)}),signal:AbortSignal.timeout(65000)});
      const body=await response.json();
      const parsed=DiagnosticQuestionsSchema.safeParse(body);
      if(!response.ok || !parsed.success) throw new Error(body.error || 'AI service unavailable.');
      const questions=parsed.data.questions.map((q,i)=>{
        const source=sources.find(s=>s.id===q.sourceId);
        if(!source) throw new Error('The AI returned an unknown source.');
        return {...q,id:`ai:${Date.now()}:${i}`,sourceTitle:source.title};
      });
      start(questions);
    } catch(error){setNotice(error instanceof Error ? error.message : 'The AI service is unavailable. You can use on-device practice.');}
    finally{setDiagnosticLoading(false);}
  };
  const check = () => {
    if (selected === null || checked || !current) return;
    setMastery(prev => recordAnswer(prev, current, selected));
    if (selected !== current.answer) setMissed(prev => [...prev, current]);
    setChecked(true);
  };
  const next = () => {setIndex(i => i+1); setSelected(null); setChecked(false);};
  const submit = async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    const text = question.trim(); setQuestion('');
    setHistory(prev => [...prev, {role:'student', text}]);
    try {
      const reply = await askTutor({question: text, context: {assignments: [...assignments, ...(notes.trim() ? [{id:'study-notes', title:'My study notes', course:courses[0]?.name || '', details:notes, completed:false}] : [])], quizzes, discussions, courses, currentDate: new Date().toISOString().slice(0,10), history: history.slice(-18)}});
      setHistory(prev => [...prev, {role:'tutor', text:reply.response}]);
    } catch {setNotice('The tutor could not respond. Your diagnostic and saved progress are still available.');}
    finally {setLoading(false);}
  };
  const dataLoading = !ready || assignmentsLoading || quizzesLoading || portalLoading;
  return <div className="mx-auto max-w-3xl space-y-6"><AiConnection />
    <Card><CardHeader><CardTitle>Personal Tutor</CardTitle><CardDescription>Test your understanding of imported assignments, quizzes and discussions. Review mistakes, then practice again.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <p>{sources.filter(s => s.id !== 'study-notes').length} coursework items available. {bank.length} practice questions supported by the material.</p>
        <label htmlFor="study-notes" className="block font-medium">Study notes or lesson text</label>
        <Textarea id="study-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Paste lesson explanations here. Notes are saved on this device." />
        <div className="flex flex-wrap gap-3"><Button onClick={() => start()} disabled={dataLoading || diagnosticLoading || Boolean(current)}>Start diagnostic</Button><Button variant="outline" disabled={dataLoading || diagnosticLoading || Boolean(current) || !sources.length} onClick={() => void generateDiagnostic()}>{diagnosticLoading ? 'Generating…' : 'Generate AI diagnostic'}</Button></div>
        {notice && <p role="status">{notice}</p>}
        {current && <section aria-label="Practice question" className="space-y-4 rounded-lg border p-4">
          <p>Question {index+1} of {queue.length} · {current.topic}</p>
          <p className="text-sm text-muted-foreground">From: {current.sourceTitle}</p>
          <h2 className="font-semibold">{current.prompt}</h2>
          <fieldset className="space-y-2"><legend className="sr-only">Choose an answer</legend>{current.choices.map((choice,i) => <label key={choice} className="flex gap-2 rounded border p-3"><input type="radio" name="practice-answer" checked={selected === i} disabled={checked} onChange={() => setSelected(i)} />{choice}</label>)}</fieldset>
          {!checked ? <Button disabled={selected === null} onClick={check}>Check answer</Button> : <div role="status" className="space-y-3"><p className="font-semibold">{selected === current.answer ? 'Correct' : 'Let’s work through this'}</p><p>{current.explanation}</p><Button onClick={next}>{index+1 < queue.length ? 'Next question' : 'See results'}</Button></div>}
        </section>}
        {queue.length > 0 && !current && <section aria-label="Diagnostic results" className="space-y-3"><h2 className="font-semibold">Diagnostic complete</h2><p>{queue.length - missed.length} of {queue.length} correct.</p>{missed.length ? <><p>Review these concepts: {Array.from(new Set(missed.map(q => q.topic))).join(', ')}.</p><Button onClick={() => start(buildRetest(missed))}>Retest missed concepts</Button></> : <p>All questions passed. Add more lesson material to keep learning.</p>}</section>}
        {Object.keys(mastery).length > 0 && <div><h2 className="font-semibold">Saved learning progress</h2><ul className="list-disc pl-5">{Object.entries(mastery).map(([topic,m]) => <li key={topic}>{topic}: {m.correct}/{m.attempts} practice answers correct</li>)}</ul></div>}
      </CardContent></Card>
    <Card><CardHeader><CardTitle>Ask for an explanation</CardTitle><CardDescription>The optional AI service uses your coursework and this conversation. Offline explanations cover supported topics from your material.</CardDescription></CardHeader><CardContent className="space-y-4">
      {history.map((m,i) => <div key={i} className="rounded border p-3"><p className="font-semibold">{m.role === 'student' ? 'You' : 'Tutor'}</p><Markdown>{m.text}</Markdown></div>)}
      <label htmlFor="tutor-question">What would you like to understand?</label><Textarea id="tutor-question" value={question} onChange={e => setQuestion(e.target.value)} disabled={loading} />
      <Button onClick={() => void submit()} disabled={loading || dataLoading || !question.trim()}>{loading ? 'Thinking…' : 'Ask tutor'}</Button>
    </CardContent></Card>
  </div>;
}
