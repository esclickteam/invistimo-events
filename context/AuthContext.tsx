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
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- טוען משתמש על פי cookie ---
  const refreshUser = async () => {
    try {
      const res = await fetch("/api/me", {
        method: "GET",
        credentials: "include",
      });

      const data = await res.json();
      setUser(data.user || null);
    } catch (err) {
      console.error("❌ refreshUser error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // מפעיל טעינת משתמש בתחילת האפליקציה
  useEffect(() => {
    refreshUser();
  }, []);

  // --- התנתקות מלאה ---
  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);

      // הפניה לדף התחברות
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
