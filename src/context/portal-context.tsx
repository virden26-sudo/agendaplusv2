
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Announcement, Discussion } from '@/lib/types';

interface PortalContextType {
  announcements: Announcement[];
  discussions: Discussion[];
  addAnnouncements: (newAnnouncements: Announcement[]) => void;
  addDiscussions: (newDiscussions: Discussion[]) => void;
  replaceAnnouncements: (items: Announcement[]) => void;
  replaceDiscussions: (items: Discussion[]) => void;
  isSyncing: boolean;
  setIsSyncing: (isSyncing: boolean) => void;
  loading: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

function loadStoredPortalData(): { announcements: Announcement[]; discussions: Discussion[] } {
  if (typeof window === "undefined") {
    return { announcements: [], discussions: [] };
  }

  try {
    let announcements: Announcement[] = [];
    let discussions: Discussion[] = [];

    const storedAnnouncements = localStorage.getItem('agendaAnnouncements');
    if (storedAnnouncements) {
      const parsed = JSON.parse(storedAnnouncements);
      if (Array.isArray(parsed)) {
        announcements = parsed.map((a: Announcement & { date: string }) => ({
          ...a,
          date: new Date(a.date),
        }));
      }
    }

    const storedDiscussions = localStorage.getItem('agendaDiscussions');
    if (storedDiscussions) {
      const parsed = JSON.parse(storedDiscussions);
      if (Array.isArray(parsed)) {
        discussions = parsed.map((d: Discussion & { postedDate: string; dueDate?: string }) => ({
          ...d,
          postedDate: new Date(d.postedDate),
          dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
        }));
      }
    }

    return { announcements, discussions };
  } catch (error) {
    console.error("Failed to parse portal data from localStorage", error);
    return { announcements: [], discussions: [] };
  }
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, _setLoading] = useState(false);

  useEffect(() => {
    const stored = loadStoredPortalData();
    setAnnouncements(stored.announcements);
    setDiscussions(stored.discussions);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('agendaAnnouncements', JSON.stringify(announcements));
      localStorage.setItem('agendaDiscussions', JSON.stringify(discussions));
    }
  }, [announcements, discussions, isInitialized]);

  const addAnnouncements = (newAnnouncements: Announcement[]) => {
    setAnnouncements(prev => {
        const existingKeys = new Set(prev.map(a => `${a.title.toLowerCase()}|${a.course.toLowerCase()}`));
        const toAdd = newAnnouncements.filter(a => !existingKeys.has(`${a.title.toLowerCase()}|${a.course.toLowerCase()}`));
        if (toAdd.length === 0) return prev;
        return [...toAdd, ...prev];
    });
  };

  const addDiscussions = (newDiscussions: Discussion[]) => {
    setDiscussions(prev => {
        const existingKeys = new Set(prev.map(d => `${d.title.toLowerCase()}|${d.course.toLowerCase()}`));
        const toAdd = newDiscussions.filter(d => !existingKeys.has(`${d.title.toLowerCase()}|${d.course.toLowerCase()}`));
        if (toAdd.length === 0) return prev;
        return [...toAdd, ...prev];
    });
  };

  const replaceAnnouncements = (items: Announcement[]) => {
    setAnnouncements(items);
  };

  const replaceDiscussions = (items: Discussion[]) => {
    setDiscussions(items);
  };

  return (
    <PortalContext.Provider value={{ announcements, discussions, addAnnouncements, addDiscussions, replaceAnnouncements, replaceDiscussions, isSyncing, setIsSyncing, loading: !isInitialized }}>
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
