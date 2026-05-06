
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/lib/types';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  portalUrl: string;
  setPortalUrl: (url: string) => void;
  isUserLoaded: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [portalUrl, setPortalUrl] = useState("https://navigate.nu.edu/d2l/home");
  const [isUserLoaded, setIsUserLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("agendaUser");
      const storedPortalUrl = localStorage.getItem("studentPortalUrl");
      
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedPortalUrl) {
        setPortalUrl(storedPortalUrl);
      } else {
        // Default URL if nothing is stored
        setPortalUrl("https://navigate.nu.edu/d2l/home");
      }
    } catch (e) {
      console.error("Failed to parse user from local storage", e);
    } finally {
      setIsUserLoaded(true);
    }
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

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser: handleSetUser, 
      portalUrl, 
      setPortalUrl: handleSetPortalUrl, 
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
