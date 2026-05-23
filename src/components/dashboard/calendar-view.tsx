"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, isSameDay, addDays, startOfWeek, isToday } from 'date-fns';
import { useState, useMemo } from "react";
import { useAssignments } from "@/context/assignments-context";
import type { Assignment } from "@/lib/types";

type AssignmentsByDay = {
    day: Date;
    assignments: Assignment[];
};

export function CalendarView() {
    const { assignments, loading } = useAssignments();
    const [weekDays] = useState<Date[]>(() => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
    });

    const assignmentsByDay = useMemo(() => {
        return weekDays.map(day => ({
            day,
            assignments: assignments.filter(a => isSameDay(a.dueDate, day) && !a.completed)
        }));
    }, [assignments, weekDays]);


    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-gradient">This Week&apos;s Deadlines</CardTitle>
                <CardDescription>
                    A look at your due dates for the upcoming week.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {weekDays.length > 0 && !loading ? assignmentsByDay.map(({ day, assignments }) => (
                        <div key={day.toString()} className={cn("rounded-lg p-2 min-h-32", isToday(day) ? "bg-primary/10 border-2 border-primary/50" : "bg-muted/50")}>
                            <div className="text-center">
                                <p className={cn("font-semibold text-sm", isToday(day) ? "text-primary" : "text-muted-foreground")}>{format(day, 'EEE')}</p>
                                <p className={cn("font-bold text-2xl", isToday(day) ? "text-primary" : "")}>{format(day, 'd')}</p>
                            </div>
                            <div className="mt-2 space-y-1">
                                {assignments.map(assignment => (
                                    <div key={assignment.id} className="text-xs p-1.5 rounded-md bg-background border border-primary/20 shadow-sm">
                                        <p className="font-semibold text-primary/80 truncate">{assignment.title}</p>
                                        <p className="text-muted-foreground truncate">{assignment.course}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        Array.from({length: 7}).map((_, i) => (
                             <div key={i} className="rounded-lg p-2 min-h-32 bg-muted/50 animate-pulse" />
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
