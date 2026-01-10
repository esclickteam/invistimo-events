"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

/* =====================================================
   TYPES
===================================================== */
interface User {
  _id: string;
  email: string;
  name?: string;

  role: "admin" | "user";

  impersonatedByAdmin?: boolean;
  adminId?: string | null;
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
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  /* --------------------------------------------------
     UX cache בלבד – לא מקור אמת
  -------------------------------------------------- */
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;

    try {
      const cached = sessionStorage.getItem("auth_user");
      return cached ? (JSON.parse(cached) as User) : null;
    } catch {
      sessionStorage.removeItem("auth_user");
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
     🔐 מקור אמת יחיד – השרת
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

      // ❌ אין מצב חוקי בלי role
      if (nextUser && !nextUser.role) {
        console.error("❌ User without role returned from /api/me");
        setUser(null);
        sessionStorage.removeItem("auth_user");
        return null;
      }

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
     🚀 אימות ראשוני
  -------------------------------------------------- */
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------
     🔑 LOGIN – ניתוב לפי ROLE אמיתי בלבד
  -------------------------------------------------- */
  const login = async (email: string, password: string) => {
    try {
      // 🔥 ניקוי cache ישן (קריטי למובייל)
      sessionStorage.removeItem("auth_user");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאת התחברות");
      }

      // ✅ מקור אמת – טעינה מהשרת
      const nextUser = await refreshUser();

      if (!nextUser) {
        throw new Error("לא הצלחנו לטעון את פרטי המשתמש");
      }

      // 🔁 ניתוב חד־משמעי
      if (nextUser.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err.message || "שגיאה בהתחברות");
    }
  };

  /* --------------------------------------------------
     🚪 LOGOUT – ניקוי מוחלט
  -------------------------------------------------- */
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch (err) {
      console.error("❌ Logout request failed:", err);
    } finally {
      setUser(null);

      sessionStorage.removeItem("auth_user");
      sessionStorage.clear();
      localStorage.clear();

      router.replace("/login");
    }
  };

  /* --------------------------------------------------
     PROVIDER
  -------------------------------------------------- */
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
