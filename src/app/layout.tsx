import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { AssignmentsProvider } from '@/context/assignments-context';
import { GradesProvider } from '@/context/grades-context';
import { PortalProvider } from '@/context/portal-context';
import { QuizzesProvider } from '@/context/quizzes-context';
import { TasksProvider } from '@/context/tasks-context';
import { UserProvider } from '@/context/user-context';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agenda+ | Your Academic Sidekick',
  description: 'GenesisAi powered student agenda for crushing your semester.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Dancing+Script:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        }>
          <UserProvider>
            <TasksProvider>
              <QuizzesProvider>
                <AssignmentsProvider>
                  <GradesProvider>
                    <PortalProvider>
                      <AppShell>
                        {children}
                      </AppShell>
                    </PortalProvider>
                  </GradesProvider>
                </AssignmentsProvider>
              </QuizzesProvider>
            </TasksProvider>
          </UserProvider>
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
