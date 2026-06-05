"use client";

import * as React from "react";
import {
    ArrowLeft,
    Book,
    Bot,
    BrainCircuit,
    Calendar,
    FileUp,
    Globe,
    Loader2,
    Megaphone,
    Plus,
    Settings,
    Share2,
    Sparkles,
    Star,
    Trash2,
    User as UserIcon,
    Video,
} from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle as UIDialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/icons";
import { Progress } from "@/components/ui/progress";

import { PortalSyncDialog, type PortalSyncDialogResult } from "@/components/portal/portal-sync-dialog";
import {
    SheetHeader,
    SheetTitle,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAssignments } from "@/context/assignments-context";
import { useGrades } from "@/context/grades-context";
import { usePortal } from "@/context/portal-context";
import { useQuizzes } from "@/context/quizzes-context";
import { useUser } from "@/context/user-context";
import { apiFetch, getApiUrl } from "@/lib/api-config";
import { readLocalStorage } from "@/lib/storage";
import { sanitizeCourseName } from "@/lib/assignment-quality";
import type { ParsedAssignment } from "@/ai/schemas/assignment";

const AddAssignmentDialog = dynamic(() => import("../dashboard/add-assignment-dialog").then(mod => mod.AddAssignmentDialog), { ssr: false });
const ImportSyllabusDialog = dynamic(() => import("../dashboard/import-syllabus-dialog").then(mod => mod.ImportSyllabusDialog), { ssr: false });
const IntelligentSchedulerDialog = dynamic(() => import("../dashboard/intelligent-scheduler-dialog").then(mod => mod.IntelligentSchedulerDialog), { ssr: false });
const OnboardingDialog = dynamic(() => import("../dashboard/onboarding-dialog").then(mod => mod.OnboardingDialog), { ssr: false });

const isRemoteBrowserClient = () => {
    if (typeof window === "undefined") {
        return false;
    }

    const { hostname, protocol } = window.location;
    return protocol.startsWith("http") && hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "[::1]";
};

