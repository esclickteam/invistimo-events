"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* =====================================================
   TYPES
===================================================== */
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

/* =====================================================
   CONTEXT
===================================================== */
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

/* =====================================================
   PROVIDER
===================================================== */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // 🔥 טוען משתמש מיידית מה־sessionStorage (UX)
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = sessionStorage.getItem("auth_user");
    return cached ? JSON.parse(cached) : null;
  });

  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
     מקור אמת יחיד – אימות מול השרת
     ❗ no-store למניעת cache אחרי logout
  -------------------------------------------------- */
  const refreshUser = async () => {
    try {
      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        setUser(null);
        sessionStorage.removeItem("auth_user");
        return;
      }

      const data = await res.json();
      const nextUser = data?.user ?? null;

      setUser(nextUser);

      if (nextUser) {
        sessionStorage.setItem("auth_user", JSON.stringify(nextUser));
      } else {
        sessionStorage.removeItem("auth_user");
      }
    } catch (err) {
      console.error("❌ refreshUser error:", err);
      setUser(null);
      sessionStorage.removeItem("auth_user");
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
     טעינה ראשונית – אימות ברקע
  -------------------------------------------------- */
  useEffect(() => {
    refreshUser();
  }, []);

  /* --------------------------------------------------
     התחברות
  -------------------------------------------------- */
  const login = async (email: string, password: string) => {
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

      // 🔄 מביאים משתמש מחדש
      await refreshUser();

      router.replace("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err.message || "שגיאה בהתחברות");
    }
  };

  /* --------------------------------------------------
     התנתקות – ניקוי מלא
  -------------------------------------------------- */
  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("❌ Logout request failed:", err);
    } finally {
      // 🔥 ניקוי מיידי
      setUser(null);
      sessionStorage.removeItem("auth_user");

      router.replace("/login");
      router.refresh();
    }
  };

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

/* =====================================================
   HOOK
===================================================== */
export function useAuth() {
  return useContext(AuthContext);
}
