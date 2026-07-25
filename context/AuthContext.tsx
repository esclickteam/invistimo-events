"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearClientReadableAuthCookies } from "@/lib/auth/clearAuthCookies";

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
  | "system_staff"
  | "venue_owner";

type StaffType = "producer_staff" | "general_staff" | string;

type EmployeeScope = "system" | "producer" | "venue" | "client" | string;

type AccessModules = {
  rsvpSeating?: boolean;
  eventProduction?: boolean;

  venues?: boolean;
  venueDashboard?: boolean;
  venueCrm?: boolean;
  venueCalendar?: boolean;
  venueMenus?: boolean;
  venueStaff?: boolean;

  liveDashboard?: boolean;
  actualArrivals?: boolean;
};

interface User {
  _id: string;
  email: string;
  name?: string;

  role: UserRole;
  effectiveRole?: UserRole | "producer_staff" | "system_staff";
  venueOwner?: boolean;

  /* ===== STAFF ===== */
  staffType?: StaffType | null;
  employeeScope?: EmployeeScope | null;
  assignedProducerId?: string | null;
  producerId?: string | null;
  createdByProducer?: string | null;
  isProducerStaff?: boolean;
  isSystemStaff?: boolean;

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
    liveDashboard?: boolean;
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
  impersonatedByAdmin?: boolean;
  adminId?: string;

  /*
    התפקיד שאליו מתחזים:
    staff / producer_staff / producer / venue_owner / user וכו׳
  */
  impersonationRole?:
    | "admin"
    | "producer"
    | "producer_staff"
    | "staff"
    | "staff_producer"
    | "system_staff"
    | "venue_owner"
    | "user"
    | "client";

  originalTargetRole?:
    | "admin"
    | "producer"
    | "producer_staff"
    | "staff"
    | "staff_producer"
    | "system_staff"
    | "venue_owner"
    | "user"
    | "client";

  /*
    מי התחיל את ההתחזות:
    admin / producer / venue_owner
  */
  impersonationSourceRole?: "admin" | "producer" | "venue_owner" | string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  exitImpersonation: () => Promise<void>;
  logout: () => Promise<void>;

  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
}

/* =====================================================
   HELPERS
===================================================== */
function cleanRole(value: unknown) {
  return String(value || "").toLowerCase().trim();
}

function isAuthEntryPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/login/")
  );
}

export function getUserRedirectPath(nextUser: User) {
  const role = cleanRole(nextUser.role);
  const effectiveRole = cleanRole(nextUser.effectiveRole);
  const impersonationRole = cleanRole(nextUser.impersonationRole);
  const originalTargetRole = cleanRole(nextUser.originalTargetRole);

  const staffType = cleanRole(nextUser.staffType);
  const employeeScope = cleanRole(nextUser.employeeScope);

  /*
    במצב התחזות נעדיף את התפקיד שאליו התחזינו,
    אבל נשאיר fallback ל-role הרגיל.
  */
  const targetRole =
    originalTargetRole ||
    impersonationRole ||
    effectiveRole ||
    role ||
    "user";

  const isSystemStaff =
    targetRole === "system_staff" ||
    effectiveRole === "system_staff" ||
    nextUser.isSystemStaff === true ||
    role === "system_staff" ||
    (
      role === "staff" &&
      staffType !== "producer_staff" &&
      employeeScope !== "producer"
    ) ||
    (
      role === "staff" &&
      staffType === "general_staff"
    );

  const isProducerStaff =
    targetRole === "producer_staff" ||
    targetRole === "staff_producer" ||
    effectiveRole === "producer_staff" ||
    effectiveRole === "staff_producer" ||
    nextUser.isProducerStaff === true ||
    role === "producer_staff" ||
    role === "staff_producer" ||
    (
      role === "staff" &&
      staffType === "producer_staff"
    ) ||
    (
      role === "staff" &&
      employeeScope === "producer"
    );

  const isVenueOwner =
    targetRole === "venue_owner" ||
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
  if (targetRole === "admin" || role === "admin" || effectiveRole === "admin") {
    return "/admin";
  }

  // SYSTEM STAFF — עובד מערכת כללי של Invistimo
  if (isSystemStaff) {
    return "/staff/dashboard";
  }

  // VENUE OWNER
  if (isVenueOwner) {
    return "/venues/dashboard";
  }

  // PRODUCER
  if (targetRole === "producer" || role === "producer" || effectiveRole === "producer") {
    return "/producer/dashboard";
  }

  // PRODUCER STAFF
  if (isProducerStaff) {
    return "/producer-staff/dashboard";
  }

  // USER / CLIENT — רק הפקת אירוע
  if (eventProduction === true && rsvpSeating === false) {
    return "/events/production";
  }

  // USER / CLIENT — רגיל / שניהם
  return "/dashboard";
}

