"use client";

import { useAgendaAuth } from "@/context/agenda-auth-context";

export function CloudAccountBar() {
  const { account, ready, error, signIn, signOutAccount } = useAgendaAuth();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm" role="region" aria-label="Agenda+ cloud account">
      <span>{!ready ? "Checking cloud account…" : account ? `Cloud account: ${account.email || "Signed in"}` : "Local-only mode — cloud sync not connected"}</span>
      {ready && <button type="button" className="rounded border px-3 py-1" onClick={account ? signOutAccount : signIn}>
        {account ? "Sign out" : "Sign in with Google"}
      </button>}
      {error && <p className="w-full text-red-600" role="alert">{error}</p>}
    </div>
  );
}
