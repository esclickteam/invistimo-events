"use client";

import { useEffect, useState } from "react";
import { REMINDER_WITH_TABLE_SERVER_TEMPLATE } from "@/lib/messages/resolveReminderSmsTemplate";

export default function AdminReminderSmsTemplatePage() {
  const [body, setBody] = useState(REMINDER_WITH_TABLE_SERVER_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/reminder-sms-template", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();

        if (cancelled) return;

        if (data?.success && typeof data.reminderSmsBody === "string") {
          setBody(data.reminderSmsBody);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/admin/reminder-sms-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reminderSmsBody: body }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        setMessage(data?.error === "FORBIDDEN" ? "אין הרשאה לערוך" : "שגיאה בשמירה");
        return;
      }

      if (typeof data.reminderSmsBody === "string") {
        setBody(data.reminderSmsBody);
      }

      setMessage("נשמר");
    } catch {
      setMessage("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--admin-text)] sm:text-xl">
          הודעת תזכורת
        </h1>
        <p className="mt-1 max-w-2xl text-xs font-medium leading-6 text-[var(--admin-muted)]">
          גוף הודעת התזכורת לכל המערכת. השינוי נכנס בזמן השליחה בפועל, גם לתזמונים
          שכבר נוצרו.
          <br />
          קישור פרטי האירוע (חובה): {"{{navigationLink}}"} →{" "}
          https://www.invistimo.com/e/…
          <br />
          משתנה מספר שולחן: {"{{tableName}}"} — יוצג רק לאורחים שיש להם שולחן
          ושלא חלה עליהם הסתרה.
        </p>
      </div>

      <div className="rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-4 shadow-[var(--admin-shadow)]">
        {loading ? (
          <p className="text-sm font-bold text-slate-500">טוען…</p>
        ) : (
          <div className="space-y-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-800 outline-none focus:border-indigo-300 focus:bg-white"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                {saving ? "שומר…" : "שמירת נוסח"}
              </button>

              <button
                type="button"
                onClick={() => setBody(REMINDER_WITH_TABLE_SERVER_TEMPLATE)}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600"
              >
                איפוס לברירת מחדל
              </button>

              {message ? (
                <span className="text-sm font-bold text-indigo-600">{message}</span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