function getExitImpersonationRedirectPath(currentUser: User | null) {
  const sourceRole = cleanRole(currentUser?.impersonationSourceRole);
  const returnRole = cleanRole(currentUser?.impersonationRole);

  if (
    currentUser?.impersonatedByAdmin === true ||
    sourceRole === "admin"
  ) {
    return "/admin";
  }

  if (sourceRole === "venue_owner" || returnRole === "venue_owner") {
    return "/venues/dashboard";
  }

  if (sourceRole === "producer" || returnRole === "producer") {
    return "/producer/dashboard";
  }

  return "/admin";
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
  const pathname = usePathname();

  /* --------------------------------------------------
     UX cache בלבד – לא מקור אמת.
     Start null on server AND client to avoid hydration mismatch
     (sessionStorage is only available in the browser).
  -------------------------------------------------- */
  const [user, _setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);
  const [bootstrapDone, setBootstrapDone] = useState(false);

  const [isAuthenticated, _setIsAuthenticated] = useState(false);

  const setUser = (next: User | null) => {
    _setUser(next);

    if (typeof window === "undefined") return;

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

    if (typeof window === "undefined") return;

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

      if (res.status === 401) {
        setUser(null);
        return null;
      }

      if (!res.ok) {
        console.error("❌ /api/me failed:", res.status);
        setUser(null);
        return null;
      }

      const data = await res.json().catch(() => ({}));
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
     🚀 אימות ראשוני + שחזור cache אחרי mount בלבד
  -------------------------------------------------- */
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("auth_user");
      if (cached) {
        const parsed = JSON.parse(cached) as User;
        if (parsed?.role) {
          _setUser(parsed);
          _setIsAuthenticated(true);
        }
      }
    } catch {
      sessionStorage.removeItem("auth_user");
    }

    refreshUser().finally(() => {
      setBootstrapDone(true);
      setLoading(false);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shouldRedirectFromAuthEntry =
    bootstrapDone &&
    !!user &&
    isAuthEntryPath(pathname);

  /* --------------------------------------------------
     🔁 Auto-redirect logged-in users away from home/login
  -------------------------------------------------- */
  useEffect(() => {
    if (!shouldRedirectFromAuthEntry || !user) return;

    const redirectPath = getUserRedirectPath(user);
    window.location.replace(redirectPath);
  }, [shouldRedirectFromAuthEntry, user, router]);

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
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאת התחברות");
      }

      if (data.user) {
        setUser(data.user as User);
      }

      // Prefer fresh session from cookie; fall back to login payload (Safari race)
      const nextUser = (await refreshUser()) || (data.user as User | undefined);

      if (!nextUser?.role) {
        throw new Error("לא הצלחנו לטעון את המשתמש");
      }

      setUser(nextUser);

      const redirectPath = getUserRedirectPath(nextUser);

      // Full navigation so Safari/iPad reliably sends the new auth cookies
      window.location.replace(redirectPath);
    } catch (err: any) {
      console.error("❌ Login failed:", err);
      alert(err?.message || "שגיאה בהתחברות");
      throw err;
    }
  };

  /* --------------------------------------------------
     🔁 EXIT IMPERSONATION
  -------------------------------------------------- */
  const exitImpersonation = async () => {
    try {
      const redirectPath = getExitImpersonationRedirectPath(user);

      await fetch("/api/producer/stop-impersonation", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      setUser(null);

      window.location.href = redirectPath;
    } catch (err) {
      console.error("❌ exitImpersonation failed:", err);
      alert("שגיאה ביציאה ממצב התחזות");
    }
  };

  /* --------------------------------------------------
     🚪 LOGOUT
  -------------------------------------------------- */
  const logout = async () => {
    clearClientReadableAuthCookies();

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("auth_user");
    }

    setUser(null);
    window.location.href = "/api/logout";
  };

  /* --------------------------------------------------
     ⏳ Guard — never unmount the whole tree on bootstrap.
     Returning null remounts every page and restarts fetch loops.
  -------------------------------------------------- */
  if (shouldRedirectFromAuthEntry) {
    return (
      <AuthContext.Provider
        value={{
          user,
          loading: true,
          isAuthenticated,
          login,
          refreshUser,
          exitImpersonation,
          logout,
          setUser,
          setIsAuthenticated,
        }}
      >
        <div className="flex min-h-screen items-center justify-center text-sm text-[#7C6A58]">
          מעביר לדשבורד…
        </div>
      </AuthContext.Provider>
    );
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