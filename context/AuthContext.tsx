"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

interface User {
  _id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* ===============================
     טעינת משתמש (פעם אחת)
  =============================== */
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", {
        credentials: "include",
      });

      const data = await res.json();

      if (data?.user) {
        setUser(data.user);
        localStorage.setItem("authUser", JSON.stringify(data.user));
      } else {
        setUser(null);
        localStorage.removeItem("authUser");
      }
    } catch (err) {
      console.error("❌ refreshUser error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ===============================
     init – ריצה אחת בלבד
  =============================== */
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  /* ===============================
     login
  =============================== */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "שגיאת התחברות");
        }

        if (data.user) {
          setUser(data.user);
          localStorage.setItem("authUser", JSON.stringify(data.user));
        }

        router.push("/dashboard");
      } catch (err: any) {
        console.error("❌ Login failed:", err);
        alert(err.message || "שגיאה בהתחברות");
      }
    },
    [router]
  );

  /* ===============================
     logout
  =============================== */
  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      localStorage.removeItem("authUser");

      router.push("/login");
    } catch (err) {
      console.error("❌ Logout failed:", err);
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
