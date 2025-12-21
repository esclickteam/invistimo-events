"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /* --------------------------------------------------
     מקור אמת יחיד – מי המשתמש כרגע
     ❗️ no-store כדי למנוע cache אחרי logout
  -------------------------------------------------- */
  const refreshUser = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store", // 🔥 קריטי
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data?.user ?? null);
    } catch (err) {
      console.error("❌ refreshUser error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
     טעינה ראשונית
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

      // 🔥 מבקשים משתמש מחדש מהשרת
      await refreshUser();

      // 🔄 ריענון App Router כדי שלא יישאר state ישן
      router.replace("/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err.message || "שגיאה בהתחברות");
    }
  };

  /* --------------------------------------------------
     התנתקות (החלק שהיה חסר!)
  -------------------------------------------------- */
  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      // 🔥 ניקוי state מקומי
      setUser(null);

      // 🔥 רענון מלא של ה-App Router
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("❌ Logout failed:", err);
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

export function useAuth() {
  return useContext(AuthContext);
}