type PortalSyncResult = PortalSyncDialogResult;

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { toast } = useToast();
    const { assignments, addMultipleAssignments, loading: assignmentsLoading } = useAssignments();
    const { courses, setCourses } = useGrades();
    const { announcements, discussions, addAnnouncements, addDiscussions, loading: portalLoading, isSyncing, setIsSyncing } = usePortal();
    const { quizzes, loadData: loadQuizzes } = useQuizzes();
    const { user, setUser, portalUrl, setPortalUrl, isUserLoaded } = useUser();

    const [addAssignmentOpen, setAddAssignmentOpen] = React.useState(false);
    const [schedulerOpen, setSchedulerOpen] = React.useState(false);
    const [importSyllabusOpen, setImportSyllabusOpen] = React.useState(false);
    const [onboardingOpen, setOnboardingOpen] = React.useState(false);
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
    const [portalUrlInput, setPortalUrlInput] = React.useState("");
    const [portalUsernameInput, setPortalUsernameInput] = React.useState("");
    const [portalPasswordInput, setPortalPasswordInput] = React.useState("");
    const [portalSyncOpen, setPortalSyncOpen] = React.useState(false);
    const [hasAttemptedStartupSync, setHasAttemptedStartupSync] = React.useState(false);
    const [hasPersistentPortalSession, setHasPersistentPortalSession] = React.useState(() => {
        return readLocalStorage("portalSessionReady") === "true";
    });

    const [syncProgress, setSyncProgress] = React.useState(0);
    const [syncStatus, setSyncStatus] = React.useState("Initializing secure browser...");
    const [syncError, setSyncError] = React.useState<string | null>(null);
    const [localSyncOverlay, setLocalSyncOverlay] = React.useState(false);

    const isRemote = React.useMemo(() => isRemoteBrowserClient(), []);

    React.useEffect(() => {
        if (isSyncing && !isRemote) {
            setTimeout(() => {
                if (mountedRef.current) {
                    setLocalSyncOverlay(true);
                }
            }, 0);
        } else if (!isSyncing) {
            if (localSyncOverlay) {
                setTimeout(() => {
                    if (mountedRef.current) {
                        if (syncError) {
                            setSyncProgress(100);
                            setSyncStatus("Sync failed.");
                        } else {
                            setSyncProgress(100);
                            setSyncStatus("Synchronization complete!");
                        }
                    }
                }, 0);
                const timeout = setTimeout(() => {
                    if (mountedRef.current) {
                        setLocalSyncOverlay(false);
                    }
                }, 800);
                return () => clearTimeout(timeout);
            }
        }
    }, [isSyncing, isRemote, localSyncOverlay, syncError]);

    React.useEffect(() => {
        if (!isSyncing) {
            setTimeout(() => {
                if (mountedRef.current) {
                    setSyncProgress(0);
                    setSyncStatus("Initializing secure browser...");
                }
            }, 0);
            return;
        }

        const startTime = Date.now();
        setTimeout(() => {
            if (mountedRef.current) {
                setSyncProgress(2);
                setSyncStatus("Launching secure browser session...");
            }
        }, 0);

        const interval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;

            let progress = 0;
            let status = "Launching secure browser session...";

            if (elapsed < 3) {
                progress = 2 + (elapsed / 3) * 13;
                status = "Launching secure browser session...";
            } else if (elapsed < 12) {
                progress = 15 + ((elapsed - 3) / 9) * 30;
                status = "Monitoring portal login state... (Please log in if prompted)";
            } else if (elapsed < 22) {
                progress = 45 + ((elapsed - 12) / 10) * 30;
                status = "Extracting assignments, quizzes, and grades...";
            } else if (elapsed < 32) {
                progress = 75 + ((elapsed - 22) / 10) * 15;
                status = "GenesisAI is resolving due dates and processing data...";
            } else {
                const overTime = elapsed - 32;
                progress = 90 + (1 - Math.exp(-overTime / 15)) * 8;
                status = "Finalizing data synchronization...";
            }

            setSyncProgress(Math.min(Math.round(progress), 98));
            setSyncStatus(status);
        }, 200);

        return () => {
            clearInterval(interval);
        };
    }, [isSyncing]);

    const mountedRef = React.useRef(false);
    const syncingRef = React.useRef(false);
    const startupSyncEnqueuedRef = React.useRef(false);
    React.useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const processSyncResult = React.useCallback((result: PortalSyncResult) => {
        console.log("AppShell: processSyncResult counts", {
            assignments: result.assignments?.length ?? 0,
            announcements: result.announcements?.length ?? 0,
            discussions: result.discussions?.length ?? 0,
            quizzes: result.quizzes?.length ?? 0,
            grades: result.grades?.length ?? 0
        });

        const assignmentCount = result.assignments?.length ?? 0;
        const quizCount = result.quizzes?.length ?? 0;
        const discussionCount = result.discussions?.length ?? 0;
        const announcementCount = result.announcements?.length ?? 0;
        const gradeCount = result.grades?.length ?? 0;

        const importedCount =
            assignmentCount +
            quizCount +
            discussionCount +
            announcementCount +
            gradeCount;

        const applyImport = () => {
            if (!mountedRef.current) return;

            if (assignmentCount > 0) {
                console.log(`AppShell: Importing ${assignmentCount} assignments...`);
                // Replace only the assignments for the course(s) being imported, keeping others
                const importedCourses = new Set(
                    (result.assignments || []).map((a) => sanitizeCourseName(a.course || "Course").toLowerCase())
                );
                const otherCoursesAssignments = assignments.filter(
                    (a) => !importedCourses.has(sanitizeCourseName(a.course).toLowerCase())
                );
                const parsedOther: ParsedAssignment[] = otherCoursesAssignments.map((a) => ({
                    task: a.title,
                    dueDate: a.dueDate.toISOString().split("T")[0],
                    course: a.course,
                    details: a.details,
                }));
                const combined = [...parsedOther, ...(result.assignments || [])];
                addMultipleAssignments(combined, { replace: true });
            }

            if (quizCount > 0) {
                console.log(`AppShell: Importing ${quizCount} quizzes...`);
                // Replace only the quizzes for the course(s) being imported, keeping others
                const importedCourses = new Set(
                    (result.quizzes || []).map((q) => sanitizeCourseName(q.course || "Course").toLowerCase())
                );
                const otherQuizzes = quizzes.filter(
                    (q) => !importedCourses.has(sanitizeCourseName(q.course).toLowerCase())
                );
                const newQuizzesMapped = (result.quizzes || []).map((quiz) => {
                    const dueIso =
                        quiz.dueDate ||
                        new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
                    return {
                        id: uuidv4(),
                        title: quiz.task,
                        course: quiz.course || "Course",
                        dueDate: new Date(dueIso),
                    };
                });
                loadQuizzes([...otherQuizzes, ...newQuizzesMapped]);
            }

            if (announcementCount > 0) {
                addAnnouncements(
                    (result.announcements || []).map((announcement) => ({
                        id: uuidv4(),
                        ...announcement,
                        course: announcement.course || "General",
                        content: announcement.content || "",
                        important: Boolean((announcement as any).important),
                        date: announcement.date ? new Date(announcement.date) : new Date(),
                    }))
                );
            }

            if (discussionCount > 0) {
                addDiscussions(
                    (result.discussions || []).map((discussion) => ({
                        id: uuidv4(),
                        ...discussion,
                        course: discussion.course || "General",
                        content: discussion.content || undefined,
                        author: (discussion as any).author || undefined,
                        postedDate: new Date(discussion.postedDate),
                        dueDate: discussion.dueDate ? new Date(discussion.dueDate) : undefined,
                    }))
                );
            }

            if (gradeCount > 0) {
                console.log(`AppShell: Adding ${gradeCount} grades...`);
                const newCourses = result.grades!.map((g) => {
                    const gradeStr = g.grade || "0";
                    const gradeNum = parseFloat(gradeStr.replace(/[^0-9.]/g, ""));
                    return {
                        id: uuidv4(),
                        name: g.course || "Extracted Course",
                        grade: isNaN(gradeNum) ? 0 : gradeNum,
                    };
                });
                // Merge with existing grades to prevent wiping out other courses
                const merged = [...courses];
                for (const newC of newCourses) {
                    const idx = merged.findIndex(
                        (c) => c.name.toLowerCase() === newC.name.toLowerCase()
                    );
                    if (idx >= 0) {
                        merged[idx] = { ...merged[idx], grade: newC.grade };
                    } else {
                        merged.push(newC);
                    }
                }
                setCourses(merged);
            }

            localStorage.setItem("lastAutoSync", Date.now().toString());

            if (importedCount > 0) {
                localStorage.setItem("portalSessionReady", "true");
                setHasPersistentPortalSession(true);
            } else {
                console.warn("AppShell: Portal sync returned no items; session flag not set.");
            }
        };

        React.startTransition(applyImport);

        return importedCount;
    }, [addMultipleAssignments, loadQuizzes, addAnnouncements, addDiscussions, setCourses, assignments, quizzes, courses]);

    const processSyncResultWithBreakdown = React.useCallback((result: PortalSyncResult) => {
        const total = processSyncResult(result);
        return {
            total,
            assignments: result.assignments?.length ?? 0,
            quizzes: result.quizzes?.length ?? 0,
            discussions: result.discussions?.length ?? 0,
            announcements: result.announcements?.length ?? 0,
        };
    }, [processSyncResult]);

    const runPortalSync = React.useCallback(async (mode: "startup" | "manual" | "background") => {
        setSyncError(null);
        if (!mountedRef.current) return;
        if (syncingRef.current) {
            console.log(`AppShell: runPortalSync bypassed, sync is already in progress.`);
            return;
        }
        console.log(`AppShell: runPortalSync started (mode: ${mode})`);
        syncingRef.current = true;
        setIsSyncing(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort("The portal sync operation timed out after 5 minutes and 10 seconds.");
        }, 990000); // 310s timeout to give server's 300s timeout priority

        try {
            console.log("AppShell: Fetching /api/parse-portal (mode: " + mode + ")");
            const response = await apiFetch("/api/parse-portal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: (portalUrl || "").trim(),
                    portalUrl: (portalUrl || "").trim(),
                    username: user?.portalUsername,
                    password: user?.portalPassword,
                    mode,
                    sessionReady: hasPersistentPortalSession,
                }),
                signal: controller.signal,
            });

            const responseText = await response.text();
            let result: PortalSyncResult;
            try {
                result = JSON.parse(responseText);

                // If the backend says we're offline, handle it silently
                if (result && (result as any).offline) {
                    console.log("AppShell: Standalone mode active, skipping automated sync.");
                    return;
                }
            } catch (parseError) {
                console.error("AppShell: Portal sync parse error", parseError, responseText.slice(0, 100));
                throw new Error("Agenda+ reached a local service, but it did not return portal data.");
            }

            if (!response.ok) {
                throw new Error((result as any).error || `Portal sync failed (${response.status})`);
            }

            console.log("AppShell: Received result from /api/parse-portal", {
                assignments: result.assignments?.length ?? 0,
                announcements: result.announcements?.length ?? 0,
                discussions: result.discussions?.length ?? 0,
                quizzes: result.quizzes?.length ?? 0,
                grades: result.grades?.length ?? 0
            });
            const imported = processSyncResultWithBreakdown(result);

            // Only throw error if we actually reached the server and it returned nothing
            if (imported.total === 0 && !(result as any).offline) {
                throw new Error(
                    "GenesisAI scanned your portal but could not import assignments. Open Assignments in D2L, then Rescan."
                );
            }

            if (mode !== "background" && mountedRef.current) {
                const parts = [
                    imported.assignments ? `${imported.assignments} assignment${imported.assignments === 1 ? "" : "s"}` : null,
                    imported.quizzes
                        ? `${imported.quizzes} ${imported.quizzes === 1 ? "quiz" : "quizzes"}`
                        : null,
                    imported.discussions ? `${imported.discussions} discussion${imported.discussions === 1 ? "" : "s"}` : null,
                    imported.announcements ? `${imported.announcements} announcement${imported.announcements === 1 ? "" : "s"}` : null,
                ].filter(Boolean);
                toast({
                    title: "GenesisAI: Data Synchronized",
                    description: parts.length ? `Imported ${parts.join(", ")}.` : `Imported ${imported.total} items from your portal.`,
                });
            }
        } catch (error: unknown) {
            if (!mountedRef.current) return;
            setSyncError(error instanceof Error ? error.message : String(error));

            // ABSOLUTE SILENCE for non-manual sync errors
            if (mode !== "manual") {
                console.log(`AppShell: Silent failure for mode ${mode}. Error: ${error instanceof Error ? error.message : String(error)}`);
                return;
            }

            const isAborted = error instanceof Error && (error.name === 'AbortError' || (error instanceof DOMException && error.name === 'AbortError'));

            if (isAborted) {
                console.warn("AppShell: Portal sync request was aborted (timeout or manual).", (error as Error).message);
                toast({
                    variant: "destructive",
                    title: "Portal Sync Timed Out",
                    description: (error as Error).message || "The monitored browser session did not return usable portal data.",
                });
            } else {
                console.error("AppShell: Portal sync failed", error);
                toast({
                    title: "Manual Sync Suggested",
                    description: "Automatic scan failed. You can use 'Manual Sync' in the Portal tab to paste data directly!",
                });
            }
        } finally {
            clearTimeout(timeoutId);
            console.log(`AppShell: runPortalSync finished (mode: ${mode})`);
            if (mountedRef.current) {
                if (mode === "startup" || mode === "background") {
                    setHasAttemptedStartupSync(true);
                }
                setIsSyncing(false);
            }
            syncingRef.current = false;
        }
    }, [hasPersistentPortalSession, portalUrl, processSyncResultWithBreakdown, toast, user, setIsSyncing]);

    React.useEffect(() => {
        if (!isUserLoaded) {
            return;
        }

        if (!user || !portalUrl) {
            setTimeout(() => {
                if (mountedRef.current) {
                    setOnboardingOpen(true);
                }
            }, 0);
            return;
        }

        const dashboardEmpty =
            assignments.length === 0 &&
            announcements.length === 0 &&
            discussions.length === 0;

        const shouldStartupSync =
            !hasAttemptedStartupSync &&
            !startupSyncEnqueuedRef.current &&
            !assignmentsLoading &&
            !portalLoading &&
            portalUrl &&
            (dashboardEmpty || hasPersistentPortalSession);

        console.log("AppShell: Sync check", {
            hasPersistentPortalSession,
            hasAttemptedStartupSync,
            assignmentsLoading,
            portalLoading,
            assignmentsCount: assignments.length,
            announcementsCount: announcements.length,
            portalUrl: !!portalUrl,
            shouldStartupSync
        });

        if (shouldStartupSync) {
            startupSyncEnqueuedRef.current = true;
            const mode = dashboardEmpty ? "startup" : "background";
            setTimeout(() => {
                if (mountedRef.current) {
                    setHasAttemptedStartupSync(true);
                    void runPortalSync(mode);
                }
            }, 0);
        }
    }, [announcements.length, assignments.length, assignmentsLoading, discussions.length, hasAttemptedStartupSync, hasPersistentPortalSession, isUserLoaded, portalLoading, portalUrl, runPortalSync, user]);

    React.useEffect(() => {
        const handleUnload = () => {
            const url = getApiUrl("/api/stop-scraper");
            if (typeof navigator !== "undefined" && navigator.sendBeacon) {
                navigator.sendBeacon(url);
            } else {
                void apiFetch("/api/stop-scraper", { method: "POST" });
            }
        };

        window.addEventListener("beforeunload", handleUnload);
        window.addEventListener("pagehide", handleUnload);
        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            window.removeEventListener("pagehide", handleUnload);
        };
    }, []);

    const openSettings = () => {
        setPortalUrlInput(portalUrl);
        setPortalUsernameInput(user?.portalUsername || "");
        setPortalPasswordInput(user?.portalPassword || "");
        setSettingsOpen(true);
    };

    const handleSettingsSave = () => {
        const nextUrl = portalUrlInput.trim();
        if (!nextUrl) {
            return;
        }

        setPortalUrl(nextUrl);
        if (user) {
            setUser({
                ...user,
                portalUsername: portalUsernameInput.trim(),
                portalPassword: portalPasswordInput.trim(),
            });
        }
        localStorage.removeItem("lastAutoSync");
        localStorage.removeItem("portalSessionReady");
        setHasPersistentPortalSession(false);
        setHasAttemptedStartupSync(false);
        startupSyncEnqueuedRef.current = false;
        setSettingsOpen(false);
    };

    const getInitials = (name: string) => {
        if (!name) return "";
        return name.split(" ").map((part) => part[0]).join("");
    };

    const handlePortalClick = () => {
        window.open(portalUrl, "_blank");
    };

    const handleResetApp = () => {
        localStorage.clear();
        window.location.reload();
    };

    const formatShareText = (): string => {
        let text = "Hey! Here's a snapshot of my current agenda:\n\n";

        text += "--- Upcoming Assignments ---\n";
        const upcoming = assignments
            .filter((assignment) => !assignment.completed)
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

        if (upcoming.length > 0) {
            upcoming.forEach((assignment) => {
                text += `- ${assignment.title} (${assignment.course}) - Due: ${assignment.dueDate.toLocaleDateString()}\n`;
            });
        } else {
            text += "No upcoming assignments. All caught up!\n";
        }

        text += "\n--- Current Grades ---\n";
        if (courses.length > 0) {
            courses.forEach((course) => {
                text += `- ${course.name}: ${course.grade}%\n`;
            });
        } else {
            text += "No grades synced yet.\n";
        }

        return text;
    };

    const handleShare = async () => {
        const shareText = formatShareText();
        try {
            await navigator.clipboard.writeText(shareText);
            toast({ title: "Copied to Clipboard!", description: "Your agenda summary has been copied." });
        } catch (error) {
            console.error("Error copying:", error);
            toast({ variant: "destructive", title: "Could not copy summary." });
        }
    };

    const mobileSidebarHeader = (
        <SheetHeader className="border-b p-4">
            <SheetTitle className="sr-only">Main Menu</SheetTitle>
            <Link href="/" className="flex items-center gap-2 font-semibold">
                <Logo className="h-6 w-6" />
                <span className="font-header text-xl text-gradient">Agenda+</span>
            </Link>
        </SheetHeader>
    );

    const navItems = [
        { href: "/portal", icon: Globe, label: "University Portal" },
        { href: "/assignments", icon: Book, label: "Assignments" },
        { href: "/grades", icon: Star, label: "Grades" },
        { href: "/calendar", icon: Calendar, label: "Calendar" },
        { href: "/discussions", icon: UserIcon, label: "Discussions" },
        { href: "/announcements", icon: Megaphone, label: "Announcements" },
        { href: "/study", icon: BrainCircuit, label: "Study" },
    ];

    const pageTitles: Record<string, string> = {
        "/": "Dashboard",
        "/portal": "University Portal",
        "/assignments": "Assignments",
        "/grades": "Grades",
        "/calendar": "Calendar",
        "/discussions": "Discussions",
        "/announcements": "Announcements",
        "/study": "Study Hub",
    };

    const pageTitle = pageTitles[pathname] || "";

    const showSyncOverlay = localSyncOverlay;

    return (
        <SidebarProvider>
            <Sidebar mobileSidebarHeader={mobileSidebarHeader}>
                <SidebarHeader>
                    <Link href="/" className="flex items-center gap-2 p-2 font-semibold">
                        <Logo className="h-6 w-6" />
                        <span
                            className="font-header text-xl text-gradient group-data-[collapsible=icon]:hidden">Agenda+</span>
                    </Link>
                </SidebarHeader>
                <SidebarContent className="p-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Button variant="default" className="h-10 w-full justify-start"
                                onClick={() => setAddAssignmentOpen(true)}>
                                <Plus className="mr-2 size-4" />
                                <span className="group-data-[collapsible=icon]:hidden">Add Assignment</span>
                            </Button>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Button variant="secondary" className="h-10 w-full justify-start"
                                onClick={() => setImportSyllabusOpen(true)}>
                                <FileUp className="mr-2 size-4" />
                                <span className="group-data-[collapsible=icon]:hidden">Import Syllabus</span>
                            </Button>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Button
                                variant="outline"
                                className="h-10 w-full justify-start border-primary/50 text-primary hover:bg-primary/5"
                                onClick={() => void runPortalSync("manual")}
                            >
                                <Sparkles className="mr-2 size-4" />
                                <span className="group-data-[collapsible=icon]:hidden">Rescan Portal</span>
                            </Button>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    <SidebarMenu className="mt-4">
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.label}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname === item.href}
                                    className="justify-start"
                                    tooltip={item.label}
                                >
                                    <Link href={item.href}>
                                        <item.icon className="mr-2 size-4" />
                                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setSchedulerOpen(true)} className="justify-start"
                                tooltip="AI Scheduler">
                                <Bot className="mr-2 size-4" />
                                <span className="group-data-[collapsible=icon]:hidden">AI Scheduler</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={pathname === "/study" && !pathname.startsWith("/study/")}
                                className="justify-start"
                                tooltip="Live Session"
                            >
                                <Link href="/study">
                                    <Video className="mr-2 size-4" />
                                    <span className="group-data-[collapsible=icon]:hidden">Live Session</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter className="border-t p-2">
                    <SidebarMenu>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuItem>
                                    <SidebarMenuButton className="justify-start" tooltip="Settings">
                                        <Settings className="mr-2 size-4" />
                                        <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" side="top" align="start">
                                <DropdownMenuLabel>Portal Monitor</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                    setPortalUrlInput(portalUrl);
                                    openSettings();
                                }}>
                                    Portal Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePortalClick}>Open Portal</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void runPortalSync("manual")}>Rescan
                                    Portal</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    onClick={() => setResetDialogOpen(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Reset App
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <SidebarMenuItem>
                            <SidebarMenuButton className="h-auto justify-start" onClick={openSettings}>
                                <Avatar className="mr-2 size-8">
                                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name || ""}
                                        data-ai-hint="person portrait" />}
                                    <AvatarFallback>{user ? getInitials(user.name) : <UserIcon />}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                                    <span className="font-semibold text-gradient">{user?.name || "Student"}</span>
                                    <span className="text-xs text-muted-foreground">Portal Settings</span>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <header
                    className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:h-[60px] lg:px-6">
                    <SidebarTrigger />
                    {pathname !== "/" && (
                        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="mr-2">
                            <ArrowLeft className="size-5" />
                            <span className="sr-only">Go back</span>
                        </Button>
                    )}
                    <h1 className="flex-1 font-headline text-lg font-semibold text-gradient md:text-xl">{pageTitle}</h1>
                    <div className="flex-1" />
                    <div className="flex items-center gap-4">
                        <div
                            className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 lg:flex">
                            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">GenesisAI Active</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="hidden md:flex"
                                onClick={() => void runPortalSync("manual")}>
                                <Sparkles className="mr-2 size-4" />
                                Rescan
                            </Button>
                            <Button variant="outline" size="sm" className="hidden md:flex" onClick={handleShare}>
                                <Share2 className="mr-2 size-4" />
                                Share
                            </Button>
                            <Button variant="outline" size="icon" className="md:hidden"
                                onClick={() => void runPortalSync("manual")}>
                                <Sparkles className="size-4" />
                                <span className="sr-only">Rescan Portal</span>
                            </Button>
                            <Button variant="outline" size="icon" className="md:hidden" onClick={handleShare}>
                                <Share2 className="size-4" />
                                <span className="sr-only">Share</span>
                            </Button>
                        </div>
                    </div>
                </header>
                <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:gap-6 lg:p-6">
                    {showSyncOverlay ? (
                        <div
                            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-all duration-500">
                            <div
                                className="max-w-md space-y-8 px-6 text-center animate-in fade-in zoom-in duration-300">
                                <div className="relative inline-block">
                                    <Loader2 className="size-24 animate-spin text-primary opacity-20" />
                                    <Sparkles
                                        className="absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 animate-pulse text-primary" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="font-headline text-3xl font-bold text-gradient">GenesisAI Is
                                        Monitoring Your Portal</h2>
                                    <p className="text-lg leading-relaxed text-muted-foreground">
                                        A monitored browser window is open for your school portal. Finish logging in
                                        there and GenesisAI will silently extract fresh data before revealing the
                                        dashboard.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <Progress value={syncProgress} className="h-3" />
                                    <div className="flex justify-between items-center text-xs text-primary font-mono uppercase">
                                        <span className={syncProgress < 100 ? "animate-pulse" : ""}>{syncStatus}</span>
                                        <span>{syncProgress}%</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={() => {
                                            setIsSyncing(false);
                                            setHasAttemptedStartupSync(true);
                                            setLocalSyncOverlay(false);
                                        }}
                                    >
                                        Skip & Continue to Dashboard
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </SidebarInset>
            <AddAssignmentDialog open={addAssignmentOpen} onOpenChange={setAddAssignmentOpen} />
            <IntelligentSchedulerDialog open={schedulerOpen} onOpenChange={setSchedulerOpen} />
            <ImportSyllabusDialog open={importSyllabusOpen} onOpenChange={setImportSyllabusOpen} />
            <OnboardingDialog
                open={onboardingOpen}
                onOpenChange={(open) => {
                    setOnboardingOpen(open);
                    if (!open && user && portalUrl) {
                        void runPortalSync("startup");
                    }
                }}
            />
            <PortalSyncDialog
                open={portalSyncOpen}
                onOpenChange={setPortalSyncOpen}
                portalUrl={portalUrl}
                onImported={processSyncResult}
            />
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <UIDialogTitle className="font-header text-2xl text-gradient">Portal settings</UIDialogTitle>
                        <DialogDescription>
                            GenesisAI opens this portal in a monitored browser session at startup and during rescans.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="portal-url">Student Portal URL</Label>
                            <Input
                                id="portal-url"
                                placeholder="e.g. https://my.school.edu"
                                value={portalUrlInput}
                                onChange={(event) => setPortalUrlInput(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && handleSettingsSave()}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="portal-username">Username (Optional)</Label>
                            <Input
                                id="portal-username"
                                placeholder="Your portal username"
                                value={portalUsernameInput}
                                onChange={(event) => setPortalUsernameInput(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && handleSettingsSave()}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="portal-password">Password (Optional)</Label>
                            <Input
                                id="portal-password"
                                type="password"
                                placeholder="Your portal password"
                                value={portalPasswordInput}
                                onChange={(event) => setPortalPasswordInput(event.target.value)}
                                onKeyDown={(event) => event.key === "Enter" && handleSettingsSave()}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Credentials are saved locally on this device and only used for automated scraping.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSettingsSave} disabled={!portalUrlInput.trim()}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all your assignments, grades, and
                            other saved data from your browser.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetApp} className="bg-destructive hover:bg-destructive/90">
                            Reset App
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    );
}
