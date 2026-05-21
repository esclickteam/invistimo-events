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
type UserRole =
  | "admin"
  | "user"
  | "producer"
  | "client"
  | "staff"
  | "producer_staff"
  | "staff_producer"
  | "venue_owner";

type StaffType = "producer_staff" | "general_staff";

type AccessModules = {
  rsvpSeating?: boolean;
  eventProduction?: boolean;

  venues?: boolean;
  venueDashboard?: boolean;
  venueCrm?: boolean;
  venueCalendar?: boolean;
  venueMenus?: boolean;
  venueStaff?: boolean;
};

interface User {
  _id: string;
  email: string;
  name?: string;

  role: UserRole;
  effectiveRole?: UserRole | "producer_staff";
  venueOwner?: boolean;

  /* ===== STAFF ===== */
  staffType?: StaffType;
  assignedProducerId?: string;

  /* ===== BUSINESS ===== */
  paidAmount: number;
  guests?: number;
  plan?: string;
  planLimits?: {
    maxGuests?: number;
    smsEnabled?: boolean;
    smsLimit?: number;
    seatingEnabled?: boolean;
    remindersEnabled?: boolean;
    maxMessages?: number;
  };

  /* ===== MODULE ACCESS ===== */
  accessModules?: AccessModules;
  includeDigitalSeating?: boolean;
  includeEventManagement?: boolean;
  selfManageEnabled?: boolean;

  // ⭐ producer only
  producerPricePerRecord?: number;

  /* ===== IMPERSONATION ===== */
  impersonated?: boolean;
  impersonatedBy?: string;
  impersonationRole?:
    | "admin"
    | "producer"
    | "producer_staff"
    | "staff_producer"
    | "venue_owner";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  exitImpersonation: () => Promise<void>;
  logout: () => Promise<void>;

  // ⭐ חשוב כדי לעדכן מייד אחרי set-password/login
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
}

/* =====================================================
   HELPERS
===================================================== */
function getUserRedirectPath(nextUser: User) {
  const role = String(nextUser.role || "").toLowerCase().trim();
  const effectiveRole = String(nextUser.effectiveRole || "")
    .toLowerCase()
    .trim();

  const isStaffLike =
    role === "staff" ||
    role === "producer_staff" ||
    role === "staff_producer" ||
    effectiveRole === "producer_staff" ||
    effectiveRole === "staff_producer";

  const isVenueOwner =
    role === "venue_owner" ||
    effectiveRole === "venue_owner" ||
    nextUser.venueOwner === true ||
    nextUser.accessModules?.venues === true ||
    nextUser.accessModules?.venueDashboard === true;

  const rsvpSeating =
    nextUser.accessModules?.rsvpSeating ??
    nextUser.includeDigitalSeating ??
    nextUser.planLimits?.seatingEnabled ??
    true;

  const eventProduction =
    nextUser.accessModules?.eventProduction ??
    nextUser.includeEventManagement ??
    nextUser.selfManageEnabled ??
    false;

  // ADMIN
  if (role === "admin" || effectiveRole === "admin") {
    return "/admin";
  }

  // VENUE OWNER
  if (isVenueOwner) {
    return "/venues/dashboard";
  }

  // PRODUCER
  if (role === "producer" || effectiveRole === "producer") {
    return "/producer/dashboard";
  }

  // PRODUCER STAFF / STAFF
  if (isStaffLike) {
    return "/producer-staff/dashboard";
  }

  // USER / CLIENT — רק הפקת אירוע
  if (eventProduction === true && rsvpSeating === false) {
    return "/events/production";
  }

  // USER / CLIENT — רגיל / שניהם
  return "/dashboard";
}

/* =====================================================
   CONTEXT
===================================================== */
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  refreshUser: async () => null,
  exitImpersonation: async () => {},
  logout: async () => {},
  setUser: () => {},
  setIsAuthenticated: () => {},
});

/* =====================================================
   PROVIDER
===================================================== */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  /* --------------------------------------------------
     UX cache בלבד – לא מקור אמת
  -------------------------------------------------- */
  const [user, _setUser] = useState<User | null>(() => {
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
  const [, setBootstrapDone] = useState(false);

  const [isAuthenticated, _setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!sessionStorage.getItem("auth_user");
  });

  // עטיפה כדי לשמור תמיד על sessionStorage מסונכרן
  const setUser = (next: User | null) => {
    _setUser(next);

    if (next) {
      sessionStorage.setItem("auth_user", JSON.stringify(next));
      _setIsAuthenticated(true);
    } else {
      sessionStorage.removeItem("auth_user");
      _setIsAuthenticated(false);
    }
  };

  const setIsAuthenticated = (value: boolean) => {
    _setIsAuthenticated(value);

    if (!value && !user) {
      sessionStorage.removeItem("auth_user");
    }
  };

  /* --------------------------------------------------
     🔐 מקור אמת יחיד – השרת
  -------------------------------------------------- */
  const refreshUser = async (): Promise<User | null> => {
    try {
      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });

      // ✅ מצב תקין: לא מחובר
      if (res.status === 401) {
        setUser(null);
        return null;
      }

      if (!res.ok) {
        console.error("❌ /api/me failed:", res.status);
        setUser(null);
        return null;
      }

      const data = await res.json();
      const nextUser: User | null = data?.user ?? null;

      if (!nextUser || !nextUser.role) {
        console.error("❌ Invalid user from /api/me");
        setUser(null);
        return null;
      }

      setUser(nextUser);
      return nextUser;
    } catch (err) {
      console.error("❌ refreshUser error:", err);
      setUser(null);
      return null;
    }
  };

  /* --------------------------------------------------
     🚀 אימות ראשוני (mount)
  -------------------------------------------------- */
  useEffect(() => {
    refreshUser().finally(() => {
      setBootstrapDone(true);
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

      // ⭐ אם השרת כבר החזיר user - מעדכנים מייד
      if (data.user) {
        setUser(data.user as User);
      }

      // אימות סופי מהשרת
      const nextUser = await refreshUser();

      if (!nextUser) {
        throw new Error("לא הצלחנו לטעון את המשתמש");
      }

      // ⛔ אם זה משתמש בתחזות – לא לנתב אוטומטית
      if (nextUser.impersonated) {
        return;
      }

      const redirectPath = getUserRedirectPath(nextUser);

      router.replace(redirectPath);
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err.message || "שגיאה בהתחברות");
      throw err;
    }
  };

  /* --------------------------------------------------
     🔁 EXIT IMPERSONATION
  -------------------------------------------------- */
  const exitImpersonation = async () => {
    try {
      const returnRole = user?.impersonationRole;

      await fetch("/api/producer/stop-impersonation", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      setUser(null); // ננקה לוקאלית לפני מעבר

      if (returnRole === "admin") {
        window.location.href = "/admin";
      } else if (returnRole === "venue_owner") {
        window.location.href = "/venues/dashboard";
      } else {
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
      router.replace("/login");
      router.refresh();
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
        isAuthenticated,
        login,
        refreshUser,
        exitImpersonation,
        logout,
        setUser,
        setIsAuthenticated,
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