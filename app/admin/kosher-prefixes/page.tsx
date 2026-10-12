"use client";

import { useEffect, useState } from "react";

type PrefixRow = {
  _id: string;
  prefix: string;
  carrier: string;
  active: boolean;
  matchedCount: number;
};

type ActivityRow = {
  id: string;
  customerName: string;
  eventName: string;
  round: number;
  phone: string;
  status: string;
  answered: boolean;
  rsvpResult: string | null;
  rsvpApplied: boolean;
  error: string;
  serviceEnabled: boolean;
};

const EMPTY_FORM = { prefix: "", carrier: "" };

export default function AdminKosherPrefixesPage() {
  const [rows, setRows] = useState<PrefixRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [prefixRes, activityRes] = await Promise.all([
      fetch("/api/admin/kosher-prefixes", { credentials: "include", cache: "no-store" }),
      fetch("/api/admin/kosher-calls", { credentials: "include", cache: "no-store" }),
    ]);
    const prefixData = await prefixRes.json();
    const activityData = await activityRes.json();
    if (prefixData?.success) setRows(prefixData.prefixes || []);
    if (activityData?.success) setActivity(activityData.attempts || []);
    if (!prefixRes.ok) setMessage("אין הרשאה או שגיאה בטעינה");
  }

  useEffect(() => {
    let cancelled = false;
    load()
      .catch(() => {
        if (!cancelled) setMessage("שגיאה בטעינה");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function savePrefix() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        editingId ? `/api/admin/kosher-prefixes/${editingId}` : "/api/admin/kosher-prefixes",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setMessage(typeof data?.error === "string" ? data.error : "השמירה נכשלה");
        return;
      }
      setRows(data.prefixes || []);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setMessage(editingId ? "הקידומת עודכנה" : "הקידומת נוספה");
    } finally {
      setBusy(false);
    }
  }

  async function patchRow(row: PrefixRow, patch: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/kosher-prefixes/${row._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: row.prefix,
          carrier: row.carrier,
          ...patch,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setMessage(typeof data?.error === "string" ? data.error : "העדכון נכשל");
        return;
      }
      setRows(data.prefixes || []);
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(row: PrefixRow) {
    if (!window.confirm(`למחוק את הקידומת ${row.prefix}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/kosher-prefixes/${row._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setMessage(typeof data?.error === "string" ? data.error : "המחיקה נכשלה");
        return;
      }
      setRows(data.prefixes || []);
      setMessage("הקידומת נמחקה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--admin-text)] sm:text-xl">מספרים כשרים</h1>
        <p className="mt-1 max-w-3xl text-xs font-medium leading-6 text-[var(--admin-muted)]">
          רשימת הקידומות נשמרת במסד הנתונים והיא מקור האמת לזיהוי. שינוי כאן חל על רשומות קיימות וחדשות בלי עריכה מחדש של הלקוח, ולא משנה היסטוריית סבבים שכבר בוצעו.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--admin-border)] bg-white p-4">
        <h2 className="text-sm font-black">
          {editingId ? "עריכת קידומת" : "הוספת קידומת חדשה"}
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={form.prefix}
            onChange={(event) => setForm((prev) => ({ ...prev, prefix: event.target.value }))}
            placeholder="קידומת"
            className="rounded-xl border px-3 py-2 text-sm"
            dir="ltr"
          />
          <input
            value={form.carrier}
            onChange={(event) => setForm((prev) => ({ ...prev, carrier: event.target.value }))}
            placeholder="חברת תקשורת"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={savePrefix}
            className="rounded-xl bg-[#3A2A1C] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            {editingId ? "שמירת עריכה" : "הוספת קידומת חדשה"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-xl border px-4 py-2 text-sm font-bold"
            >
              ביטול
            </button>
          ) : null}
        </div>
        {message ? <p className="mt-3 text-sm font-bold">{message}</p> : null}
      </section>

      <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-white">
        <table className="min-w-full text-right text-sm">
          <thead className="bg-[#F7F4EF] text-xs font-black">
            <tr>
              <th className="p-3">קידומת</th>
              <th className="p-3">חברת תקשורת</th>
              <th className="p-3">סטטוס</th>
              <th className="p-3">רשומות מזוהות</th>
              <th className="p-3">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-4" colSpan={5}>טוען...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-4" colSpan={5}>אין קידומות</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="border-t">
                  <td className="p-3 font-black" dir="ltr">{row.prefix}</td>
                  <td className="p-3">{row.carrier}</td>
                  <td className="p-3">{row.active ? "פעיל" : "לא פעיל"}</td>
                  <td className="p-3">{row.matchedCount}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border px-3 py-1 text-xs font-bold"
                        onClick={() => {
                          setEditingId(row._id);
                          setForm({ prefix: row.prefix, carrier: row.carrier });
                        }}
                      >
                        עריכה
                      </button>
                      <button
                        type="button"
                        className="rounded-full border px-3 py-1 text-xs font-bold"
                        onClick={() => patchRow(row, { active: !row.active })}
                      >
                        {row.active ? "השבתה" : "הפעלה"}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border px-3 py-1 text-xs font-bold text-red-700"
                        onClick={() => removeRow(row)}
                      >
                        מחיקה
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-black">פעילות שיחות למספרים כשרים</h2>
        <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-white">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-[#F7F4EF] text-xs font-black">
              <tr>
                <th className="p-3">לקוח</th>
                <th className="p-3">אירוע</th>
                <th className="p-3">סבב</th>
                <th className="p-3">טלפון</th>
                <th className="p-3">סטטוס</th>
                <th className="p-3">אישור</th>
                <th className="p-3">שגיאה</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 ? (
                <tr>
                  <td className="p-4" colSpan={7}>עדיין אין שיחות למספרים כשרים</td>
                </tr>
              ) : (
                activity.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">{row.customerName}</td>
                    <td className="p-3">{row.eventName}</td>
                    <td className="p-3">{row.round}</td>
                    <td className="p-3" dir="ltr">{row.phone}</td>
                    <td className="p-3">{row.answered ? "נענתה" : row.status}</td>
                    <td className="p-3">{row.rsvpApplied ? row.rsvpResult || "נקלט" : "—"}</td>
                    <td className="p-3">{row.error || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
