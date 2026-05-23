
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { differenceInDays, formatDistanceToNowStrict } from "date-fns";
import { FileText, ClipboardCheck, Presentation, CircleOff } from "lucide-react";
import { useAssignments } from "@/context/assignments-context";
import { Skeleton } from "../ui/skeleton";
import { getPriorityBadgeVariant, getDueDateInfo } from "@/lib/assignment-utils";

export function UpcomingAssignments() {
  const { assignments, loading } = useAssignments();

  const sortedAssignments = assignments
    .filter((a) => !a.completed)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  console.log("UpcomingAssignments:", {
    total: assignments.length,
    filtered: sortedAssignments.length,
    loading
  });

  const getIcon = (title: string) => {
    const lowerCaseTitle = title.toLowerCase();
    if (lowerCaseTitle.includes("essay") || lowerCaseTitle.includes("report")) return <FileText className="size-4 text-muted-foreground" />;
    if (lowerCaseTitle.includes("prep") || lowerCaseTitle.includes("set") || lowerCaseTitle.includes("quiz")) return <ClipboardCheck className="size-4 text-muted-foreground" />;
    if (lowerCaseTitle.includes("presentation")) return <Presentation className="size-4 text-muted-foreground" />;
    return <FileText className="size-4 text-muted-foreground" />;
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gradient">Upcoming Assignments</CardTitle>
        <CardDescription>
          Here&apos;s what&apos;s on your plate. Stay focused and productive!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 grid gap-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-16 ml-auto" />
                </div>
              </div>
            ))
          ) : sortedAssignments.length > 0 ? (
            sortedAssignments.slice(0, 4).map((assignment) => {
              const dueDateInfo = getDueDateInfo(assignment.dueDate);
              return (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 p-2 rounded-lg transition-colors hover:bg-muted/50"
                >
                  <div className="bg-muted p-3 rounded-lg">{getIcon(assignment.title)}</div>
                  <div className="flex-1 grid gap-1">
                    <p className="font-medium leading-none">{assignment.title}</p>
                    <p className="text-sm text-muted-foreground">{assignment.course}</p>
                  </div>
                  <div className="text-right">
                      <p className={cn("text-sm font-medium", dueDateInfo.className)}>{dueDateInfo.text}</p>
                      <Badge variant={getPriorityBadgeVariant(assignment.priority)} className="capitalize mt-1">{assignment.priority}</Badge>
                  </div>
                </div>
              );
            })
          ) : (
             <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <CircleOff className="size-10 mb-4" />
                <p className="font-semibold">No upcoming assignments!</p>
                <p className="text-sm">Add an assignment or import a syllabus to get started.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
