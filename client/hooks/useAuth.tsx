"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { apiClient, refreshAccessToken } from "../lib/api-client";
import { setAccessToken } from "../lib/auth-token";

interface TenantMembership {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "STAFF";
}

interface AuthUser {
  id: string;
  email: string | null;
  name: string;
  telegramId?: string | null;
  tenants: TenantMembership[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithTelegram: (payload: Record<string, unknown>) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const res = await apiClient.get("/users/me");
    setUser(res.data);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          await fetchMe();
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, [fetchMe]);

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const res = await apiClient.post("/auth/login", { email, password });
      setAccessToken(res.data.accessToken);
      await fetchMe();
    },
    [fetchMe],
  );

  const loginWithTelegram = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await apiClient.post("/auth/telegram", payload);
      setAccessToken(res.data.accessToken);
      await fetchMe();
    },
    [fetchMe],
  );

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await apiClient.post("/auth/signup", { email, password, name });
      setAccessToken(res.data.accessToken);
      await fetchMe();
    },
    [fetchMe],
  );

  const logout = useCallback(async () => {
    await apiClient.post("/auth/logout");
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithPassword, loginWithTelegram, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
