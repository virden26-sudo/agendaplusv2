"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Checkbox} from "../ui/checkbox";
import {ScrollArea} from "../ui/scroll-area";
import {useTasks} from "@/context/tasks-context";
import {Skeleton} from "../ui/skeleton";
import {GradientIcon} from "@/components/ui/gradient-icon";
import Link from "next/link";
import {Plus} from "lucide-react";

export function TasksCard() {
    const {tasks, toggleTask, loading} = useTasks();

    const upcomingTasks = [...tasks]
        .filter(t => !t.completed)
        .slice(0, 5); // Show top 5

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-gradient">
                            <GradientIcon name="CheckSquare" className="h-6 w-6"/>
                            Personal Tasks
                        </CardTitle>
                        <CardDescription>Your general to-do items</CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/tasks">
                            Manage
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-full">
                    <div className="space-y-4 pr-4 h-full">
                        {loading ? (
                            <>
                                <Skeleton className="h-10 w-full"/>
                                <Skeleton className="h-10 w-full"/>
                                <Skeleton className="h-10 w-full"/>
                            </>
                        ) : upcomingTasks.length > 0 ? (
                            upcomingTasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                                    <Checkbox id={`task-${task.id}`} checked={task.completed}
                                              onCheckedChange={() => toggleTask(task.id)}/>
                                    <label htmlFor={`task-${task.id}`}
                                           className="flex-1 font-medium cursor-pointer">{task.title}</label>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                    <GradientIcon name="CheckSquare" className="h-8 w-8 text-muted-foreground"/>
                                </div>
                                <h3 className="font-semibold text-lg mb-1">No Tasks Yet</h3>
                                <p className="text-muted-foreground text-sm mb-4">Add a task to get started.</p>
                                <Button asChild variant="secondary">
                                    <Link href="/tasks">
                                        <Plus className="mr-2 h-4 w-4"/>
                                        Add Task
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
