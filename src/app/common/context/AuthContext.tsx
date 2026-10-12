"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { resolveApiUrl } from "@/common/helpers/api";

type User = {
  id: string;
  username: string;
  email?: string;
  name?: string;
  imageUrl?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isSameUser = (a: User | null, b: User | null) =>
  a?.id === b?.id && a?.username === b?.username && a?.email === b?.email && a?.name === b?.name && a?.imageUrl === b?.imageUrl;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch(resolveApiUrl("/me"));
      if (res.ok) {
        const data: User = await res.json();
        // Keep the same object while nothing changed. This runs every 30 seconds, and a new object
        // each time re-ran every effect that depends on the user, including the player's restore
        setUser((prev) => (isSameUser(prev, data) ? prev : data));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Renews the session cookie. The response carries the session payload, not a user record, so it
  // is not stored as the user; the regular /me poll keeps that current
  const refreshSession = async () => {
    try {
      const res = await fetch(resolveApiUrl("/refresh"), { method: "POST" });
      if (!res.ok) {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchMe();

    const polling = setInterval(async () => {
      await fetchMe();
    }, 1000 * 30);

    const refreshTimer = setInterval(async () => {
      await refreshSession();
    }, 1000 * 60 * 25);

    return () => {
      clearInterval(polling);
      clearInterval(refreshTimer);
    };
  }, []);


  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
