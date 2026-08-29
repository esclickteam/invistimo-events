"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WeddingWebsiteItem = {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  invitationTitle?: string;
  coupleNames?: string;
  shareId?: string;
  templateId?: string | null;
  status?: string;
  eventDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publicPath?: string | null;
  publicUrl?: string | null;
};

export default function AdminWeddingWebsitesPage() {
  const [items, setItems] = useState<WeddingWebsiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/wedding-websites", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      console.error("Failed loading wedding websites", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setMode(nextEmail: string, rsvpSiteMode: "personal" | "standard") {
    if (!nextEmail.trim()) return;

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch("/api/admin/wedding-websites", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail.trim(), rsvpSiteMode }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "UPDATE_FAILED");
      }

      setMessage(
        rsvpSiteMode === "personal"
          ? `נפתח אתר חתונה אישי ל־${data.email}`
          : `הוחזר קישור אישי לכל אורח ל־${data.email}`
      );
      setEmail("");
      await load();
    } catch (error) {
      console.error(error);
      setMessage("לא הצלחנו לעדכן את הלקוח");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <p className="text-xs font-black text-indigo-500">ניהול אתרי חתונה</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">אתרי חתונה אישיים</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
          כאן רואים רק לקוחות שנבחרו במפורש לאתר חתונה אישי. לקוחות קיימים לא
          משתנים אוטומטית. עריכת התוכן נעשית בדשבורד של הלקוח.
        </p>
      </div>

      <section className="rounded-[28px] border border-indigo-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">הפעלה ללקוח ספציפי</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          הזינו מייל של לקוח קיים רק אם רוצים לפתוח לו אתר חתונה, בלי לגעת בשאר הלקוחות.
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@example.com"
            className="h-12 flex-1 rounded-2xl border border-slate-200 px-4 text-sm font-semibold"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => setMode(email, "personal")}
            className="h-12 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white disabled:opacity-60"
          >
            פתיחת אתר חתונה
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => setMode(email, "standard")}
            className="h-12 rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700 disabled:opacity-60"
          >
            חזרה לקישור אישי
          </button>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-indigo-600">{message}</p> : null}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">לקוחות עם אתר חתונה</h2>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-sm font-bold text-slate-500">טוען...</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-10 text-sm font-bold text-slate-500">
            עדיין אין לקוחות עם אתר חתונה אישי.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.userId} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">{item.name || item.email}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.coupleNames || item.invitationTitle || "אין הזמנה עדיין"}
                    {item.eventDate ? ` · ${String(item.eventDate).slice(0, 10)}` : ""}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.email} · {item.templateId || "אין תבנית"} · {item.status || "published"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-indigo-500">
                    {item.publicPath || "האתר ייפתח אחרי יצירת הזמנה"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    נוצר: {item.createdAt ? new Date(item.createdAt).toLocaleDateString("he-IL") : "—"}
                    {" · "}
                    עודכן: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("he-IL") : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.publicPath ? (
                    <>
                    <a
                      href={item.publicPath}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700"
                    >
                      פתיחת האתר
                    </a>
                    <a
                      href={`${item.publicPath}?embed=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700"
                    >
                      Preview
                    </a>
                    </>
                  ) : null}
                  <Link
                    href="/admin/users"
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
                  >
                    כניסה למשתמש
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
