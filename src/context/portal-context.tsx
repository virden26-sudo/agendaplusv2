
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Announcement, Discussion } from '@/lib/types';

interface PortalContextType {
  announcements: Announcement[];
  discussions: Discussion[];
  addAnnouncements: (newAnnouncements: Announcement[]) => void;
  addDiscussions: (newDiscussions: Discussion[]) => void;
  loading: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedAnnouncements = localStorage.getItem('agendaAnnouncements');
        if (storedAnnouncements) {
          const parsed = JSON.parse(storedAnnouncements);
          if (Array.isArray(parsed)) {
            return parsed.map((a: any) => ({
              ...a,
              date: new Date(a.date),
            }));
          }
        }
      } catch (error) {
        console.error("Failed to parse portal data from localStorage", error);
      }
    }
    return [];
  });

  const [discussions, setDiscussions] = useState<Discussion[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedDiscussions = localStorage.getItem('agendaDiscussions');
        if (storedDiscussions) {
          const parsed = JSON.parse(storedDiscussions);
          if (Array.isArray(parsed)) {
            return parsed.map((d: any) => ({
              ...d,
              postedDate: new Date(d.postedDate),
              dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to parse portal data from localStorage", error);
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
        localStorage.setItem('agendaAnnouncements', JSON.stringify(announcements));
        localStorage.setItem('agendaDiscussions', JSON.stringify(discussions));
    }
  }, [announcements, discussions, loading]);

  const addAnnouncements = (newAnnouncements: Announcement[]) => {
    setAnnouncements(prev => [...newAnnouncements, ...prev]);
  };

  const addDiscussions = (newDiscussions: Discussion[]) => {
    setDiscussions(prev => [...newDiscussions, ...prev]);
  };

  return (
    <PortalContext.Provider value={{ announcements, discussions, addAnnouncements, addDiscussions, loading }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
}
