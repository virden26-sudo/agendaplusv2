"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase web configuration is public project identification, not a server credential.
// Firestore Security Rules must enforce per-user authorization.
const firebaseConfig = {
  apiKey: "AIzaSyAMnkzO0I0oJiQNWhvt4pTTEP4GHCsswGE",
  authDomain: "agenda-v2-94336.firebaseapp.com",
  projectId: "agenda-v2-94336",
  storageBucket: "agenda-v2-94336.firebasestorage.app",
  messagingSenderId: "86602623939",
  appId: "1:86602623939:web:d84e09c04bafbc68912b76",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export function agendaAuth(): Auth {
  return getAuth(firebaseApp);
}

export function agendaFirestore(): Firestore {
  return getFirestore(firebaseApp);
}
