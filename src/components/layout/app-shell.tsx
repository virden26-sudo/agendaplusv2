
"use client";

import * as React from "react";
import {
  Book,
  Calendar,
  Star,
  Bot,
  Plus,
  Settings,
  User as UserIcon,
  FileUp,
  BrainCircuit,
  Video,
  Trash2,
  Share2,
  Sparkles,
  ArrowLeft,
  Globe,
  Megaphone,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/icons";
import { AddAssignmentDialog } from "../dashboard/add-assignment-dialog";
import { IntelligentSchedulerDialog } from "../dashboard/intelligent-scheduler-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as UIDialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User, ParsedAssignment, Announcement, Discussion } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportSyllabusDialog } from "../dashboard/import-syllabus-dialog";
import { BuddieSyncDialog } from "../dashboard/budd-ie-sync-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAssignments } from "@/context/assignments-context";
import { useGrades } from "@/context/grades-context";
import { usePortal } from "@/context/portal-context";
import { useUser } from "@/context/user-context";
import { v4 as uuidv4 } from 'uuid';
import { Progress } from "@/components/ui/progress";

import { LoginPage } from "../auth/login-page";
import { PortalLogin } from "../auth/portal-login";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { assignments, addMultipleAssignments } = useAssignments();
  const { courses } = useGrades();
  const { addAnnouncements, addDiscussions } = usePortal();
  const { user, setUser, portalUrl, setPortalUrl, isUserLoaded } = useUser();
  
  const [addAssignmentOpen, setAddAssignmentOpen] = React.useState(false);
  const [schedulerOpen, setSchedulerOpen] = React.useState(false);
  const [importSyllabusOpen, setImportSyllabusOpen] = React.useState(false);
  const [syncOpen, setSyncOpen] = React.useState(false);
  
  const [namePromptOpen, setNamePromptOpen] = React.useState(false);
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [nameInput, setNameInput] = React.useState('');
  const [portalUrlInput, setPortalUrlInput] = React.useState(portalUrl);
  const [showPortalLogin, setShowPortalLogin] = React.useState(false);
  const [tempUser, setTempUser] = React.useState<{name: string, portalUrl: string} | null>(null);
  const [isSyncingInitial, setIsSyncingInitial] = React.useState(false);
  const [isSyncingBackground, setIsSyncingBackground] = React.useState(false);

  // Sync portalUrlInput when portalUrl from context changes
  React.useEffect(() => {
    setPortalUrlInput(portalUrl);
  }, [portalUrl]);

  const handleLogin = (name: string, url: string) => {
    setTempUser({ name, portalUrl: url });
    setShowPortalLogin(true);
  };

  const processSyncResult = (result: any) => {
    if (result.assignments && result.assignments.length > 0) {
        addMultipleAssignments(result.assignments.map((a: ParsedAssignment) => ({
            ...a,
            course: a.course || undefined
        })));
    }

    if (result.announcements && result.announcements.length > 0) {
        addAnnouncements(result.announcements.map((a: any) => ({
            id: uuidv4(),
            ...a,
            course: a.course || "General",
            content: a.content || "",
            important: Boolean(a.important),
            date: a.date ? new Date(a.date) : new Date()
        })));
    }

    if (result.discussions && result.discussions.length > 0) {
        addDiscussions(result.discussions.map((d: any) => ({
            id: uuidv4(),
            ...d,
            course: d.course || "General",
            content: d.content || undefined,
            author: d.author || undefined,
            postedDate: new Date(d.postedDate),
            dueDate: d.dueDate ? new Date(d.dueDate) : undefined
        })));
    }
    
    localStorage.setItem('lastAutoSync', Date.now().toString());
  };

  const handlePortalComplete = async (username?: string, password?: string) => {
    if (!tempUser) return;
    
    setIsSyncingInitial(true);

    try {
        const response = await fetch('/api/parse-portal/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: tempUser.portalUrl,
                username,
                password
            }),
        });
        
        if (!response.ok) throw new Error(`Failed to parse portal: ${response.status}`);
        
        const result = await response.json();
        
        processSyncResult(result);
        
        toast({
            title: "Freshly Synced!",
            description: `Budd-ie has updated your dashboard with the latest information.`,
        });
    } catch (err) {
        console.error("Initial sync failed", err);
        toast({
            variant: "destructive",
            title: "Sync Partial",
            description: "We've set up your profile, but couldn't sync data yet. You can try again from the dashboard.",
        });
    } finally {
        const newUser: User = {
          name: tempUser.name,
          avatarUrl: `https://picsum.photos/seed/${tempUser.name}/100/100`,
        };
    
        setPortalUrl(tempUser.portalUrl);
        setUser(newUser);
        setShowPortalLogin(false);
        setIsSyncingInitial(false);
    }
  };

  // Auto-sync effect: Runs on load if user exists
  React.useEffect(() => {
    if (isUserLoaded && user && portalUrl && !showPortalLogin) {
        const lastSync = localStorage.getItem('lastAutoSync');
        const now = Date.now();
        // Auto-sync if it's been more than an hour since last sync
        if (!lastSync || now - parseInt(lastSync) > 3600000) {
            console.log("Budd-ie background sync triggered for URL:", portalUrl);
            setIsSyncingBackground(true);
            fetch('/api/parse-portal/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: portalUrl
                }),
            }).then(async (res) => {
                if (!res.ok) {
                    const text = await res.text();
                    console.warn(`Portal sync returned status ${res.status}:`, text.slice(0, 100));
                    throw new Error(`Server returned ${res.status}`);
                }
                return res.json();
            }).then((result) => {
                // Only process and show toast if actual data was returned
                if (result.assignments?.length > 0 || result.announcements?.length > 0) {
                    processSyncResult(result);
                    localStorage.setItem('lastAutoSync', Date.now().toString());
                    toast({
                      title: "Background Sync Complete",
                      description: "Budd-ie has updated your agenda from your portal.",
                    });
                }
            }).catch(err => {
                console.log("Background sync info:", err.message || err);
            }).finally(() => {
                setIsSyncingBackground(false);
            });
        }
    }
  }, [isUserLoaded, user, portalUrl, toast, showPortalLogin]);

  const handleProfileSave = () => {
    if (nameInput.trim()) {
      const newUser: User = {
        name: nameInput.trim(),
        avatarUrl: `https://picsum.photos/seed/${nameInput.trim()}/100/100`,
      };
      setUser(newUser);
      setNameInput('');
    }
    if(portalUrlInput.trim()){
      setPortalUrl(portalUrlInput);
    }
    setNamePromptOpen(false);
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("");
  }
  
  const handlePortalClick = () => {
    window.open(portalUrl, "_blank");
  };

  const handleLogout = () => {
    setUser(null);
    setNamePromptOpen(true);
  };

  const handleResetApp = () => {
    localStorage.clear();
    window.location.reload();
  };

  const formatShareText = (): string => {
    let text = `Hey! Here's a snapshot of my current agenda:\n\n`;
    
    text += "--- Upcoming Assignments ---\n";
    const upcoming = assignments.filter(a => !a.completed).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    if (upcoming.length > 0) {
      upcoming.forEach(a => {
        text += `- ${a.title} (${a.course}) - Due: ${a.dueDate.toLocaleDateString()}\n`;
      });
    } else {
      text += "No upcoming assignments. All caught up!\n";
    }

    text += "\n--- Current Grades ---\n";
    if (courses.length > 0) {
        courses.forEach(c => {
            text += `- ${c.name}: ${c.grade}%\n`;
        });
    } else {
        text += "No grades synced yet.\n";
    }

    return text;
  }

  const handleShare = async () => {
    const shareText = formatShareText();
    try {
        await navigator.clipboard.writeText(shareText);
        toast({ title: 'Copied to Clipboard!', description: 'Your agenda summary has been copied.' });
    } catch (error) {
        console.error('Error copying:', error);
        toast({ variant: 'destructive', title: 'Could not copy summary.' });
    }
  }

  const MobileSidebarHeader = (
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

  const pageTitles: { [key: string]: string } = {
    '/': 'Dashboard',
    '/portal': 'University Portal',
    '/assignments': 'Assignments',
    '/grades': 'Grades',
    '/calendar': 'Calendar',
    '/discussions': 'Discussions',
    '/announcements': 'Announcements',
    '/study': 'Study Hub'
  };
  
  const pageTitle = pageTitles[pathname] || "";

  const isSyncing = isSyncingInitial || isSyncingBackground;

  if (!user) {
    if (showPortalLogin && tempUser) {
        return <PortalLogin portalUrl={tempUser.portalUrl} isSyncing={isSyncingInitial} onComplete={handlePortalComplete} />;
    }
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <SidebarProvider>
      <Sidebar mobileSidebarHeader={MobileSidebarHeader}>
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 font-semibold p-2">
              <Logo className="h-6 w-6" />
              <span className="font-header text-xl group-data-[collapsible=icon]:hidden text-gradient">Agenda+</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
              <SidebarMenuItem>
                  <Button variant="default" className="w-full justify-start h-10" onClick={() => setAddAssignmentOpen(true)}>
                      <Plus className="mr-2 size-4" />
                      <span className="group-data-[collapsible=icon]:hidden">Add Assignment</span>
                  </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <Button variant="secondary" className="w-full justify-start h-10" onClick={() => setImportSyllabusOpen(true)}>
                      <FileUp className="mr-2 size-4" />
                      <span className="group-data-[collapsible=icon]:hidden">Import Syllabus</span>
                  </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                  <Button variant="outline" className="w-full justify-start h-10 border-primary/50 text-primary hover:bg-primary/5" onClick={() => setSyncOpen(true)}>
                      <Sparkles className="mr-2 size-4" />
                      <span className="group-data-[collapsible=icon]:hidden">Sync with Budd-ie</span>
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
                    <item.icon className="size-4 mr-2" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
             <SidebarMenuItem>
                <SidebarMenuButton
                    onClick={() => setSchedulerOpen(true)}
                    className="justify-start"
                    tooltip="AI Scheduler"
                  >
                    <Bot className="size-4 mr-2" />
                    <span className="group-data-[collapsible=icon]:hidden">AI Scheduler</span>
                  </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname==='/study' && !pathname.startsWith('/study/')}
                    className="justify-start"
                    tooltip="Live Session"
                  >
                    <Link href="/study">
                        <Video className="size-4 mr-2" />
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
                        <Settings className="size-4 mr-2" />
                        <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="top" align="start">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setNameInput(user?.name || ''); setNamePromptOpen(true);}}>
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePortalClick}>
                  University Portal
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
                 <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setResetDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Reset App
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <SidebarMenuItem>
                <SidebarMenuButton className="h-auto justify-start" onClick={() => {setNameInput(user?.name || ''); setNamePromptOpen(true);}}>
                    <Avatar className="size-8 mr-2">
                      {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name || ''} data-ai-hint="person portrait" />}
                      <AvatarFallback>{user ? getInitials(user.name) : <UserIcon/>}</AvatarFallback>
                    </Avatar>
                     <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                        {user ? (
                            <>
                                <span className="text-gradient font-semibold">{user.name}</span>
                                <span className="text-xs text-muted-foreground">Edit Profile</span>
                            </>
                        ) : (
                            <span className="text-gradient">Set User</span>
                        )}
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-30 lg:h-[60px] lg:px-6">
          <SidebarTrigger />
          {pathname !== '/' && (
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="size-5" />
              <span className="sr-only">Go back</span>
            </Button>
          )}
          <h1 className="flex-1 text-lg font-semibold md:text-xl font-headline text-gradient">{pageTitle}</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-1">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Budd-ie: Active Monitor</span>
            </div>
            <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => setSyncOpen(true)}>
              <Sparkles className="mr-2 size-4" />
              Sync
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex" onClick={handleShare}>
              <Share2 className="mr-2 size-4" />
              Share
            </Button>
            <Button variant="outline" size="icon" className="md:hidden" onClick={() => setSyncOpen(true)}>
              <Sparkles className="size-4" />
              <span className="sr-only">Sync with Budd-ie</span>
            </Button>
            <Button variant="outline" size="icon" className="md:hidden" onClick={handleShare}>
              <Share2 className="size-4" />
              <span className="sr-only">Share</span>
            </Button>
          </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 relative overflow-hidden">
           {isSyncing ? (
             <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-all duration-500">
                <div className="max-w-md w-full px-6 space-y-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="relative inline-block">
                        <Loader2 className="size-24 animate-spin text-primary opacity-20" />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-12 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-3xl font-bold font-headline text-gradient">Budd-ie is Syncing...</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Updating your academic universe. Pulling your assignments, announcements, and grades from the portal.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Progress value={undefined} className="h-3" />
                        <p className="text-xs font-mono text-primary animate-pulse">AUTONOMOUS AGENT ACTIVE - DEEP SCANNING PORTAL</p>
                    </div>
                </div>
             </div>
           ) : (
             children
           )}
        </main>
      </SidebarInset>
      <AddAssignmentDialog open={addAssignmentOpen} onOpenChange={setAddAssignmentOpen} />
      <IntelligentSchedulerDialog open={schedulerOpen} onOpenChange={setSchedulerOpen} />
      <ImportSyllabusDialog open={importSyllabusOpen} onOpenChange={setImportSyllabusOpen} />
      <BuddieSyncDialog open={syncOpen} onOpenChangeAction={setSyncOpen} />
      <Dialog open={namePromptOpen} onOpenChange={(isOpen) => {
        if (user) {
          setNamePromptOpen(isOpen);
        }
      }}>
        <DialogContent onInteractOutside={(e) => {if (!user) e.preventDefault()}}>
            <DialogHeader>
                <UIDialogTitle className="font-header text-2xl text-gradient">Welcome to Agenda+</UIDialogTitle>
                <DialogDescription>Please enter your name to personalize your experience.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                        id="name" 
                        placeholder="e.g. Alex Doe"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleProfileSave()}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="portal-url">Student Portal URL</Label>
                    <Input 
                        id="portal-url" 
                        placeholder="e.g. https://my.school.edu"
                        value={portalUrlInput}
                        onChange={(e) => setPortalUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleProfileSave()}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleProfileSave} disabled={!nameInput.trim()}>Save</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your
              assignments, grades, and other saved data from your browser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetApp} className="bg-destructive hover:bg-destructive/90">Reset App</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
