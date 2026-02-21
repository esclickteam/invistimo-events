"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type ApiUserRole =
  | "admin"
  | "user"
  | "producer"
  | "client"
  | "staff"
  | "producer_staff"
  | "staff_producer";

type ApiUser = {
  _id: string;
  name?: string;
  email: string;
  role: ApiUserRole;
  hasPaid?: boolean;
  paidAmount?: number;
  staffType?: string | null;
  assignedProducerId?: string | null;
};

export default function SetPasswordPage() {
  const router = useRouter();
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

      // עדכון auth state
      if (data.user) {
        setUser(data.user as any);
        setIsAuthenticated(true);
      } else {
        const me = await refreshUser();
        if (me) {
          setUser(me as any);
          setIsAuthenticated(true);
        }
      }

      setMessage("הסיסמה הוגדרה בהצלחה 🎉 מעביר...");

      setPassword("");
      setConfirmPassword("");

      router.refresh();

      const nextPath = data.redirectTo || "/dashboard";

      console.log("✅ set-password redirect", {
        nextPath,
        role: data.user?.role,
        staffType: data.user?.staffType,
        assignedProducerId: data.user?.assignedProducerId ?? null,
        hasPaid: data.user?.hasPaid,
      });

      router.replace(nextPath);
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
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md text-right">
        <h1 className="text-2xl font-bold mb-6 text-center">הגדרת סיסמה</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="סיסמה חדשה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || !token}
            className="w-full border rounded-lg p-2"
          />

          <input
            type="password"
            placeholder="אימות סיסמה"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || !token}
            className="w-full border rounded-lg p-2"
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
            className={`w-full py-2 rounded-lg text-white transition ${
              loading || !token || !acceptedTerms
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {loading ? "שומר..." : "שמור סיסמה"}
          </button>
        </form>

        {message && (
          <p className="text-center mt-4 text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}