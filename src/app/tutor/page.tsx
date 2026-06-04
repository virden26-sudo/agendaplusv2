'use client';

import {useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/hooks/use-toast';
import {GradientIcon} from '@/components/ui/gradient-icon';
import type {TutorOutput} from '@/ai/schemas';
import {useAssignments} from '@/context/assignments-context';
import {useQuizzes} from '@/context/quizzes-context';
import {useGrades} from '@/context/grades-context';
import {Skeleton} from '@/components/ui/skeleton';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import Markdown from 'react-markdown';
import {askTutor} from '@/lib/ai-client';


export default function TutorPage() {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<TutorOutput | null>(null);

    const {toast} = useToast();
    const {assignments, loading: assignmentsLoading} = useAssignments();
    const {quizzes, loading: quizzesLoading} = useQuizzes();
    const {courses, loading: gradesLoading} = useGrades();
    const contextLoading = assignmentsLoading || quizzesLoading || gradesLoading;

    const handleSubmit = async () => {
        if (!question.trim()) {
            toast({
                variant: 'destructive',
                title: 'Please enter a question.',
            });
            return;
        }

        setLoading(true);
        setResponse(null);
        try {
            const tutorResponse = await askTutor({
                question,
                context: {
                    assignments: assignments.filter(a => !a.completed),
                    quizzes,
                    courses,
                    currentDate: new Date().toLocaleDateString(),
                },
            });
            setResponse(tutorResponse);
        } catch (error) {
            console.error('AI Tutor failed:', error);
            toast({
                variant: 'destructive',
                title: 'Error getting response',
                description: 'The AI tutor failed to generate a response. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit();
        }
    };

    const exampleQuestions = [
        "What should I study today?",
        "I'm feeling overwhelmed, can you help me prioritize?",
        "Explain the Pythagorean theorem like I'm five.",
        "Give me a practice problem for my calculus homework."
    ];

    const handleExampleClick = (example: string) => {
        setQuestion(example);
    };

    return (
        <div className="flex justify-center items-start pt-2">
            <Card className="w-full max-w-3xl">
                <CardHeader className="text-center">
                    <GradientIcon name="Bot" className="mx-auto h-12 w-12 mb-2"/>
                    <CardTitle className="text-gradient text-3xl">AI Tutor</CardTitle>
                    <CardDescription>
                        Your personal academic assistant. Ask me anything about your courses, assignments, or study
                        strategies.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Textarea
                            id="tutor-question"
                            placeholder="e.g., 'What are the key themes in Hamlet?'"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-24 text-base"
                            disabled={loading}
                        />
                        <div className="flex flex-wrap gap-2 pt-2">
                            {exampleQuestions.map(q => (
                                <Button key={q} variant="outline" size="sm" onClick={() => handleExampleClick(q)}
                                        disabled={loading}>
                                    {q}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Button className="w-full" onClick={handleSubmit} disabled={loading || contextLoading}>
                        {loading ? <GradientIcon name="Loader2" className="animate-spin mr-2"/> :
                            <GradientIcon name="Sparkles" className="mr-2"/>}
                        {loading ? 'Thinking...' : contextLoading ? 'Loading your data...' : 'Ask Agenda+'}
                    </Button>

                    {loading && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-start space-x-4">
                                <Avatar>
                                    <AvatarFallback>A+</AvatarFallback>
                                </Avatar>
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/4"/>
                                    <Skeleton className="h-4 w-full"/>
                                    <Skeleton className="h-4 w-3/4"/>
                                </div>
                            </div>
                        </div>
                    )}

                    {response && (
                        <div className="pt-4 animate-in fade-in-50 duration-500">
                            <div className="flex items-start space-x-4">
                                <Avatar>
                                    <AvatarFallback>A+</AvatarFallback>
                                </Avatar>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <Markdown>{response.response}</Markdown>
                                </div>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}

    
