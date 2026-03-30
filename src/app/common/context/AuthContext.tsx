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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const res = await fetch(resolveApiUrl("/refresh"), { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const fetchMe = async () => {
    try {
      const res = await fetch(resolveApiUrl("/me"));
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
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
