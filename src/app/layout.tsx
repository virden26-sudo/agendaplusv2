import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { AssignmentsProvider } from '@/context/assignments-context';
import { GradesProvider } from '@/context/grades-context';
import { PortalProvider } from '@/context/portal-context';
import { QuizzesProvider } from '@/context/quizzes-context';
import { TasksProvider } from '@/context/tasks-context';
import { UserProvider } from '@/context/user-context';
import { AppShell } from '@/components/layout/app-shell';

import { Roboto, Dancing_Script } from 'next/font/google';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

const dancingScript = Dancing_Script({
  weight: ['700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dancing-script',
});

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
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${dancingScript.variable}`}>
      <body>
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
        <Toaster />
      </body>
    </html>
  );
}
