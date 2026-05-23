"use client";

import {AssignmentsProvider} from "@/context/assignments-context";
import {GradesProvider} from "@/context/grades-context";
import {QuizzesProvider} from "@/context/quizzes-context";
import {TasksProvider} from "@/context/tasks-context";
import {PortalProvider} from "@/context/portal-context";
import {UserProvider} from "@/context/user-context";
import {SidebarProvider} from "@/components/ui/sidebar";

export function AppProviders({children}: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <PortalProvider>
                <AssignmentsProvider>
                    <GradesProvider>
                        <QuizzesProvider>
                            <TasksProvider>
                                <SidebarProvider>
                                    {children}
                                </SidebarProvider>
                            </TasksProvider>
                        </QuizzesProvider>
                    </GradesProvider>
                </AssignmentsProvider>
            </PortalProvider>
        </UserProvider>
    );
}
