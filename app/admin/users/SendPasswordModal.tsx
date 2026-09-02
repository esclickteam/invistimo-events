"use client";

import { useEffect, useState } from "react";
import { KeyRound, Link2, Loader2, X } from "lucide-react";

type PasswordLinkPurpose = "setup" | "reset";

type AdminUserLike = {
  _id: string;
  name?: string;
  email: string;
  phone?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "יש להתחבר מחדש",
  FORBIDDEN: "אין הרשאה",
  USER_NOT_FOUND: "המשתמש לא נמצא",
  INVALID_PURPOSE: "יש לבחור סוג קישור",
  MISSING_PHONE: "יש להזין מספר טלפון",
  MISSING_LINK: "חסר קישור לשליחה",
  EXTERNAL_SENDS_BLOCKED: "שליחה חיצונית חסומה בסביבה הזו",
  SERVER_ERROR: "שגיאת שרת",
};

export default function SendPasswordModal({
  user,
  onClose,
}: {
  user: AdminUserLike;
  onClose: () => void;
}) {
  const [purpose, setPurpose] = useState<PasswordLinkPurpose | null>(null);
  const [shortLink, setShortLink] = useState("");
  const [longLink, setLongLink] = useState("");
  const [phone, setPhone] = useState(user.phone || "");
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPhone(user.phone || "");
  }, [user.phone]);

  async function createLink(nextPurpose: PasswordLinkPurpose) {
    setPurpose(nextPurpose);
    setCreating(true);
    setError("");
    setSmsSent(false);
    setCopied(false);
    setShortLink("");
    setLongLink("");

    try {
      const res = await fetch(`/api/admin/users/${user._id}/password-link`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: nextPurpose }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success || !data?.shortLink) {
        throw new Error(
          ERROR_MESSAGES[data?.error] || data?.message || "יצירת הקישור נכשלה",
        );
      }

      setShortLink(String(data.shortLink));
      setLongLink(String(data.longLink || ""));
      if (data.phone && !phone) {
        setPhone(String(data.phone));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירת הקישור נכשלה");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("לא ניתן להעתיק את הקישור");
    }
  }

  async function sendSms() {
    setSending(true);
    setError("");
    setSmsSent(false);

    try {
      const res = await fetch(`/api/admin/users/${user._id}/password-link`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sms",
          purpose,
          phone,
          shortLink,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(
          ERROR_MESSAGES[data?.error] || data?.message || "שליחת ה-SMS נכשלה",
        );
      }

      setSmsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שליחת ה-SMS נכשלה");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-lg rounded-[28px] border border-[#E7D8C6] bg-white p-5 shadow-[0_24px_70px_rgba(36,25,15,0.22)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F6F1EA] text-[#6B5A48]"
          aria-label="סגירה"
        >
          <X size={18} />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF3DF] text-[#B8844F]">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#3A2A1C]">שליחת סיסמה</h2>
            <p className="text-sm font-semibold text-[#7B6754]">
              {user.name || user.email}
            </p>
          </div>
        </div>

        <p className="mb-3 text-sm font-bold text-[#6B5A48]">
          בחרו סוג קישור. הקישור המקוצר נוצר מיד ונשלח ב-SMS למספר שתזינו.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={creating}
            onClick={() => createLink("setup")}
            className={`rounded-2xl border px-4 py-4 text-right text-sm font-black transition ${
              purpose === "setup"
                ? "border-[#C9A46A] bg-[#FFF8E6] text-[#8A5A24]"
                : "border-[#E7D8C6] bg-[#FFFDF8] text-[#3A2A1C] hover:bg-[#FFF9EF]"
            }`}
          >
            הגדרת סיסמה חדשה
            <span className="mt-1 block text-xs font-semibold text-[#7B6754]">
              ללקוח שטרם הוגדרה לו סיסמה
            </span>
          </button>

          <button
            type="button"
            disabled={creating}
            onClick={() => createLink("reset")}
            className={`rounded-2xl border px-4 py-4 text-right text-sm font-black transition ${
              purpose === "reset"
                ? "border-[#C9A46A] bg-[#FFF8E6] text-[#8A5A24]"
                : "border-[#E7D8C6] bg-[#FFFDF8] text-[#3A2A1C] hover:bg-[#FFF9EF]"
            }`}
          >
            איפוס סיסמה
            <span className="mt-1 block text-xs font-semibold text-[#7B6754]">
              ללקוח ששכח את הסיסמה
            </span>
          </button>
        </div>

        {creating ? (
          <div className="mt-5 flex items-center gap-2 text-sm font-black text-[#8A5A24]">
            <Loader2 className="animate-spin" size={16} />
            יוצר קישור מקוצר...
          </div>
        ) : null}

        {shortLink ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-sky-900">
                <Link2 size={16} />
                קישור מקוצר
              </div>
              <a
                href={shortLink}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm font-bold text-sky-800 underline"
              >
                {shortLink}
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-sky-300 bg-white px-4 text-xs font-black text-sky-900"
              >
                {copied ? "הועתק" : "העתקת קישור"}
              </button>
              {longLink ? (
                <p className="mt-2 break-all text-[11px] font-semibold text-sky-800/70">
                  {longLink}
                </p>
              ) : null}
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-black text-[#3A2A1C]">
                טלפון לשליחת SMS
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0500000000"
                className="h-12 w-full rounded-2xl border border-[#E7D8C6] bg-white px-4 text-right text-sm font-bold text-[#3A2A1C] outline-none focus:border-[#C9A46A]"
              />
            </label>

            <button
              type="button"
              disabled={sending || !phone.trim()}
              onClick={sendSms}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#24190F] text-sm font-black text-white disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : null}
              שליחה ב-SMS
            </button>

            {smsSent ? (
              <p className="text-sm font-black text-emerald-700">
                ה-SMS נשלח בהצלחה
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm font-black text-red-600">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
