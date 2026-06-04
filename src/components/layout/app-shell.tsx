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
import {usePathname} from "next/navigation";
import Link from "next/link";
import {v4 as uuidv4} from "uuid";

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
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
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Logo} from "@/components/icons";

import {PortalSyncDialog, type PortalSyncDialogResult} from "@/components/portal/portal-sync-dialog";
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
import {useToast} from "@/hooks/use-toast";
import {useAssignments} from "@/context/assignments-context";
import {useGrades} from "@/context/grades-context";
import {usePortal} from "@/context/portal-context";
import {useUser} from "@/context/user-context";
import {readLocalStorage} from "@/lib/storage";

const AddAssignmentDialog = dynamic(() => import("../dashboard/add-assignment-dialog").then(mod => mod.AddAssignmentDialog), {ssr: false});
const ImportSyllabusDialog = dynamic(() => import("../dashboard/import-syllabus-dialog").then(mod => mod.ImportSyllabusDialog), {ssr: false});
const IntelligentSchedulerDialog = dynamic(() => import("../dashboard/intelligent-scheduler-dialog").then(mod => mod.IntelligentSchedulerDialog), {ssr: false});
const OnboardingDialog = dynamic(() => import("../dashboard/onboarding-dialog").then(mod => mod.OnboardingDialog), {ssr: false});

type PortalSyncResult = PortalSyncDialogResult;

