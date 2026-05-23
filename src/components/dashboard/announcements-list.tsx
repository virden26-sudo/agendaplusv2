
"use client";

import { usePortal } from "@/context/portal-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar as CalendarIcon, CircleOff } from "lucide-react";
import { format } from "date-fns";

export function AnnouncementsList() {
    const { announcements, loading } = usePortal();

    if (loading) {
        return <div>Loading announcements...</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-gradient flex items-center gap-2">
                        <Megaphone className="size-5" />
                        Latest Announcements
                    </CardTitle>
                    <CardDescription>Stay updated with the latest news from your courses.</CardDescription>
                </CardHeader>
                <CardContent>
                    {announcements.length > 0 ? (
                        <div className="space-y-4">
                            {announcements.map((announcement) => (
                                <div key={announcement.id} className="border-b pb-4 last:border-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold">{announcement.title}</h3>
                                        <div className="flex items-center gap-2">
                                            {announcement.important && (
                                                <Badge variant="destructive">Important</Badge>
                                            )}
                                            <Badge variant="outline">{announcement.course}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground mb-2">
                                        <CalendarIcon className="mr-1 size-3" />
                                        {format(announcement.date, "PPP")}
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {announcement.content}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                            <CircleOff className="size-10 mb-4" />
                            <p className="font-semibold">No announcements found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
