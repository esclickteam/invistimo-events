"use client";

import { useState, useEffect } from "react";
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

function draftKey(token: string) {
  return `set-password-draft:${token}`;
}

function formatAcceptedAt(value?: string | null) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function SetPasswordPage() {
  const { setUser, setIsAuthenticated, refreshUser } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);

  const [requireAgreement, setRequireAgreement] = useState(false);
  const [agreementSigned, setAgreementSigned] = useState(true);
  const [agreementHref, setAgreementHref] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [acceptingTerms, setAcceptingTerms] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (!tokenFromUrl) {
      setMessage("הקישור אינו תקף או חסר טוקן");
      setStatusLoading(false);
      return;
    }

    setToken(tokenFromUrl);

    try {
      const draftRaw = sessionStorage.getItem(draftKey(tokenFromUrl));
      if (draftRaw) {
        const draft = JSON.parse(draftRaw) as {
          password?: string;
          confirmPassword?: string;
        };
        setPassword(String(draft.password || ""));
        setConfirmPassword(String(draft.confirmPassword || ""));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    try {
      sessionStorage.setItem(
        draftKey(token),
        JSON.stringify({ password, confirmPassword }),
      );
    } catch {
      // ignore
    }
  }, [confirmPassword, password, token]);

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
        const signed = data.agreementSigned === true;
        const agreementUrl =
          String(data.agreementUrl || "").trim() ||
          (data.agreementToken
            ? `/sales-documents/${data.agreementToken}`
            : "");
        const next = encodeURIComponent(`/set-password?token=${token}`);
        const href = agreementUrl
          ? `${agreementUrl}${agreementUrl.includes("?") ? "&" : "?"}next=${next}`
          : "";

        setRequireAgreement(needsAgreement);
        setAgreementSigned(!needsAgreement || signed);
        setAgreementHref(href);
        if (data.termsAcceptedAt) {
          setTermsAcceptedAt(String(data.termsAcceptedAt));
        }
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

  const persistDraftAndGo = (href: string) => {
    if (token) {
      try {
        sessionStorage.setItem(
          draftKey(token),
          JSON.stringify({ password, confirmPassword }),
        );
      } catch {
        // ignore
      }
    }
    window.location.assign(href);
  };

  const handleAcceptTerms = async () => {
    if (!token) {
      setMessage("יש לאשר את התקנון ותנאי השימוש");
      return;
    }

    try {
      setAcceptingTerms(true);
      setMessage("");

      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          action: "accept-terms",
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setMessage(data?.message || "לא ניתן לשמור את אישור התקנון");
        return;
      }

      setTermsAcceptedAt(String(data.termsAcceptedAt || new Date().toISOString()));
    } catch {
      setMessage("שגיאת רשת, נסה שוב");
    } finally {
      setAcceptingTerms(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage("הקישור אינו תקף או שפג תוקפו");
      return;
    }

    if (!termsAcceptedAt) {
      setMessage("יש לאשר את התקנון ותנאי השימוש");
      return;
    }

    if (requireAgreement && !agreementSigned) {
      setMessage("יש לחתום על ההסכם לפני שמירת הסיסמה");
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
          acceptedTerms: true,
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
        }
        setMessage(data?.message || "אירעה שגיאה");
        return;
      }

      try {
        sessionStorage.removeItem(draftKey(token));
      } catch {
        // ignore
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

  const canSave =
    Boolean(termsAcceptedAt) && (!requireAgreement || agreementSigned);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-[#eadfce] bg-white p-8 text-right shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#3f3327]">
          הגדרת סיסמה
        </h1>

        {statusLoading ? (
          <p className="text-center text-sm text-gray-700">טוען...</p>
        ) : (
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

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4 text-sm text-[#5d4c3b]">
              <input
                type="checkbox"
                checked={Boolean(termsAcceptedAt)}
                disabled={loading || acceptingTerms || Boolean(termsAcceptedAt)}
                onChange={(event) => {
                  if (event.target.checked) {
                    void handleAcceptTerms();
                  }
                }}
                className="mt-1 h-4 w-4"
              />
              <span className="font-bold leading-6">
                אני מאשר/ת שקראתי את התקנון ותנאי השימוש
                {termsAcceptedAt
                  ? ` · אושר ב-${formatAcceptedAt(termsAcceptedAt)}`
                  : ""}
              </span>
            </label>

            {requireAgreement && termsAcceptedAt && !agreementSigned ? (
              <div className="space-y-3">
                <p className="text-sm font-bold leading-6 text-[#5d4c3b]">
                  יש לחתום על ההסכם. ייפתח עמוד ההסכם, ולאחר החתימה תחזרו לכאן
                  לשמירה והפעלת המשתמש.
                </p>
                {agreementHref ? (
                  <button
                    type="button"
                    onClick={() => persistDraftAndGo(agreementHref)}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#3f3327] px-4 text-sm font-black text-white"
                  >
                    חתימה על ההסכם
                  </button>
                ) : (
                  <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                    לא נמצא הסכם לחתימה. פנו לאדמין.
                  </p>
                )}
              </div>
            ) : null}

            {requireAgreement && agreementSigned && termsAcceptedAt ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                ההסכם נחתם. אפשר לשמור ולהפעיל את המשתמש.
              </div>
            ) : null}

            {canSave ? (
              <button
                type="submit"
                disabled={loading || !token}
                className={`w-full rounded-lg py-2 text-white transition ${
                  loading || !token
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-[#3f3327] hover:bg-[#2f251d]"
                }`}
              >
                {loading ? "שומר..." : "שמור סיסמה והפעל משתמש"}
              </button>
            ) : null}
          </form>
        )}

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}
