"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { readLocalStorage, readLocalStorageJson } from '@/lib/storage';

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    portalUrl: string;
    setPortalUrl: (url: string) => void;
    isUserLoaded: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => readLocalStorageJson<User>("agendaUser"));
    const [portalUrl, setPortalUrl] = useState(() => readLocalStorage("studentPortalUrl") || "");
    const [isUserLoaded] = useState(() => typeof window !== "undefined");

    const handleSetUser = (newUser: User | null) => {
        if (typeof window !== "undefined") {
            if (newUser) {
                localStorage.setItem("agendaUser", JSON.stringify(newUser));
            } else {
                localStorage.removeItem("agendaUser");
            }
        }
        setUser(newUser);
    };

    const handleSetPortalUrl = (url: string) => {
        if (typeof window !== "undefined") {
            localStorage.setItem("studentPortalUrl", url);
        }
        setPortalUrl(url);
    };

    return (
        <UserContext.Provider value={{
            user,
            setUser: handleSetUser,
            portalUrl,
            setPortalUrl: handleSetPortalUrl,
            isUserLoaded,
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
