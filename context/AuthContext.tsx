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

  role: "admin" | "user" | "producer" | "client";

  // impersonation flags (מהשרת)
  impersonated?: boolean;
  impersonatedBy?: string;
  impersonationRole?: "admin" | "producer";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  exitImpersonation: () => Promise<void>;
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
  exitImpersonation: async () => {},
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

      if (nextUser && !nextUser.role) {
        console.error("❌ User without role from /api/me");
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
    }
  };

  /* --------------------------------------------------
     🚀 אימות ראשוני (mount)
  -------------------------------------------------- */
  useEffect(() => {
    refreshUser().finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------
     🔑 LOGIN
  -------------------------------------------------- */
  const login = async (email: string, password: string) => {
    try {
      sessionStorage.removeItem("auth_user");

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

      const nextUser = await refreshUser();

      if (!nextUser) {
        throw new Error("לא הצלחנו לטעון את המשתמש");
      }

      if (nextUser.role === "admin") {
  router.replace("/admin");
  router.refresh();
} else if (nextUser.role === "producer") {
  router.replace("/producer/dashboard");
  router.refresh();
} else {
  router.replace("/dashboard");
  router.refresh();
}



    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err.message || "שגיאה בהתחברות");
    }
  };

  /* --------------------------------------------------
     🔁 EXIT IMPERSONATION  (⭐ הקריטי)
  -------------------------------------------------- */
 const exitImpersonation = async () => {
  try {
    // 🔑 שומרים מאיפה הגענו לפני המחיקה
    const returnRole = user?.impersonationRole;

    await fetch("/api/auth/exit-impersonation", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    // ❗ reload מלא כדי לנקות cookies
    if (returnRole === "admin") {
      window.location.href = "/admin";
    } else {
      // ברירת מחדל: מפיק
      window.location.href = "/producer/dashboard";
    }
  } catch (err) {
    console.error("❌ exitImpersonation failed:", err);
    alert("שגיאה ביציאה ממצב התחזות");
  }
};


  /* --------------------------------------------------
     🚪 LOGOUT
  -------------------------------------------------- */
  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch (err) {
      console.error("❌ Logout request failed:", err);
    } finally {
      setUser(null);
      sessionStorage.removeItem("auth_user");
      router.replace("/login");
    }
  };

  /* --------------------------------------------------
     ⏳ Guard – לא מציג ילדים לפני אימות
  -------------------------------------------------- */
  if (loading) {
    return null; // או Spinner
  }

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
        exitImpersonation,
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
