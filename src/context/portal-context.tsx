"use client";

import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import type {Announcement, Discussion} from '@/lib/types';

interface PortalContextType {
    announcements: Announcement[];
    discussions: Discussion[];
    addAnnouncements: (newAnnouncements: Announcement[]) => void;
    addDiscussions: (newDiscussions: Discussion[]) => void;
    loading: boolean;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

type StoredAnnouncement = Omit<Announcement, 'date'> & { date: string };
type StoredDiscussion = Omit<Discussion, 'postedDate' | 'dueDate'> & {
    postedDate: string;
    dueDate?: string;
};

export function PortalProvider({children}: { children: ReactNode }) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            try {
                const storedAnnouncements = localStorage.getItem('agendaAnnouncements');
                const storedDiscussions = localStorage.getItem('agendaDiscussions');

                const parsedAnnouncements = storedAnnouncements ? (JSON.parse(storedAnnouncements) as StoredAnnouncement[]) : [];
                const parsedDiscussions = storedDiscussions ? (JSON.parse(storedDiscussions) as StoredDiscussion[]) : [];

                setAnnouncements(
                    Array.isArray(parsedAnnouncements)
                        ? parsedAnnouncements.map((announcement) => ({
                            ...announcement,
                            date: new Date(announcement.date),
                        }))
                        : []
                );

                setDiscussions(
                    Array.isArray(parsedDiscussions)
                        ? parsedDiscussions.map((discussion) => ({
                            ...discussion,
                            postedDate: new Date(discussion.postedDate),
                            dueDate: discussion.dueDate ? new Date(discussion.dueDate) : undefined,
                        }))
                        : []
                );
            } catch (error) {
                console.error("Failed to parse portal data from localStorage", error);
                setAnnouncements([]);
                setDiscussions([]);
            } finally {
                setLoading(false);
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
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
        <PortalContext.Provider value={{announcements, discussions, addAnnouncements, addDiscussions, loading}}>
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
