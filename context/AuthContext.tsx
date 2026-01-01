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
  role?: "admin" | "user";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

/* =====================================================
   CONTEXT
===================================================== */
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  refreshUser: async () => null,
  logout: async () => {},
});

/* =====================================================
   PROVIDER
===================================================== */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  /* --------------------------------------------------
     טעינה מיידית מ-sessionStorage (UX)
  -------------------------------------------------- */
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = sessionStorage.getItem("auth_user");
    return cached ? JSON.parse(cached) : null;
  });

  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
     מקור אמת יחיד – אימות מול השרת
  -------------------------------------------------- */
  const refreshUser = async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        setUser(null);
        sessionStorage.removeItem("auth_user");
        return null;
      }

      const data = await res.json();
      const nextUser: User | null = data?.user ?? null;

      setUser(nextUser);

      if (nextUser) {
        sessionStorage.setItem("auth_user", JSON.stringify(nextUser));
      } else {
        sessionStorage.removeItem("auth_user");
      }

      return nextUser;
    } catch (err) {
      console.error("❌ refreshUser error:", err);
      setUser(null);
      sessionStorage.removeItem("auth_user");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
     טעינה ראשונית – אימות ברקע
  -------------------------------------------------- */
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------
     התחברות + ניתוב לפי role
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
      const nextUser = await refreshUser();

      // 🧭 ניתוב חכם לפי role
      if (nextUser?.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }

      router.refresh();
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err.message || "שגיאה בהתחברות");
    }
  };

  /* --------------------------------------------------
     התנתקות – ניקוי מלא + מחיקת cookies בשרת
  -------------------------------------------------- */
  const logout = async () => {
    try {
      // ✅ קריאה ל־API שמוחק cookies בפועל
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("❌ Logout request failed:", err);
    } finally {
      // ✅ ניקוי מלא בצד לקוח
      setUser(null);

      // מוחק את ה־cache של המשתמש ששמרת ל-UX
      sessionStorage.removeItem("auth_user");

      // אם יש דברים שנשמרו בפרויקט (כמו role / flags / cached data)
      localStorage.clear();
      sessionStorage.clear();

      // ✅ הפניה להתחברות
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
