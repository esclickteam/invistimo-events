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
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">
          הודעת תזכורת
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
          גוף הודעת התזכורת לכל המערכת. השינוי נכנס בזמן השליחה בפועל, גם לתזמונים שכבר נוצרו.
          משתנה מספר שולחן: {"{{tableName}}"} — יוצג רק לאורחים שיש להם שולחן ושלא חלה עליהם הסתרה.
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
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
