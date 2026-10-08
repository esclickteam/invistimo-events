"use client";

import { useEffect, useState } from "react";

type AudienceFilter = "never_invited" | "failed" | "not_sent" | "all";

type Props = {
  userId: string;
  invitationId?: string | null;
};

export default function AdminInvitationOnlyPanel({
  userId,
  invitationId,
}: Props) {
  const [filter, setFilter] = useState<AudienceFilter>("never_invited");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [totalGuests, setTotalGuests] = useState(0);
  const [neverInvitedCount, setNeverInvitedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [notSentCount, setNotSentCount] = useState(0);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const phoneMode = phone.replace(/\D/g, "").length >= 9;

  async function loadCounts() {
    if (!userId) return;

    try {
      setLoadingCounts(true);
      const params = new URLSearchParams();
      if (invitationId) params.set("invitationId", invitationId);

      const res = await fetch(
        `/api/admin/users/${userId}/send-invitation-only?${params.toString()}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        return;
      }

      setTotalGuests(Number(data?.totalGuests || 0));
      setNeverInvitedCount(Number(data?.neverInvitedCount || 0));
      setFailedCount(Number(data?.failedCount || 0));
      setNotSentCount(Number(data?.notSentCount || 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCounts(false);
    }
  }

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, invitationId]);

  async function sendInvitationOnly() {
    if (!invitationId) {
      alert("לא נמצאה הזמנה למשתמש הזה");
      return;
    }

    const audienceLabel = phoneMode
      ? `למספר ${phone.trim()} בלבד`
      : filter === "never_invited"
        ? "למי שלא נשלחה לו הזמנה מהמערכת"
        : filter === "failed"
          ? "למי שנכשלה לו שליחת ההזמנה בדוח הסבבים"
          : filter === "not_sent"
            ? "למי שלא נשלחה לו ההזמנה בדוח הסבבים"
            : "לכל המוזמנים (כולל שליחה חוזרת)";

    const candidatesLabel = phoneMode
      ? ""
      : filter === "never_invited"
        ? `מועמדים: ${neverInvitedCount}\n\n`
        : filter === "failed"
          ? `מועמדים: ${failedCount}\n\n`
          : filter === "not_sent"
            ? `מועמדים: ${notSentCount}\n\n`
            : `מועמדים: ${totalGuests}\n\n`;

    const confirmText =
      `לשלוח הזמנה בלבד (ללא אישור הגעה)?\n\n` +
      `קהל: ${audienceLabel}\n` +
      candidatesLabel +
      "הפעולה לא פותחת סבב אישורי הגעה ולא משנה סטטוס אורח.";

    if (!confirm(confirmText)) return;

    try {
      setSending(true);
      setStatus(null);

      const res = await fetch(
        `/api/admin/users/${userId}/send-invitation-only`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitationId,
            filter: phoneMode ? "all" : filter,
            phone: phoneMode ? phone.trim() : undefined,
            allowResend: true,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "שליחת ההזמנה נכשלה"
        );
      }

      setStatus({
        type: "success",
        text: `הזמנה בלבד נוספה לתור · ${data?.queuedCount || 0} אורחים`,
      });
      await loadCounts();
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: "error",
        text: err?.message || "שגיאה בשליחת הזמנה בלבד",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="
        rounded-2xl
        border border-[#EFE2D1]
        bg-[#FFFDF8]
        p-4
      "
    >
      <div className="mb-3">
        <div className="font-black text-[#3A2A1C]">הזמנה בלבד</div>
        <div className="mt-1 text-xs font-bold text-[#8A7867]">
          שליחה מחדש של ההזמנה עצמה — בלי סבב אישורי הגעה ובלי שינוי סטטוס אורח.
          אפשר לשלוח למספר בודד (כמו אישורי הגעה) או לפי דוח סבבי WhatsApp.
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-black text-[#3A2A1C]">
          מספר טלפון (אופציונלי — שולח רק אליו)
        </label>
        <input
          type="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05xxxxxxxx"
          className="w-full rounded-xl border border-[#E7D8C6] bg-white px-3 py-2.5 text-sm font-bold text-[#3A2A1C]"
        />

        <label className="block text-xs font-black text-[#3A2A1C]">
          קהל יעד
          {phoneMode ? " (לא בשימוש כשמזינים טלפון)" : ""}
        </label>
        <select
          value={filter}
          disabled={phoneMode}
          onChange={(e) => {
            const value = e.target.value;
            if (
              value === "all" ||
              value === "never_invited" ||
              value === "failed" ||
              value === "not_sent"
            ) {
              setFilter(value);
            }
          }}
          className="w-full rounded-xl border border-[#E7D8C6] bg-white px-3 py-2.5 text-sm font-bold text-[#3A2A1C] disabled:opacity-50"
        >
          <option value="never_invited">
            למי שלא נשלחה לו הזמנה מהמערכת
            {loadingCounts ? "" : ` (${neverInvitedCount})`}
          </option>
          <option value="failed">
            נכשלו בדוח סבבי ההזמנה
            {loadingCounts ? "" : ` (${failedCount})`}
          </option>
          <option value="not_sent">
            לא נשלחו בדוח סבבי ההזמנה
            {loadingCounts ? "" : ` (${notSentCount})`}
          </option>
          <option value="all">
            לכל המוזמנים / שליחה חוזרת מפורשת
            {loadingCounts ? "" : ` (${totalGuests})`}
          </option>
        </select>

        <button
          type="button"
          disabled={sending || !invitationId}
          onClick={sendInvitationOnly}
          className="
            h-10 w-full rounded-full
            bg-[#B97821]
            px-4
            text-sm font-black
            text-white
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {sending
            ? "שולח..."
            : phoneMode
              ? "שלח הזמנה למספר זה"
              : "שלח הזמנה בלבד"}
        </button>

        {status && (
          <div
            className={`rounded-xl px-3 py-2 text-xs font-bold ${
              status.type === "success"
                ? "bg-[#EAF8EF] text-[#1F9A55]"
                : "bg-red-50 text-red-600"
            }`}
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
