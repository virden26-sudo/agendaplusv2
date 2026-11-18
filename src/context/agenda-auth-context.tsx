"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { agendaAuth } from "@/lib/firebase";

type AuthState = {
  account: User | null;
  ready: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOutAccount: () => Promise<void>;
};

const Context = createContext<AuthState | null>(null);

export function AgendaAuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(agendaAuth(), user => {
    setAccount(user);
    setReady(true);
  }, err => {
    setError(err.message);
    setReady(true);
  }), []);

  async function signIn() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      if (Capacitor.isNativePlatform()) {
        // Firebase web redirect needs a hosted auth handler on native apps.
        // Do not silently claim native sign-in works until configured and tested.
        throw new Error("Native Google sign-in requires an Android auth redirect/deep-link configuration.");
      }
      await signInWithPopup(agendaAuth(), provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  async function signOutAccount() {
    try {
      await signOut(agendaAuth());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-out failed");
    }
  }

  return <Context.Provider value={{ account, ready, error, signIn, signOutAccount }}>{children}</Context.Provider>;
}

export function useAgendaAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("useAgendaAuth must be inside AgendaAuthProvider");
  return value;
}
