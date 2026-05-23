
"use client";

import { usePortal } from "@/context/portal-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Calendar as CalendarIcon, CircleOff, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function DiscussionsList() {
    const { discussions, loading } = usePortal();

    if (loading) {
        return <div>Loading discussions...</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-gradient flex items-center gap-2">
                        <MessageSquare className="size-5" />
                        Course Discussions
                    </CardTitle>
                    <CardDescription>Participate in your class discussions and don&apos;t miss any deadlines.</CardDescription>
                </CardHeader>
                <CardContent>
                    {discussions.length > 0 ? (
                        <div className="space-y-4">
                            {discussions.map((discussion) => (
                                <div key={discussion.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold">{discussion.title}</h3>
                                        <Badge variant="outline">{discussion.course}</Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                                        <div className="flex items-center">
                                            <UserIcon className="mr-1 size-3" />
                                            {discussion.author || "Anonymous"}
                                        </div>
                                        <div className="flex items-center">
                                            <CalendarIcon className="mr-1 size-3" />
                                            Posted {format(discussion.postedDate, "PP")}
                                        </div>
                                        {discussion.dueDate && (
                                            <div className={cn(
                                                "flex items-center font-medium",
                                                new Date() > discussion.dueDate ? "text-destructive" : "text-primary"
                                            )}>
                                                <CalendarIcon className="mr-1 size-3" />
                                                Due {format(discussion.dueDate, "PP")}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {discussion.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                            <CircleOff className="size-10 mb-4" />
                            <p className="font-semibold">No discussions found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
