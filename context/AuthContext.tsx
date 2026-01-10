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

  // ✅ role חובה – אין משתמש בלי role
  role: "admin" | "user";

  // 👑 תמיכה בהתחזות אדמין (אם קיים)
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
     UX: טעינה מיידית מ־sessionStorage
     ⚠️ לא מקור אמת – רק UX
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
     🔐 מקור אמת יחיד – אימות מול השרת
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

      console.log("🟦 AUTH USER FROM SERVER:", {
        email: nextUser?.email,
        role: nextUser?.role,
      });

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
     🚀 טעינה ראשונית – אימות ברקע
  -------------------------------------------------- */
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------------------------------
     🔑 התחברות + ניתוב לפי role אמיתי
  -------------------------------------------------- */
  const login = async (email: string, password: string) => {
    try {
      // ✅ ניקוי cache ישן (קריטי למובייל)
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

      // ✅ טעינה מחדש מהשרת – מקור אמת
      const nextUser = await refreshUser();

      console.log("✅ LOGIN SUCCESS:", nextUser);

      if (!nextUser) {
        alert("לא הצלחנו לטעון את פרטי המשתמש");
        return;
      }

      // ✅ ניתוב קשיח לפי ROLE
      if (nextUser.role === "admin") {
        console.log("👑 Redirect → /admin");
        router.replace("/admin");
      } else {
        console.log("👤 Redirect → /dashboard");
        router.replace("/dashboard");
      }

      router.refresh();
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err.message || "שגיאה בהתחברות");
    }
  };

  /* --------------------------------------------------
     🚪 התנתקות – ניקוי מלא + מחיקת cookies
  -------------------------------------------------- */
  const logout = async () => {
    try {
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
      setUser(null);

      sessionStorage.removeItem("auth_user");
      sessionStorage.clear();
      localStorage.clear();

      router.replace("/login");
      router.refresh();
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
