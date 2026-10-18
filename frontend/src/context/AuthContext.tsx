import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { apiClient, setAccessToken } from "../api/client";
import { AuthUser, Role } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithFace: (faceDescriptor: number[], email?: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      localStorage.removeItem("apexcare_auth_user");
      try {
        const res = await apiClient.post("/auth/refresh");
        if (typeof res.data?.accessToken !== "string") {
          throw new Error("The backend refresh response did not include an access token.");
        }
        setAccessToken(res.data.accessToken);
        const me = await apiClient.get("/auth/me");
        setUser(me.data.user);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const cleanEmail = email.toLowerCase().trim();
    setAccessToken(null);
    const res = await apiClient.post("/auth/login", { email: cleanEmail, password });
    if (typeof res.data?.accessToken !== "string") {
      throw new Error("The backend login response did not include an access token.");
    }

    setAccessToken(res.data.accessToken);
    try {
      const me = await apiClient.get("/auth/me");
      setUser(me.data.user);
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const loginWithFace = useCallback(async (faceDescriptor: number[], email?: string) => {
    setAccessToken(null);
    const cleanEmail = email ? email.toLowerCase().trim() : undefined;
    const res = await apiClient.post("/auth/face-login", { faceDescriptor, email: cleanEmail });
    if (typeof res.data?.accessToken !== "string") {
      throw new Error("The backend face login response did not include an access token.");
    }

    setAccessToken(res.data.accessToken);
    try {
      const me = await apiClient.get("/auth/me");
      setUser(me.data.user);
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      throw error;
    }
  }, []);

  const register = useCallback(async (data: Record<string, unknown>) => {
    const email = typeof data.email === "string" ? data.email.toLowerCase().trim() : data.email;
    await apiClient.post("/auth/register", { ...data, email });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithFace, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function hasRole(user: AuthUser | null, ...roles: Role[]) {
  return !!user && roles.includes(user.role);
}
