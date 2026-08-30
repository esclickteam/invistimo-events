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

const fieldClassName =
  "w-full rounded-[18px] border border-[#DDCBB3] bg-white/90 px-4 py-3.5 text-base text-[#3E2D20] shadow-sm outline-none transition placeholder:text-[#AF9B87] focus:border-[#C9A46A] focus:ring-4 focus:ring-[#D8B16A]/15 disabled:cursor-not-allowed disabled:opacity-60";

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

      setMessage("הסיסמה הוגדרה בהצלחה. מעביר...");

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
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#F7EFE6]">
      <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_top,#fffaf4_0%,#f7efe6_42%,#efe2d2_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="pointer-events-none absolute -top-20 right-[10%] h-64 w-64 rounded-full bg-[#DAB273]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-40px] left-[8%] h-72 w-72 rounded-full bg-[#CDA37D]/15 blur-3xl" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="relative w-full max-w-[480px] overflow-hidden rounded-[34px] border border-[#D9C0A0] bg-[#FFFDF9]/94 p-6 shadow-[0_24px_70px_rgba(91,64,35,0.13)] backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.25))]" />

          <div className="relative z-10">
            <div className="mb-7 text-center">
              <img
                src="/invistimo-logo.png"
                alt="Invistimo"
                className="mx-auto h-14 w-auto object-contain"
              />
              <div className="mx-auto mt-5 h-px w-20 bg-gradient-to-l from-transparent via-[#C9A46A] to-transparent" />
              <h1 className="mt-5 text-3xl font-black text-[#3E2D20]">
                הגדרת סיסמה
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#7B6754]">
                בחרו סיסמה לחשבון. אחרי השמירה תוכלו להתחבר ולנהל את האירוע.
              </p>
            </div>

            {statusLoading ? (
              <p className="text-center text-sm text-[#7B6754]">טוען...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#4C3724]">
                    סיסמה חדשה
                  </label>
                  <input
                    type="password"
                    placeholder="לפחות 6 תווים"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || !token}
                    className={fieldClassName}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-[#4C3724]">
                    אימות סיסמה
                  </label>
                  <input
                    type="password"
                    placeholder="הקלידו שוב את הסיסמה"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading || !token}
                    className={fieldClassName}
                  />
                </div>

                <div className="flex items-start gap-3 rounded-[18px] border border-[#E8D7C2] bg-[#FFF8EE]/80 px-4 py-3.5">
                  <input
                    id="accept-terms"
                    type="checkbox"
                    checked={Boolean(termsAcceptedAt)}
                    disabled={loading || acceptingTerms || Boolean(termsAcceptedAt)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        void handleAcceptTerms();
                      }
                    }}
                    className="mt-1 h-4 w-4 accent-[#8A6338]"
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-sm leading-6 text-[#5D4C3B]"
                  >
                    אני מאשר/ת שקראתי את{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#6B4E2E] underline underline-offset-4 decoration-[#C9A46A] hover:text-[#3E2D20]"
                    >
                      התקנון ותנאי השימוש
                    </a>
                  </label>
                </div>

                {requireAgreement && termsAcceptedAt && !agreementSigned ? (
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-[#7B6754]">
                      יש לחתום על ההסכם. לאחר החתימה תחזרו לכאן לשמירת הסיסמה.
                    </p>
                    {agreementHref ? (
                      <button
                        type="button"
                        onClick={() => persistDraftAndGo(agreementHref)}
                        className="inline-flex h-12 w-full items-center justify-center rounded-[18px] bg-[#3E2D20] px-4 text-sm font-bold text-white transition hover:bg-[#2F241A]"
                      >
                        חתימה על ההסכם
                      </button>
                    ) : (
                      <p className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        לא נמצא הסכם לחתימה. פנו לאדמין.
                      </p>
                    )}
                  </div>
                ) : null}

                {canSave ? (
                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-[18px] bg-[#3E2D20] text-base font-bold text-white transition hover:bg-[#2F241A] disabled:cursor-not-allowed disabled:bg-[#C4B6A6]"
                  >
                    {loading ? "שומר..." : "שמור סיסמה והפעל משתמש"}
                  </button>
                ) : null}
              </form>
            )}

            {message ? (
              <p className="mt-5 text-center text-sm leading-6 text-[#7B6754]">
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
