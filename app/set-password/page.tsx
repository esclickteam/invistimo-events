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

  const [requireAgreement, setRequireAgreement] = useState(false);
  const [agreementSigned, setAgreementSigned] = useState(true);
  const [agreementToken, setAgreementToken] = useState("");
  const [agreementUrl, setAgreementUrl] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (!tokenFromUrl) {
      setMessage("הקישור אינו תקף או חסר טוקן");
      setStatusLoading(false);
      return;
    }

    setToken(tokenFromUrl);
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch(
          `/api/auth/set-password?token=${encodeURIComponent(token || "")}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );
        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok || !data?.success) {
          setMessage(data?.message || "הקישור אינו תקף או שפג תוקפו");
          return;
        }

        const needsAgreement = Boolean(data.requireAgreementBeforePassword);
        const signed = data.agreementSigned !== false;

        setRequireAgreement(needsAgreement);
        setAgreementSigned(!needsAgreement || signed);
        setAgreementToken(String(data.agreementToken || ""));
        setAgreementUrl(String(data.agreementUrl || ""));
        setMessage("");
      } catch {
        if (!cancelled) {
          setMessage("שגיאת רשת, נסה שוב");
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!requireAgreement || agreementSigned) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "invistimo-agreement-signed") return;
      setAgreementSigned(true);
      setMessage("ההסכם נחתם. אפשר להמשיך להגדרת סיסמה.");
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [agreementSigned, requireAgreement]);

  useEffect(() => {
    if (!token || !requireAgreement || agreementSigned) return;

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(
          `/api/auth/set-password?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          },
        );
        const data = await res.json().catch(() => null);

        if (res.ok && data?.success && data.agreementSigned) {
          setAgreementSigned(true);
          setMessage("ההסכם נחתם. אפשר להמשיך להגדרת סיסמה.");
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [agreementSigned, requireAgreement, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage("הקישור אינו תקף או שפג תוקפו");
      return;
    }

    if (requireAgreement && !agreementSigned) {
      setMessage("יש לחתום על ההסכם לפני הגדרת הסיסמה");
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
        requireAgreementBeforePassword?: boolean;
        agreementUrl?: string;
      } = await res.json();

      if (!res.ok || !data?.success) {
        if (data?.requireAgreementBeforePassword) {
          setRequireAgreement(true);
          setAgreementSigned(false);
          setAgreementUrl(String(data.agreementUrl || agreementUrl));
        }
        setMessage(data?.message || "אירעה שגיאה");
        return;
      }

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

      window.location.href = nextPath;
    } catch (err) {
      console.error("❌ set-password frontend error:", err);
      setMessage("שגיאת רשת, נסה שוב");
    } finally {
      setLoading(false);
    }
  };

  const showPasswordForm = !statusLoading && (!requireAgreement || agreementSigned);
  const agreementSrc =
    agreementUrl ||
    (agreementToken ? `/sales-documents/${agreementToken}` : "");
  const agreementSrcWithReturn =
    agreementSrc && token
      ? `${agreementSrc}${agreementSrc.includes("?") ? "&" : "?"}next=${encodeURIComponent(`/set-password?token=${token}`)}`
      : agreementSrc;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-4xl rounded-xl border border-[#eadfce] bg-white p-8 text-right shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#3f3327]">
          {showPasswordForm ? "הגדרת סיסמה" : "חתימה על ההסכם לפני הגדרת סיסמה"}
        </h1>

        {statusLoading ? (
          <p className="text-center text-sm text-gray-700">טוען...</p>
        ) : null}

        {!statusLoading && requireAgreement && !agreementSigned ? (
          <div className="mb-6 space-y-4">
            <p className="text-sm font-bold leading-6 text-[#5d4c3b]">
              לפני הגדרת הסיסמה יש לקרוא את ההסכם ולחתום עליו. לאחר החתימה ייפתח
              טופס הגדרת הסיסמה.
            </p>

            {agreementSrcWithReturn ? (
              <>
                <iframe
                  title="הסכם לחתימה"
                  src={agreementSrcWithReturn}
                  className="h-[70vh] w-full rounded-2xl border border-[#eadfce] bg-white"
                />
                <a
                  href={agreementSrcWithReturn}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-bold underline"
                >
                  פתיחת ההסכם בחלון חדש
                </a>
              </>
            ) : (
              <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                לא נמצא הסכם לחתימה. פנו לאדמין.
              </p>
            )}
          </div>
        ) : null}

        {showPasswordForm ? (
          <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4">
            {requireAgreement && agreementSigned ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                ההסכם נחתם. אפשר להגדיר סיסמה.
              </div>
            ) : null}

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
        ) : null}

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}
