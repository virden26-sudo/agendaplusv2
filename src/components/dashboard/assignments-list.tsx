"use client";

import { useMemo, useState } from "react";
import { useAssignments } from "@/context/assignments-context";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CircleOff, Pencil } from "lucide-react";
import type { Assignment } from "@/lib/types";
import { getPriorityBadgeVariant, getDueDateInfo } from "@/lib/assignment-utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditAssignmentDialogProps {
    assignment: Assignment;
    onUpdate: (id: string, updatedFields: Partial<Omit<Assignment, 'id'>>) => void;
}

export function EditAssignmentDialog({ assignment, onUpdate }: EditAssignmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState(assignment.title);
    const [course, setCourse] = useState(assignment.course);
    const [dueDate, setDueDate] = useState(
        assignment.dueDate instanceof Date && !isNaN(assignment.dueDate.getTime())
            ? assignment.dueDate.toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]
    );
    const [priority, setPriority] = useState<Assignment['priority']>(assignment.priority);
    const [details, setDetails] = useState(assignment.details || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate(assignment.id, {
            title: title.trim(),
            course: course.trim(),
            dueDate: new Date(dueDate),
            priority,
            details: details.trim() || undefined,
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 mt-2">
                    <Pencil className="size-3.5" />
                    Edit Assignment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Edit Assignment</DialogTitle>
                        <DialogDescription>
                            Make adjustments to your assignment details here.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="title">Assignment Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="course">Course</Label>
                            <Input
                                id="course"
                                value={course}
                                onChange={(e) => setCourse(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={priority}
                                    onValueChange={(val: Assignment['priority']) => setPriority(val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="details">Details / Notes</Label>
                            <Textarea
                                id="details"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Add notes or requirements..."
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface AssignmentItemProps {
    assignment: Assignment;
    toggleAssignment: (id: string) => void;
    updateAssignment: (id: string, updatedFields: Partial<Omit<Assignment, 'id'>>) => void;
}

const AssignmentItem = ({ assignment, toggleAssignment, updateAssignment }: AssignmentItemProps) => {
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
                    <div className="text-right mx-4 shrink-0">
                         <p className={cn("text-sm font-medium", dueDateInfo.className)}>{dueDateInfo.text}</p>
                         <p className="text-xs text-muted-foreground">
                            {assignment.dueDate instanceof Date && !isNaN(assignment.dueDate.getTime())
                                ? format(assignment.dueDate, "MMM d, yyyy")
                                : "No due date"}
                         </p>
                    </div>
                    <Badge variant={getPriorityBadgeVariant(assignment.priority)} className="capitalize">{assignment.priority}</Badge>
                </AccordionTrigger>
            </div>
            <AccordionContent>
               <div className="prose prose-sm dark:prose-invert text-muted-foreground pl-10 pb-4 flex flex-col items-start gap-2">
                    {assignment.details ? (
                        <p className="whitespace-pre-wrap">{assignment.details}</p>
                    ) : (
                        <p className="italic">No additional details provided for this assignment.</p>
                    )}
                    <EditAssignmentDialog assignment={assignment} onUpdate={updateAssignment} />
                </div>
            </AccordionContent>
         </AccordionItem>
    );
};

const AssignmentsAccordion = ({ 
    assignments, 
    toggleAssignment, 
    updateAssignment 
}: { 
    assignments: Assignment[]; 
    toggleAssignment: (id: string) => void;
    updateAssignment: (id: string, updatedFields: Partial<Omit<Assignment, 'id'>>) => void;
}) => (
   <Accordion type="multiple" className="w-full">
        {assignments.map(assignment => (
            <AssignmentItem 
                key={assignment.id} 
                assignment={assignment} 
                toggleAssignment={toggleAssignment}
                updateAssignment={updateAssignment}
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

function groupByCourse(items: Assignment[]) {
    const groups = new Map<string, Assignment[]>();
    for (const item of items) {
        const course = item.course?.trim() || "Other";
        const bucket = groups.get(course) ?? [];
        bucket.push(item);
        groups.set(course, bucket);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function AssignmentsList() {
    const { assignments, toggleAssignment, updateAssignment, loading } = useAssignments();

    const upcomingAssignments = assignments.filter(a => !a.completed).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const completedAssignments = assignments.filter(a => a.completed).sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
    const upcomingByCourse = useMemo(() => groupByCourse(upcomingAssignments), [upcomingAssignments]);
    const completedByCourse = useMemo(() => groupByCourse(completedAssignments), [completedAssignments]);

    if (loading) {
        return <div>Loading assignments...</div>;
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
                        <div className="space-y-8">
                            {upcomingByCourse.map(([course, courseAssignments]) => (
                                <div key={course} className="space-y-2">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">{course}</h3>
                                    <AssignmentsAccordion
                                        assignments={courseAssignments}
                                        toggleAssignment={toggleAssignment}
                                        updateAssignment={updateAssignment}
                                    />
                                </div>
                            ))}
                        </div>
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
                        <div className="space-y-8">
                            {completedByCourse.map(([course, courseAssignments]) => (
                                <div key={course} className="space-y-2">
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{course}</h3>
                                    <AssignmentsAccordion
                                        assignments={courseAssignments}
                                        toggleAssignment={toggleAssignment}
                                        updateAssignment={updateAssignment}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <NoAssignments title="No completed assignments yet." />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
