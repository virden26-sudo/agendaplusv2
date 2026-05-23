
"use client";

import { WelcomeHeader } from "./welcome-header";
import { UpcomingAssignments } from "./upcoming-assignments";
import { GradeOverview } from "./grade-overview";
import { CalendarView } from "./calendar-view";
import { useRouter } from "next/navigation";
import { LiveSessionCard } from "./live-session-card";
import { usePortal } from "@/context/portal-context";
import { useUser } from "@/context/user-context";
import { useAssignments } from "@/context/assignments-context";
import { useGrades } from "@/context/grades-context";
import { Megaphone, Loader2 } from "lucide-react";

export function DashboardPage() {
  const { user, isUserLoaded } = useUser();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { courses, loading: gradesLoading } = useGrades();
  const { announcements, loading: portalLoading } = usePortal();
  const router = useRouter();

  console.log("DashboardPage State:", {
    user: !!user,
    isUserLoaded,
    assignments: assignments.length,
    assignmentsLoading,
    courses: courses.length,
    gradesLoading,
    announcements: announcements.length,
    portalLoading
  });
  
  const isDataLoading = assignmentsLoading || gradesLoading || portalLoading || !isUserLoaded;
  const latestAnnouncements = announcements.slice(0, 2);
 
  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Syncing your academic universe...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {user && <WelcomeHeader />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <UpcomingAssignments />
          {latestAnnouncements.length > 0 && (
            <div className="bg-card rounded-xl border p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Megaphone className="size-4 text-primary" />
                    Recent Announcements
                </h3>
                <div className="space-y-4">
                    {latestAnnouncements.map(a => (
                        <div key={a.id} className="text-sm border-b pb-2 last:border-0 last:pb-0">
                            <div className="font-medium">{a.title}</div>
                            <div className="text-muted-foreground line-clamp-1">{a.content}</div>
                        </div>
                    ))}
                </div>
            </div>
          )}
          <div className="cursor-pointer" onClick={() => router.push('/calendar')}>
            <CalendarView />
          </div>
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <GradeOverview />
          <LiveSessionCard />
        </div>
      </div>
    </div>
  );
}
