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
import {Bot, Download, Loader2, Share2, Sparkles, Trash2} from "lucide-react";
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
    const [suggestion, setSuggestion] = useState<Suggestion | null>(() => {
        if (typeof window === "undefined") {
            return null;
        }

        try {
            const savedSuggestion = localStorage.getItem("studyPlan");
            return savedSuggestion ? (JSON.parse(savedSuggestion) as Suggestion) : null;
        } catch (error) {
            console.error("Failed to parse saved study plan", error);
            return null;
        }
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const savedSuggestion = localStorage.getItem("studyPlan");
        setSuggestion(savedSuggestion ? (JSON.parse(savedSuggestion) as Suggestion) : null);
    }, [open]);

    async function generateSchedule() {
        setIsLoading(true);
        setSuggestion(null);
        try {
            const result = suggestStudySchedule(
                JSON.stringify(
                    assignments
                        .filter((a) => !a.completed)
                        .map((a) => ({ title: a.title, dueDate: a.dueDate }))
                )
            );
            const parsedSchedule = JSON.parse(result.suggestedSchedule);
            const newSuggestion = {suggestedSchedule: parsedSchedule, reasoning: result.reasoning};
            setSuggestion(newSuggestion);
            localStorage.setItem("studyPlan", JSON.stringify(newSuggestion));
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not generate schedule. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    const handleClearPlan = () => {
        localStorage.removeItem("studyPlan");
        setSuggestion(null);
        toast({
            title: "Study Plan Cleared",
            description: "Your saved study plan has been removed.",
        });
    }

    const formatPlanAsText = (plan: Suggestion): string => {
        let text = "Here's my study plan:\n\n";
        plan.suggestedSchedule.forEach(item => {
            text += `- ${item.assignment}: ${item.day} from ${item.startTime} to ${item.endTime}\n`;
        });
        text += `\nReasoning: ${plan.reasoning}`;
        return text;
    };

    const handleSharePlan = async () => {
        if (!suggestion) return;

        const shareText = formatPlanAsText(suggestion);
        const shareData = {
            title: 'My Study Plan',
            text: shareText,
        };

        if (navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                toast({title: 'Plan Shared!', description: 'Your study plan has been sent.'});
            } catch (error) {
                console.error('Error sharing:', error);
                toast({variant: 'destructive', title: 'Could not share plan.'});
            }
        } else {
            // Fallback to copying to clipboard
            try {
                await navigator.clipboard.writeText(shareText);
                toast({title: 'Copied to Clipboard', description: 'Study plan copied. You can now paste it to share.'});
            } catch (error) {
                console.error('Error copying:', error);
                toast({variant: 'destructive', title: 'Could not copy plan.'});
            }
        }
    };

    const handleSaveToCalendar = () => {
        if (!suggestion) return;

        const events: ics.EventAttributes[] = [];
        const weekStart = startOfWeek(new Date());

        suggestion.suggestedSchedule.forEach(item => {
            const dayIndex = dayNameToIndex[item.day];
            if (dayIndex === undefined) return;

            const eventDate = addDays(weekStart, dayIndex);

            const startTime = parse(item.startTime, 'h:mm a', new Date());
            const endTime = parse(item.endTime, 'h:mm a', new Date());

            const startDateTime = new Date(eventDate);
            startDateTime.setHours(startTime.getHours(), startTime.getMinutes());

            const endDateTime = new Date(eventDate);
            endDateTime.setHours(endTime.getHours(), endTime.getMinutes());

            events.push({
                title: `Study: ${item.assignment}`,
                start: [startDateTime.getFullYear(), startDateTime.getMonth() + 1, startDateTime.getDate(), startDateTime.getHours(), startDateTime.getMinutes()],
                end: [endDateTime.getFullYear(), endDateTime.getMonth() + 1, endDateTime.getDate(), endDateTime.getHours(), endDateTime.getMinutes()],
                description: `Dedicated study time for ${item.assignment}.`,
                alarms: [{action: 'display', description: 'Reminder', trigger: {minutes: 15, before: true}}]
            });
        });

        const {error, value} = ics.createEvents(events);

        if (error) {
            console.error(error);
            toast({variant: 'destructive', title: 'Error creating calendar file.'});
            return;
        }

        if (value) {
            const blob = new Blob([value], {type: 'text/calendar;charset=utf-8'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'study-plan.ics');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast({
                title: 'Calendar file created!',
                description: 'Your study plan has been downloaded as an .ics file.'
            });
        }
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        Intelligent Study Scheduler
                    </DialogTitle>
                    <DialogDescription>
                        Let AI analyze your assignments to create an optimal study plan for you.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Your Inputs</CardTitle>
                            <CardDescription>AI will consider your upcoming assignments.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 space-y-4">
                            <div className="flex-1">
                                <h3 className="font-semibold mb-2 text-sm">Upcoming Assignments</h3>
                                <ScrollArea className="h-80 rounded-md border p-2 text-sm">
                                    {assignments.filter(a => !a.completed).map(a => <p key={a.id}
                                                                                       className="truncate">{a.title}</p>)}
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-4">
                        <Button onClick={generateSchedule} disabled={isLoading} className="w-full">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            ) : (
                                <Bot className="mr-2 h-4 w-4"/>
                            )}
                            {suggestion ? "Generate New Plan" : "Generate Study Plan"}
                        </Button>

                        {isLoading && (
                            <div
                                className="flex-1 flex flex-col items-center justify-center bg-muted/50 rounded-lg border border-dashed">
                                <Loader2 className="size-8 animate-spin text-muted-foreground mb-2"/>
                                <p className="text-muted-foreground">AI is creating your study plan...</p>
                            </div>
                        )}

                        {!isLoading && !suggestion && (
                            <div
                                className="flex-1 flex flex-col items-center justify-center bg-muted/50 rounded-lg border border-dashed">
                                <p className="text-muted-foreground text-center p-4">Your suggested study plan will
                                    appear here.</p>
                            </div>
                        )}

                        {suggestion && !isLoading && (
                            <Card className="flex-1 flex flex-col">
                                <CardHeader>
                                    <CardTitle>Suggested Plan</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 min-h-0">
                                    <ScrollArea className="h-[350px]">
                                        <h4 className="font-semibold mb-2">Schedule Blocks:</h4>
                                        <div className="space-y-2 mb-4">
                                            {suggestion.suggestedSchedule.map((item, index) => (
                                                <div key={index}
                                                     className="p-2 border rounded-md bg-background text-sm">
                                                    <p className="font-semibold text-primary">{item.assignment}</p>
                                                    <p className="text-muted-foreground">{item.day}, {item.startTime} - {item.endTime}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <Separator className="my-4"/>
                                        <h4 className="font-semibold mb-2">Reasoning from AI:</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{suggestion.reasoning}</p>
                                    </ScrollArea>
                                </CardContent>
                                <DialogFooter className="p-4 border-t flex-col sm:flex-row gap-2">
                                    <Button variant="outline" onClick={handleClearPlan} className="w-full sm:w-auto">
                                        <Trash2 className="mr-2"/> Clear Plan
                                    </Button>
                                    <div className="flex w-full sm:w-auto gap-2">
                                        <Button onClick={handleSharePlan} variant="outline" className="w-full">
                                            <Share2 className="mr-2"/> Share
                                        </Button>
                                        <Button onClick={handleSaveToCalendar} className="w-full">
                                            <Download className="mr-2"/> Save to Calendar
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </Card>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
