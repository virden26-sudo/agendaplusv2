
"use client";

import { useAssignments } from "@/context/assignments-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CircleOff } from "lucide-react";
import type { Assignment } from "@/lib/types";
import { getPriorityBadgeVariant, getDueDateInfo } from "@/lib/assignment-utils";


interface AssignmentItemProps {
    assignment: Assignment;
    toggleAssignment: (id: string) => void;
}

const AssignmentItem = ({ assignment, toggleAssignment }: AssignmentItemProps) => {
    const dueDateInfo = getDueDateInfo(assignment.dueDate);
    return (
         <AccordionItem value={assignment.id}>
            <div className="flex items-center gap-4 py-4">
                <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        id={`checkbox-${assignment.id}`}
                        checked={assignment.completed}
                        onCheckedChange={() => toggleAssignment(assignment.id)}
                        aria-label="Toggle assignment completion"
                    />
                </div>
                <AccordionTrigger className="w-full p-0">
                    <div className="flex-1 text-left">
                        <div className={cn("font-medium", assignment.completed && "line-through text-muted-foreground")}>{assignment.title}</div>
                        <div className={cn("text-sm text-muted-foreground", assignment.completed && "line-through")}>{assignment.course}</div>
                    </div>
                    <div className="text-right mx-4">
                         <p className={cn("text-sm font-medium", dueDateInfo.className)}>{dueDateInfo.text}</p>
                    </div>
                    <Badge variant={getPriorityBadgeVariant(assignment.priority)} className="capitalize">{assignment.priority}</Badge>
                </AccordionTrigger>
            </div>
            <AccordionContent>
               <div className="prose prose-sm dark:prose-invert text-muted-foreground pl-10 pb-4">
                    {assignment.details ? (
                        <p>{assignment.details}</p>
                    ) : (
                        <p>No additional details provided for this assignment.</p>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    )
};

const AssignmentsAccordion = ({ assignments, toggleAssignment }: { assignments: Assignment[], toggleAssignment: (id: string) => void }) => (
   <Accordion type="multiple" className="w-full">
        {assignments.map(assignment => (
            <AssignmentItem 
                key={assignment.id} 
                assignment={assignment} 
                toggleAssignment={toggleAssignment}
            />
        ))}
    </Accordion>
);

const NoAssignments = ({title}: {title: string}) => (
    <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
        <CircleOff className="size-10 mb-4" />
        <p className="font-semibold">{title}</p>
    </div>
);

export function AssignmentsList() {
    const { assignments, toggleAssignment, loading } = useAssignments();

    const upcomingAssignments = assignments.filter(a => !a.completed).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const completedAssignments = assignments.filter(a => a.completed).sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());

    if (loading) {
        return <div>Loading assignments...</div>
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-gradient">Upcoming Assignments</CardTitle>
                    <CardDescription>Everything you need to get done. You can do it!</CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingAssignments.length > 0 ? (
                        <AssignmentsAccordion 
                            assignments={upcomingAssignments} 
                            toggleAssignment={toggleAssignment}
                        />
                    ) : (
                        <NoAssignments title="No upcoming assignments!" />
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-gradient">Completed</CardTitle>
                    <CardDescription>Look at all you&apos;ve accomplished. Great work!</CardDescription>
                </CardHeader>
                <CardContent>
                    {completedAssignments.length > 0 ? (
                        <AssignmentsAccordion 
                            assignments={completedAssignments} 
                            toggleAssignment={toggleAssignment}
                        />
                    ) : (
                        <NoAssignments title="No completed assignments yet." />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