export function AppShell({children}: { children: React.ReactNode }) {
    const pathname = usePathname();
    const {toast} = useToast();
    const {assignments, addMultipleAssignments, loading: assignmentsLoading} = useAssignments();
    const {courses, setCourses} = useGrades();
    const {announcements, discussions, addAnnouncements, addDiscussions, loading: portalLoading} = usePortal();
    const {user, setUser, portalUrl, setPortalUrl, isUserLoaded} = useUser();

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
    const [hasPersistentPortalSession, setHasPersistentPortalSession] = React.useState(false);

    React.useEffect(() => {
        queueMicrotask(() => {
            setHasPersistentPortalSession(readLocalStorage("portalSessionReady") === "true");
        });
    }, []);

    const processSyncResult = React.useCallback((result: PortalSyncResult) => {
        console.log("AppShell: processSyncResult counts", {
            assignments: result.assignments?.length ?? 0,
            announcements: result.announcements?.length ?? 0,
            discussions: result.discussions?.length ?? 0,
            quizzes: result.quizzes?.length ?? 0,
            grades: result.grades?.length ?? 0
        });

        const allTasks = [
            ...(result.assignments || []),
            ...(result.quizzes || [])
        ];

        if (allTasks.length) {
            console.log(`AppShell: Adding ${allTasks.length} tasks to context...`);
            addMultipleAssignments(
                allTasks.map((assignment) => ({
                    ...assignment,
                    course: assignment.course || undefined,
                }))
            );
        }

        if (result.announcements?.length) {
            console.log(`AppShell: Adding ${result.announcements.length} announcements...`);
            addAnnouncements(
                result.announcements.map((announcement) => ({
                    id: uuidv4(),
                    ...announcement,
                    course: announcement.course || "General",
                    content: announcement.content || "",
                    important: Boolean((announcement as { important?: boolean }).important),
                    date: announcement.date ? new Date(announcement.date) : new Date(),
                }))
            );
        }

        if (result.discussions?.length) {
            console.log(`AppShell: Adding ${result.discussions.length} discussions...`);
            addDiscussions(
                result.discussions.map((discussion) => ({
                    id: uuidv4(),
                    ...discussion,
                    course: discussion.course || "General",
                    content: discussion.content || undefined,
                    author: (discussion as { author?: string }).author || undefined,
                    postedDate: new Date(discussion.postedDate),
                    dueDate: discussion.dueDate ? new Date(discussion.dueDate) : undefined,
                }))
            );
        }

        if (result.grades?.length) {
            console.log(`AppShell: Adding ${result.grades.length} grades...`);
            const newCourses = result.grades.map(g => {
                const gradeStr = g.grade || "0";
                const gradeNum = parseFloat(gradeStr.replace(/[^0-9.]/g, ''));
                return {
                    id: uuidv4(),
                    name: g.course || "Extracted Course",
                    grade: isNaN(gradeNum) ? 0 : gradeNum
                };
            });
            setCourses(newCourses);
        }

        const importedCount =
            allTasks.length +
            (result.announcements?.length ?? 0) +
            (result.discussions?.length ?? 0) +
            (result.grades?.length ?? 0);

        localStorage.setItem("lastAutoSync", Date.now().toString());

        if (importedCount > 0) {
            localStorage.setItem("portalSessionReady", "true");
            setHasPersistentPortalSession(true);
        } else {
            console.warn("AppShell: Portal sync returned no items; session flag not set.");
        }

        return importedCount;
    }, [addAnnouncements, addDiscussions, addMultipleAssignments, setCourses]);

    const runPortalSync = React.useCallback(() => {
        setPortalSyncOpen(true);
    }, []);

    React.useEffect(() => {
        if (!isUserLoaded) {
            return;
        }

        if (!user || !portalUrl) {
            queueMicrotask(() => setOnboardingOpen(true));
        }
    }, [isUserLoaded, portalUrl, user]);

    React.useEffect(() => {
        if (!isUserLoaded) {
            console.log("AppShell: User not loaded yet, skipping sync check");
            return;
        }

        if (!user || !portalUrl) {
            return;
        }

        const dashboardEmpty =
            assignments.length === 0 &&
            announcements.length === 0 &&
            discussions.length === 0;
        const shouldStartupSync =
            !hasAttemptedStartupSync &&
            !assignmentsLoading &&
            !portalLoading &&
            dashboardEmpty &&
            portalUrl;

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
            queueMicrotask(() => {
                setHasAttemptedStartupSync(true);
                runPortalSync();
            });
        }
    }, [announcements.length, assignments.length, assignmentsLoading, discussions.length, hasAttemptedStartupSync, hasPersistentPortalSession, isUserLoaded, portalLoading, portalUrl, runPortalSync, user]);

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
            toast({title: "Copied to Clipboard!", description: "Your agenda summary has been copied."});
        } catch (error) {
            console.error("Error copying:", error);
            toast({variant: "destructive", title: "Could not copy summary."});
        }
    };

    const mobileSidebarHeader = (
        <SheetHeader className="border-b p-4">
            <SheetTitle className="sr-only">Main Menu</SheetTitle>
            <Link href="/" className="flex items-center gap-2 font-semibold">
                <Logo className="h-6 w-6"/>
                <span className="font-header text-xl text-gradient">Agenda+</span>
            </Link>
        </SheetHeader>
    );

    const navItems = [
        {href: "/portal", icon: Globe, label: "University Portal"},
        {href: "/assignments", icon: Book, label: "Assignments"},
        {href: "/grades", icon: Star, label: "Grades"},
        {href: "/calendar", icon: Calendar, label: "Calendar"},
        {href: "/discussions", icon: UserIcon, label: "Discussions"},
        {href: "/announcements", icon: Megaphone, label: "Announcements"},
        {href: "/study", icon: BrainCircuit, label: "Study"},
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

    return (
        <SidebarProvider>
            <Sidebar mobileSidebarHeader={mobileSidebarHeader}>
                <SidebarHeader>
                    <Link href="/" className="flex items-center gap-2 p-2 font-semibold">
                        <Logo className="h-6 w-6"/>
                        <span
                            className="font-header text-xl text-gradient group-data-[collapsible=icon]:hidden">Agenda+</span>
                    </Link>
                </SidebarHeader>
                <SidebarContent className="p-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Button variant="default" className="h-10 w-full justify-start"
                                    onClick={() => setAddAssignmentOpen(true)}>
                                <Plus className="mr-2 size-4"/>
                                <span className="group-data-[collapsible=icon]:hidden">Add Assignment</span>
                            </Button>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Button variant="secondary" className="h-10 w-full justify-start"
                                    onClick={() => setImportSyllabusOpen(true)}>
                                <FileUp className="mr-2 size-4"/>
                                <span className="group-data-[collapsible=icon]:hidden">Import Syllabus</span>
                            </Button>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Button
                                variant="outline"
                                className="h-10 w-full justify-start border-primary/50 text-primary hover:bg-primary/5"
                                onClick={runPortalSync}
                            >
                                <Sparkles className="mr-2 size-4"/>
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
                                        <item.icon className="mr-2 size-4"/>
                                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={() => setSchedulerOpen(true)} className="justify-start"
                                               tooltip="AI Scheduler">
                                <Bot className="mr-2 size-4"/>
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
                                    <Video className="mr-2 size-4"/>
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
                                        <Settings className="mr-2 size-4"/>
                                        <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" side="top" align="start">
                                <DropdownMenuLabel>Portal Monitor</DropdownMenuLabel>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem onClick={() => {
                                    setPortalUrlInput(portalUrl);
                                    openSettings();
                                }}>
                                    Portal Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handlePortalClick}>Open Portal</DropdownMenuItem>
                                <DropdownMenuItem onClick={runPortalSync}>Rescan
                                    Portal</DropdownMenuItem>
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                    onClick={() => setResetDialogOpen(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Reset App
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <SidebarMenuItem>
                            <SidebarMenuButton className="h-auto justify-start" onClick={openSettings}>
                                <Avatar className="mr-2 size-8">
                                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name || ""}
                                                                     data-ai-hint="person portrait"/>}
                                    <AvatarFallback>{user ? getInitials(user.name) : <UserIcon/>}</AvatarFallback>
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
                    <SidebarTrigger/>
                    {pathname !== "/" && (
                        <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="mr-2">
                            <ArrowLeft className="size-5"/>
                            <span className="sr-only">Go back</span>
                        </Button>
                    )}
                    <h1 className="flex-1 font-headline text-lg font-semibold text-gradient md:text-xl">{pageTitle}</h1>
                    <div className="flex-1"/>
                    <div className="flex items-center gap-4">
                        <div
                            className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 lg:flex">
                            <div className="size-2 rounded-full bg-green-500 animate-pulse"/>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">On-device sync</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="hidden md:flex"
                                    onClick={runPortalSync}>
                                <Sparkles className="mr-2 size-4"/>
                                Rescan
                            </Button>
                            <Button variant="outline" size="sm" className="hidden md:flex" onClick={handleShare}>
                                <Share2 className="mr-2 size-4"/>
                                Share
                            </Button>
                            <Button variant="outline" size="icon" className="md:hidden"
                                    onClick={runPortalSync}>
                                <Sparkles className="size-4"/>
                                <span className="sr-only">Rescan Portal</span>
                            </Button>
                            <Button variant="outline" size="icon" className="md:hidden" onClick={handleShare}>
                                <Share2 className="size-4"/>
                                <span className="sr-only">Share</span>
                            </Button>
                        </div>
                    </div>
                </header>
                <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:gap-6 lg:p-6">
                    {children}
                </div>
            </SidebarInset>
            <AddAssignmentDialog open={addAssignmentOpen} onOpenChange={setAddAssignmentOpen}/>
            <IntelligentSchedulerDialog open={schedulerOpen} onOpenChange={setSchedulerOpen}/>
            <ImportSyllabusDialog open={importSyllabusOpen} onOpenChange={setImportSyllabusOpen}/>
            <OnboardingDialog
                open={onboardingOpen}
                onOpenChange={(open) => {
                    setOnboardingOpen(open);
                    if (!open && user && portalUrl) {
                        runPortalSync();
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
                            Your portal link is used when you sync. All parsing happens on this device.
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
