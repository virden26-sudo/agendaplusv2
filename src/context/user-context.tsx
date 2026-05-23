"use client";

import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import type {User} from '@/lib/types';

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    portalUrl: string;
    setPortalUrl: (url: string) => void;
    backendUrl: string;
    setBackendUrl: (url: string) => void;
    isUserLoaded: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);


export function UserProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [portalUrl, setPortalUrl] = useState("");
    const [backendUrl, setBackendUrl] = useState("");
    const [isUserLoaded, setIsUserLoaded] = useState(false);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            try {
                const storedUser = localStorage.getItem("agendaUser");
                const storedPortalUrl = localStorage.getItem("studentPortalUrl");
                const storedBackendUrl = localStorage.getItem("backendUrl");

                setUser(storedUser ? (JSON.parse(storedUser) as User) : null);
                setPortalUrl(storedPortalUrl || "");
                setBackendUrl(storedBackendUrl || "");
            } catch (error) {
                console.error("Failed to parse user from local storage", error);
                setUser(null);
                setPortalUrl("");
                setBackendUrl("");
            } finally {
                setIsUserLoaded(true);
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, []);

    const handleSetUser = (newUser: User | null) => {
        if (newUser) {
            localStorage.setItem("agendaUser", JSON.stringify(newUser));
        } else {
            localStorage.removeItem("agendaUser");
        }
        setUser(newUser);
    };

    const handleSetPortalUrl = (url: string) => {
        localStorage.setItem("studentPortalUrl", url);
        setPortalUrl(url);
    };

    const handleSetBackendUrl = (url: string) => {
        localStorage.setItem("backendUrl", url);
        setBackendUrl(url);
    };

    return (
        <UserContext.Provider value={{
            user,
            setUser: handleSetUser,
            portalUrl,
            setPortalUrl: handleSetPortalUrl,
            backendUrl,
            setBackendUrl: handleSetBackendUrl,
            isUserLoaded
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
