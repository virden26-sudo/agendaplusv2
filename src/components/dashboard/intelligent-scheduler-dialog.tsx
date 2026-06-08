"use client";

import {useEffect, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {useToast} from "@/hooks/use-toast";
import {Bot, Download, Loader2, Share2, Sparkles, Trash2, BrainCircuit} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "../ui/card";
import {ScrollArea} from "../ui/scroll-area";
import {Separator} from "../ui/separator";
import {useAssignments} from "@/context/assignments-context";
import {suggestStudySchedule} from "@/lib/local-api";
import * as ics from 'ics';
import {addDays, parse, startOfWeek} from "date-fns";

type IntelligentSchedulerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type SuggestedScheduleItem = {
    day: string;
    startTime: string;
    endTime: string;
    assignment: string;
};

type Suggestion = {
    suggestedSchedule: SuggestedScheduleItem[];
    reasoning: string;
};

const dayNameToIndex: { [key: string]: number } = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

export function IntelligentSchedulerDialog({open, onOpenChange}: IntelligentSchedulerDialogProps) {
    const {toast} = useToast();
    const {assignments} = useAssignments();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'scheduler' | 'tutor'>('scheduler');
    const [test, setTest] = useState<any>(null);
    const [strategies, setStrategies] = useState<any>(null);
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

    useEffect(() => {
        if (!open) return;
        const savedSuggestion = localStorage.getItem("studyPlan");
        setSuggestion(savedSuggestion ? JSON.parse(savedSuggestion) : null);
    }, [open]);

    async function generateSchedule() {
        setIsLoading(true);
        setSuggestion(null);
        try {
            const result = suggestStudySchedule(
                JSON.stringify(assignments.filter((a) => !a.completed).map((a) => ({ title: a.title, dueDate: a.dueDate })))
            );
            const parsedSchedule = JSON.parse(result.suggestedSchedule);
            const newSuggestion = {suggestedSchedule: parsedSchedule, reasoning: result.reasoning};
            setSuggestion(newSuggestion);
            localStorage.setItem("studyPlan", JSON.stringify(newSuggestion));
        } catch (error) {
            toast({variant: "destructive", title: "Error", description: "Could not generate schedule."});
        } finally {
            setIsLoading(false);
        }
    }

    async function generateTest(courseName: string) {
        setIsLoading(true);
        try {
            const response = await fetch('/api/tutor', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action: 'generateTest', data: {courseName}})
            });
            const result = await response.json();
            setTest(result);
        } catch (error) {
            toast({variant: 'destructive', title: 'Error', description: 'Could not generate test.'});
        } finally {
            setIsLoading(false);
        }
    }

    async function analyzeTest(testResults: any) {
        setIsLoading(true);
        try {
            const response = await fetch('/api/tutor', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({action: 'analyzeTest', data: {testResults}})
            });
            const result = await response.json();
            setStrategies(result);
        } catch (error) {
            toast({variant: 'destructive', title: 'Error', description: 'Could not analyze test.'});
        } finally {
            setIsLoading(false);
        }
    }

    const handleClearPlan = () => { localStorage.removeItem("studyPlan"); setSuggestion(null); }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        Budd-ie: Intelligent Scheduler & Tutor
                    </DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 border-b p-2">
                    <Button variant={activeTab === 'scheduler' ? 'default' : 'ghost'} onClick={() => setActiveTab('scheduler')}>
                        <Bot className="mr-2 h-4 w-4"/> Scheduler
                    </Button>
                    <Button variant={activeTab === 'tutor' ? 'default' : 'ghost'} onClick={() => setActiveTab('tutor')}>
                        <BrainCircuit className="mr-2 h-4 w-4"/> Tutor
                    </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {activeTab === 'scheduler' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* ... (Existing Scheduler UI - abbreviated here for brevity) */}
                            <Button onClick={generateSchedule} className="w-full">Generate Study Plan</Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-semibold">Budd-ie Tutor</h3>
                            {!test && (
                                <Button onClick={() => generateTest('Sample Course')}>Generate Placement Test</Button>
                            )}
                            {test && !strategies && (
                                <div>
                                    <p className="font-medium">Placement Test for {test.courseName}:</p>
                                    {test.questions.map((q: any, i: number) => (
                                        <div key={i} className="p-3 border rounded mt-2">
                                            <p className="mb-2">{q.questionText}</p>
                                            {q.options.map((opt: string, j: number) => (
                                                <Button key={j} variant="outline" className="block w-full text-left my-1" onClick={() => analyzeTest({
                                                    courseName: test.courseName,
                                                    results: [{questionText: q.questionText, userAnswerIndex: j, correctAnswerIndex: q.correctAnswerIndex, wasCorrect: j === q.correctAnswerIndex, explanation: q.explanation}]
                                                })}>{opt}</Button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {strategies && (
                                <div>
                                    <h4 className="font-semibold text-lg">Personalized Learning Strategies:</h4>
                                    {strategies.strategies.map((s: any, i: number) => (
                                        <div key={i} className="p-3 border rounded mt-2">
                                            <p className="font-semibold text-primary">{s.topic}</p>
                                            <ul className="list-disc pl-5 mt-1">
                                                {s.resources.map((r: string, j: number) => <li key={j}>{r}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                    <Button className="mt-4" onClick={() => {setTest(null); setStrategies(null);}}>Reset</Button>
                                </div>
                            )}
                            {isLoading && <Loader2 className="animate-spin" />}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
