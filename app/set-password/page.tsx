"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type ApiUserRole =
  | "admin"
  | "user"
  | "producer"
  | "client"
  | "staff"
  | "producer_staff"
  | "staff_producer"
  | "venue_owner";

type ApiUser = {
  _id: string;
  name?: string;
  email: string;
  role: ApiUserRole;
  hasPaid?: boolean;
  paidAmount?: number;
  staffType?: string | null;
  assignedProducerId?: string | null;
  accessModules?: {
    rsvpSeating?: boolean;
    eventProduction?: boolean;
    venueDashboard?: boolean;
  };
  includeDigitalSeating?: boolean;
  includeEventManagement?: boolean;
  selfManageEnabled?: boolean;
};

function getRedirectPath(user?: ApiUser | null, redirectTo?: string) {
  if (redirectTo) return redirectTo;

  if (user?.role === "venue_owner") {
    return "/venues/dashboard";
  }

  if (user?.role === "producer") {
    return "/producer/dashboard";
  }

  if (
    user?.role === "staff" ||
    user?.role === "producer_staff" ||
    user?.role === "staff_producer"
  ) {
    return "/producer-staff/dashboard";
  }

  if (user?.role === "admin") {
    return "/admin";
  }

  return "/dashboard";
}

export default function SetPasswordPage() {
  const { setUser, setIsAuthenticated, refreshUser } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
     Get token from URL
  ========================= */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (!tokenFromUrl) {
      setMessage("הקישור אינו תקף או חסר טוקן");
      return;
    }

    setToken(tokenFromUrl);
  }, []);

  /* =========================
     Submit
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage("הקישור אינו תקף או שפג תוקפו");
      return;
    }

    if (!password || !confirmPassword) {
      setMessage("אנא מלא את כל השדות");
      return;
    }

    if (password.length < 6) {
      setMessage("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("הסיסמאות אינן תואמות");
      return;
    }

    if (!acceptedTerms) {
      setMessage("יש לאשר את תקנון השימוש ומדיניות הפרטיות");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data: {
        success?: boolean;
        message?: string;
        user?: ApiUser;
        redirectTo?: string;
      } = await res.json();

      if (!res.ok || !data?.success) {
        setMessage(data?.message || "אירעה שגיאה");
        return;
      }

      /*
        השרת יוצר authToken.
        כאן מעדכנים state מקומית, ואז עושים מעבר מלא
        כדי שה-cookie החדש ייקלט בוודאות.
      */
      let resolvedUser: ApiUser | null = data.user || null;

      if (resolvedUser) {
        setUser(resolvedUser as any);
        setIsAuthenticated(true);
      } else {
        const me = await refreshUser();

        if (me) {
          resolvedUser = me as ApiUser;
          setUser(me as any);
          setIsAuthenticated(true);
        }
      }

      setMessage("הסיסמה הוגדרה בהצלחה 🎉 מעביר...");

      setPassword("");
      setConfirmPassword("");

      const nextPath = getRedirectPath(resolvedUser, data.redirectTo);

      console.log("✅ set-password redirect", {
        nextPath,
        role: resolvedUser?.role,
        staffType: resolvedUser?.staffType,
        assignedProducerId: resolvedUser?.assignedProducerId ?? null,
        hasPaid: resolvedUser?.hasPaid,
        accessModules: resolvedUser?.accessModules,
      });

      window.location.href = nextPath;
    } catch (err) {
      console.error("❌ set-password frontend error:", err);
      setMessage("שגיאת רשת, נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-[#eadfce] bg-white p-8 text-right shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#3f3327]">
          הגדרת סיסמה
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="סיסמה חדשה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !token}
            className="w-full rounded-lg border p-2 text-right"
          />

          <input
            type="password"
            placeholder="אימות סיסמה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || !token}
            className="w-full rounded-lg border p-2 text-right"
          />

          {/* תנאי שימוש */}
          <div className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4"
            />

            <span>
              הנני מאשר/ת את{" "}
              <Link href="/terms" className="underline">
                תקנון השימוש
              </Link>{" "}
              ו{" "}
              <Link href="/privacy" className="underline">
                מדיניות הפרטיות
              </Link>
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !token || !acceptedTerms}
            className={`w-full rounded-lg py-2 text-white transition ${
              loading || !token || !acceptedTerms
                ? "cursor-not-allowed bg-gray-400"
                : "bg-[#3f3327] hover:bg-[#2f251d]"
            }`}
          >
            {loading ? "שומר..." : "שמור סיסמה"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}