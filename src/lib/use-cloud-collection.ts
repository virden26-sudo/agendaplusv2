"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useAgendaAuth } from "@/context/agenda-auth-context";
import { agendaFirestore } from "@/lib/firebase";

/**
 * Syncs a collection-shaped local state to a user-owned Firestore document.
 * Keeps existing local data on first sign-in, never writes before remote load,
 * and avoids writing remote snapshots straight back to the server.
 * Conflict policy: last successful document write wins for concurrent edits.
 */
export function useCloudCollection<T extends { id?: string }>(
  key: "assignments" | "tasks" | "grades" | "quizzes",
  items: T[],
  setItems: Dispatch<SetStateAction<T[]>>,
  initialized: boolean,
  revive: (value: T) => T = value => value
) {
  const { account } = useAgendaAuth();
  const current = useRef(items);
  const ready = useRef(false);
  const suppress = useRef<string | null>(null);
  const lastSent = useRef<string | null>(null);
  current.current = items;
  const reviveRef = useRef(revive);
  reviveRef.current = revive;

  useEffect(() => {
    ready.current = false;
    suppress.current = null;
    lastSent.current = null;
    if (!account || !initialized) return;

    const target = doc(agendaFirestore(), "users", account.uid, "data", key);
    const unsubscribe = onSnapshot(target, snapshot => {
      const remote = snapshot.exists() && Array.isArray(snapshot.data().items)
        ? (snapshot.data().items as T[]).map(value => reviveRef.current(value))
        : [];
      if (!ready.current) {
        // Initial migration: preserve all records from both sources.
        // Remote records win if the same ID exists on both devices.
        const combined = new Map(current.current.map(item => [item.id || JSON.stringify(item), item]));
        for (const item of remote) combined.set(item.id || JSON.stringify(item), item);
        const merged = [...combined.values()];
        const serialized = JSON.stringify(merged);
        suppress.current = serialized;
        ready.current = true;
        setItems(merged);
        if (JSON.stringify(remote) !== serialized) {
          lastSent.current = serialized;
          void setDoc(target, { items: JSON.parse(serialized), updatedAt: Date.now() })
            .catch(error => console.error(`Agenda+ ${key} migration failed`, error));
        }
        return;
      }
      if (snapshot.metadata.hasPendingWrites) return;
      const serialized = JSON.stringify(remote);
      if (serialized === lastSent.current) return;
      suppress.current = serialized;
      setItems(remote);
    }, error => console.error(`Agenda+ ${key} cloud listener failed`, error));
    return () => { unsubscribe(); ready.current = false; };
  }, [account?.uid, initialized, key, setItems]);

  useEffect(() => {
    if (!account || !initialized || !ready.current) return;
    const serialized = JSON.stringify(items);
    if (serialized === suppress.current) {
      suppress.current = null;
      return;
    }
    if (serialized === lastSent.current) return;
    lastSent.current = serialized;
    const target = doc(agendaFirestore(), "users", account.uid, "data", key);
    void setDoc(target, { items: JSON.parse(serialized), updatedAt: Date.now() })
      .catch(error => console.error(`Agenda+ ${key} cloud write failed`, error));
  }, [account?.uid, initialized, items, key]);
}
