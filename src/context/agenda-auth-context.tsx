"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithCredential, signOut, type User } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
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
        const result = await FirebaseAuthentication.signInWithGoogle();
        const token = result.credential?.idToken;
        if (!token) throw new Error("Google sign-in did not return an ID token.");
        await signInWithCredential(agendaAuth(), GoogleAuthProvider.credential(token));
        return;
      }
      await signInWithPopup(agendaAuth(), provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  async function signOutAccount() {
    try {
      if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
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
