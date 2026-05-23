"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "../ui/badge";
import {ScrollArea} from "../ui/scroll-area";
import {useAssignments} from "@/context/assignments-context";
import {useQuizzes} from "@/context/quizzes-context";
import {useTasks} from "@/context/tasks-context";
import {Skeleton} from "../ui/skeleton";
import {isToday} from 'date-fns';
import {GradientIcon} from "@/components/ui/gradient-icon";
import Link from "next/link";
import {cn} from "@/lib/utils";

export function TodayScheduleCard() {
    const {assignments, loading: assignmentsLoading} = useAssignments();
    const {quizzes, loading: quizzesLoading} = useQuizzes();
    const {tasks, loading: tasksLoading} = useTasks();

    const loading = assignmentsLoading || quizzesLoading || tasksLoading;

    const todayItems = [
        ...assignments.filter(a => !a.completed && isToday(new Date(a.dueDate))).map(a => ({...a, type: 'Assignment'})),
        ...quizzes.filter(q => isToday(new Date(q.dueDate))).map(q => ({...q, type: 'Quiz'})),
        ...tasks.filter(t => !t.completed && t.title.toLowerCase().includes('discussion')).map(t => ({
            id: t.id,
            title: t.title,
            course: '',
            type: 'Discussion'
        }))
    ].sort((a, b) => a.title.localeCompare(b.title));

    const getItemStyling = (type: string) => {
        switch (type) {
            case 'Assignment':
                return {indicator: 'bg-primary', badge: 'default' as const, icon: 'BookCopy' as const};
            case 'Quiz':
                return {indicator: 'bg-accent', badge: 'secondary' as const, icon: 'FileQuestion' as const};
            case 'Discussion':
                return {indicator: 'bg-yellow-500', badge: 'outline' as const, icon: 'MessageSquare' as const};
            default:
                return {indicator: 'bg-primary', badge: 'default' as const, icon: 'BookCopy' as const};
        }
    };


    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-gradient">
                            <GradientIcon name="CalendarCheck" className="h-6 w-6"/>
                            Today's Schedule
                        </CardTitle>
                        <CardDescription>Everything due today</CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/calendar">
                            View Calendar
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-72">
                    <div className="space-y-4 pr-4">
                        {loading ? (
                            <>
                                <Skeleton className="h-12 w-full"/>
                                <Skeleton className="h-12 w-full"/>
                                <Skeleton className="h-12 w-full"/>
                            </>
                        ) : todayItems.length > 0 ? (
                            todayItems.map((item) => {
                                const {indicator, badge, icon} = getItemStyling(item.type);
                                return (
                                    <div key={`${item.type}-${item.id}`}
                                         className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                                        <div className={cn("w-2 h-10 rounded-full", indicator)}/>
                                        <div className="flex-1 space-y-1">
                                            <p className="font-medium">{item.title}</p>
                                            {item.course &&
                                                <p className="text-sm text-muted-foreground">{item.course}</p>}
                                        </div>
                                        <Badge variant={badge}>
                                            <GradientIcon name={icon} className="h-3 w-3 mr-1.5"/>
                                            {item.type}
                                        </Badge>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                    <GradientIcon name="Sun" className="h-8 w-8 text-muted-foreground"/>
                                </div>
                                <h3 className="font-semibold text-lg mb-1">Nothing Due Today</h3>
                                <p className="text-muted-foreground text-sm">Enjoy your free day!</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
