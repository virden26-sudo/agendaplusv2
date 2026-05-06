"use client";

import {useState} from "react";
import {BrainCircuit, Calendar, Check, Database, ExternalLink, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {useToast} from "@/hooks/use-toast";
import {useAssignments} from "@/context/assignments-context";
import {ScrollArea} from "@/components/ui/scroll-area";
import {usePortal} from "@/context/portal-context";
import {useUser} from "@/context/user-context";

export default function PortalPage() {
    const {toast} = useToast();
    const {assignments} = useAssignments();
    const {announcements, discussions} = usePortal();
    const {user, portalUrl} = useUser();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleRescan = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch('/api/parse-portal', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    url: portalUrl,
                    username: user?.portalUsername,
                    password: user?.portalPassword,
                    currentDate: new Date().toLocaleDateString('en-CA')
                }),
            });

            if (!response.ok) throw new Error("GenesisAi failed to process portal data.");

            toast({
                title: "GenesisAi: Browser Session Complete",
                description: "A monitored browser window was used to refresh your portal data.",
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "GenesisAi Error",
                description: "Could not complete the monitored browser sync.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold font-headline text-purple-600 flex items-center gap-2">
                    <BrainCircuit className="size-8"/>
                    GenesisAi Portal Monitor
                </h1>
                <p className="text-muted-foreground">
                    GenesisAi opens a monitored browser session, waits for your portal login to finish, and refreshes
                    the dashboard with freshly extracted data.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                    <Card className="border-purple-200 shadow-xl overflow-hidden">
                        <CardHeader className="bg-purple-50 border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-xl text-purple-800">Monitored Browser Sync</CardTitle>
                                    <CardDescription>Launch a portal session and let GenesisAi wait silently until you
                                        finish logging in.</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.open(portalUrl, "_blank")}>
                                    <ExternalLink className="mr-2 size-3"/>
                                    Open Portal
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <Button
                                className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 shadow-lg"
                                onClick={handleRescan}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 animate-spin"/>
                                        Monitoring Browser Session...
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuit className="mr-2"/>
                                        Launch Monitored Sync
                                    </>
                                )}
                            </Button>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-xl border bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center gap-2 text-purple-700">
                                        <Calendar className="size-4"/>
                                        <span className="text-sm font-semibold">Assignments</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800">{assignments.length}</div>
                                    <p className="text-xs text-muted-foreground">Current tasks available after the
                                        latest sync.</p>
                                </div>
                                <div className="rounded-xl border bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center gap-2 text-purple-700">
                                        <Check className="size-4"/>
                                        <span className="text-sm font-semibold">Announcements</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800">{announcements.length}</div>
                                    <p className="text-xs text-muted-foreground">Announcements recovered from the
                                        monitored session.</p>
                                </div>
                                <div className="rounded-xl border bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center gap-2 text-purple-700">
                                        <Database className="size-4"/>
                                        <span className="text-sm font-semibold">Discussions</span>
                                    </div>
                                    <div className="text-3xl font-bold text-slate-800">{discussions.length}</div>
                                    <p className="text-xs text-muted-foreground">Detected course discussions in your
                                        live portal data.</p>
                                </div>
                            </div>

                            <ScrollArea className="h-[320px] rounded-xl border bg-white p-4">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-purple-700 flex items-center gap-2">
                                        <Calendar className="size-5"/>
                                        Latest Assignments
                                    </h3>
                                    {assignments.length === 0 ? (
                                        <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center">
                                            <p className="text-muted-foreground">No assignments have been synced yet.
                                                Run a monitored browser session to populate the dashboard.</p>
                                        </div>
                                    ) : (
                                        assignments.slice(0, 20).map((assignment) => (
                                            <div key={assignment.id}
                                                 className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-slate-800">{assignment.task}</span>
                                                    <div className="flex items-center gap-2">
                                                        {assignment.course && (
                                                            <Badge variant="outline"
                                                                   className="text-[10px]">{assignment.course}</Badge>
                                                        )}
                                                        {assignment.dueDate && (
                                                            <span
                                                                className="text-xs text-muted-foreground">Due: {assignment.dueDate instanceof Date ? assignment.dueDate.toLocaleDateString() : new Date(assignment.dueDate).toLocaleDateString()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge
                                                    className="border-none bg-purple-100 text-purple-700 hover:bg-purple-100">Synced</Badge>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                    <Card className="border-purple-100 bg-purple-50/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-800">
                                <Database className="size-4"/>
                                Genesis Protocol
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                GenesisAi-Standalone operates entirely offline. Your data never leaves this device.
                            </p>
                            <div className="space-y-2">
                                <div
                                    className="flex items-center gap-2 text-[10px] text-purple-700 font-bold uppercase">
                                    <Check className="size-3"/>
                                    Local LLM Inference
                                </div>
                                <div
                                    className="flex items-center gap-2 text-[10px] text-purple-700 font-bold uppercase">
                                    <Check className="size-3"/>
                                    Zero Latency Parsing
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div
                        className="p-6 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl text-white shadow-lg flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="size-6"/>
                            <span className="font-bold">GenesisAi Core</span>
                        </div>
                        <p className="text-xs opacity-90 leading-relaxed font-medium">
                            This module uses the GenesisAi-Standalone model to scan for tasks across your entire course
                            cycle.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
