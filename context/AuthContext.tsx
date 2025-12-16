"use client";

import { createContext, useContext, useEffect, useState } from "react";

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

  /* --------------------------------------------------
     טעינה ראשונית של משתמש
  -------------------------------------------------- */
  const refreshUser = async () => {
    try {
      const res = await fetch("/api/me", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();

      if (data?.user) {
        setUser(data.user);
        localStorage.setItem("authUser", JSON.stringify(data.user));
      } else {
        const stored = localStorage.getItem("authUser");
        if (stored) setUser(JSON.parse(stored));
        else setUser(null);
      }
    } catch (err) {
      console.error("❌ refreshUser error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // קודם מציג משתמש מקומי – כדי למנוע הבזק ריק
    const stored = localStorage.getItem("authUser");
    if (stored) setUser(JSON.parse(stored));

    // ואז בודק מול השרת
    refreshUser();
  }, []);

  /* --------------------------------------------------
     התחברות מלאה (login)
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

      // שמירת המשתמש וה-token מקומית
      if (data.user) {
        localStorage.setItem("authUser", JSON.stringify(data.user));
        setUser(data.user);
      }
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      // הפניה לאחר התחברות (אם תרצי)
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err.message || "שגיאה בהתחברות");
    }
  };

  /* --------------------------------------------------
     התנתקות מלאה (logout)
  -------------------------------------------------- */
  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      localStorage.removeItem("authUser");
      localStorage.removeItem("authToken");
      setUser(null);

      window.location.href = "/login";
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
