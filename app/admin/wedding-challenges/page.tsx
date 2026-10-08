"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE,
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";

type SaleRow = {
  _id: string;
  userId?: string;
  customerName: string;
  phone: string;
  email?: string | null;
  sourceType: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  pricePaid: number;
  giveawayPurchased: boolean;
  giveawayFee?: number;
  prizeCost?: number;
  eventId?: string | null;
  notes?: string | null;
  createdAt?: string;
  user?: { _id: string; name: string; email: string; phone: string } | null;
};

type PasswordSetup = {
  link: string;
  email?: string;
  phone?: string;
  smsSent?: boolean;
  smsError?: string | null;
};

export default function AdminWeddingChallengesSalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [created, setCreated] = useState<{
    userId: string;
    createdUser: boolean;
    passwordSetup: PasswordSetup | null;
  } | null>(null);
  const [editingId, setEditingId] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    includeGiveaway: false,
    paymentStatus: "paid",
    paymentMethod: "BANK_TRANSFER",
    notes: "",
    price: String(WEDDING_CHALLENGES_PRICE_ILS),
    giveawayPrice: String(WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS),
    prizeCost: "0",
    sourceType: "STANDALONE_GAME",
    eventId: "",
  });

  async function load() {
    const res = await fetch("/api/admin/wedding-challenges/sales");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "שגיאה בטעינה");
      return;
    }
    setRows(data.sales || []);
  }

  useEffect(() => {
    void load();
  }, []);

  const total = useMemo(() => {
    const base = Number(form.price) || 0;
    const giveaway = form.includeGiveaway ? Number(form.giveawayPrice) || 0 : 0;
    return base + giveaway;
  }, [form.price, form.giveawayPrice, form.includeGiveaway]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setOk("");
    setCreated(null);
    try {
      const res = await fetch("/api/admin/wedding-challenges/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          giveawayPrice: Number(form.giveawayPrice),
          prizeCost: Number(form.prizeCost),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "שמירה נכשלה");
      setOk(data.message || "המשתמש נוצר והמכירה נשמרה.");
      setCreated({
        userId: data.userId,
        createdUser: Boolean(data.createdUser),
        passwordSetup: data.passwordSetup || null,
      });
      setForm((prev) => ({
        ...prev,
        customerName: "",
        phone: "",
        email: "",
        notes: "",
      }));
      await load();
    } catch (err: any) {
      setError(err.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function impersonate(userId: string) {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "כניסה לחשבון נכשלה");
      }
      window.location.href = "/dashboard/wedding-challenges";
    } catch (err: any) {
      setError(err.message || "כניסה לחשבון נכשלה");
    } finally {
      setBusyId("");
    }
  }

  async function sendSetup(userId: string) {
    setBusyId(userId);
    setError("");
    try {
      const res = await fetch("/api/admin/wedding-challenges/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password_setup", userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שליחת לינק נכשלה");
      setCreated({ userId, createdUser: false, passwordSetup: data.passwordSetup });
      setOk(data.passwordSetup?.smsSent ? "לינק הסיסמה נשלח ב-SMS." : "לינק הסיסמה מוכן להעתקה.");
    } catch (err: any) {
      setError(err.message || "שליחת לינק נכשלה");
    } finally {
      setBusyId("");
    }
  }

  async function savePrice(row: SaleRow) {
    setBusyId(row._id);
    setError("");
    try {
      const res = await fetch("/api/admin/wedding-challenges/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row._id, pricePaid: Number(editPrice) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "עדכון מחיר נכשל");
      setEditingId("");
      await load();
    } catch (err: any) {
      setError(err.message || "עדכון מחיר נכשל");
    } finally {
      setBusyId("");
    }
  }

  const fieldClass = "mt-1 w-full rounded-xl border border-[#eadfd4] bg-white px-3 py-2.5 text-sm";
  const labelClass = "mb-1 block text-sm font-black text-[#3b2419]";

  return (
    <main className="admin-content w-full min-w-0 max-w-none space-y-4" dir="rtl">
      <p className="text-xs font-medium text-[var(--admin-muted)]">
        יצירת משתמש, קביעת מחיר ושליחת לינק להגדרת סיסמה — ואז ניהול החשבון כאדמין
      </p>

      <form onSubmit={onSubmit} className="space-y-4 rounded-[var(--admin-radius)] border border-[var(--admin-border)] bg-white p-4 shadow-[var(--admin-shadow)]">
        <h2 className="text-lg font-black text-[#3b2419]">יצירת משתמש ומכירה</h2>
        <fieldset className="rounded-2xl border border-[#eadfd4] bg-[#fffaf3] p-4">
          <legend className="px-1 text-sm font-black text-[#3b2419]">סוג מכירה</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="flex items-start gap-2 rounded-xl border border-[#eadfd4] bg-white px-3 py-3 text-sm font-bold">
              <input
                type="radio"
                name="wc-source"
                checked={form.sourceType === "STANDALONE_GAME"}
                onChange={() => setForm({ ...form, sourceType: "STANDALONE_GAME", eventId: "" })}
              />
              <span>
                חבילה עצמאית
                <span className="mt-1 block text-xs font-normal text-[#6b5344]">
                  בלי פרטי אירוע לפני המכירה. הלקוח מגדיר את המשחק אחרי התשלום.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-[#eadfd4] bg-white px-3 py-3 text-sm font-bold">
              <input
                type="radio"
                name="wc-source"
                checked={form.sourceType === "EXISTING_EVENT"}
                onChange={() => setForm({ ...form, sourceType: "EXISTING_EVENT" })}
              />
              <span>
                שדרוג לאירוע קיים
                <span className="mt-1 block text-xs font-normal text-[#6b5344]">
                  מחברים את החבילה לאירוע Invistimo קיים של הלקוח.
                </span>
              </span>
            </label>
          </div>
          {form.sourceType === "EXISTING_EVENT" ? (
            <div className="mt-3">
              <label className={labelClass} htmlFor="wc-event-id">מזהה אירוע (אופציונלי אם ידוע)</label>
              <input
                id="wc-event-id"
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                className={fieldClass}
                dir="ltr"
                placeholder="eventId"
              />
            </div>
          ) : null}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="wc-name">שם לקוח *</label>
            <input
              id="wc-name"
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className={fieldClass}
              placeholder="שם מלא"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="wc-phone">טלפון *</label>
            <input
              id="wc-phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={fieldClass}
              dir="ltr"
              placeholder="0500000000"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="wc-email">אימייל *</label>
            <input
              id="wc-email"
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={fieldClass}
              dir="ltr"
              placeholder="name@email.com"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="wc-pay">סטטוס תשלום</label>
            <select
              id="wc-pay"
              value={form.paymentStatus}
              onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              className={fieldClass}
            >
              <option value="paid">שולם</option>
              <option value="pending">ממתין</option>
              <option value="unpaid">לא שולם</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="wc-method">אמצעי תשלום</label>
            <select
              id="wc-method"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className={fieldClass}
            >
              <option value="BANK_TRANSFER">העברה בנקאית</option>
              <option value="CASH">מזומן</option>
              <option value="BIT">ביט</option>
              <option value="STRIPE">Stripe</option>
              <option value="MANUAL">ידני</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="wc-price">מחיר Wedding Challenges (₪)</label>
            <input
              id="wc-price"
              type="number"
              min={0}
              step="1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={fieldClass}
              dir="ltr"
            />
          </div>
          {WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE ? (
            <>
          <div>
            <label className={labelClass} htmlFor="wc-giveaway-price">מחיר הגרלה (₪)</label>
            <input
              id="wc-giveaway-price"
              type="number"
              min={0}
              step="1"
              value={form.giveawayPrice}
              onChange={(e) => setForm({ ...form, giveawayPrice: e.target.value })}
              className={fieldClass}
              dir="ltr"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="wc-prize">עלות פרס (נגבית בנפרד)</label>
            <input
              id="wc-prize"
              type="number"
              min={0}
              step="1"
              value={form.prizeCost}
              onChange={(e) => setForm({ ...form, prizeCost: e.target.value })}
              className={fieldClass}
              dir="ltr"
            />
          </div>
            </>
          ) : null}
        </div>

        {WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE ? (
        <label className="flex items-center gap-2 text-sm font-bold text-[#3b2419]">
          <input
            type="checkbox"
            checked={form.includeGiveaway}
            onChange={(e) => setForm({ ...form, includeGiveaway: e.target.checked })}
          />
          הוספת הגרלה במחיר שהוגדר למעלה (עלות הפרס נגבית בנפרד)
        </label>
        ) : null}

        <div>
          <label className={labelClass} htmlFor="wc-notes">הערות</label>
          <textarea
            id="wc-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={fieldClass}
            rows={2}
          />
        </div>

        <div className="rounded-xl bg-[#f7efe6] px-4 py-3 text-sm text-[#3b2419]">
          <div>מוצר: Wedding Challenges – {Number(form.price) || 0} ₪</div>
          {WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE && form.includeGiveaway ? (
            <div>הגרלה: {Number(form.giveawayPrice) || 0} ₪</div>
          ) : null}
          <div className="mt-1 font-semibold">סה״כ לחיוב: {total} ₪</div>
          {WEDDING_CHALLENGES_GIVEAWAY_AVAILABLE ? (
          <div className="mt-1 text-xs text-[#7a5b4a]">עלות הפרס נגבית בנפרד ולא נכנסת לסה״כ החבילה</div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

        {created?.userId ? (
          <div className="space-y-2 rounded-2xl border border-[#d8c4a8] bg-[#fffaf3] p-4 text-sm">
            <p className="font-black text-[#3b2419]">
              {created.createdUser ? "משתמש חדש נוצר" : "עודכן משתמש קיים"} · {created.userId}
            </p>
            {created.passwordSetup?.link ? (
              <p className="break-all" dir="ltr">
                {created.passwordSetup.link}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => impersonate(created.userId)}
                className="rounded-full bg-[#3b2419] px-4 py-2 text-xs font-black text-white"
              >
                כניסה לניהול המשחק
              </button>
              <a
                href={`/admin/users?q=${encodeURIComponent(created.userId)}`}
                className="rounded-full border border-[#d8c4a8] px-4 py-2 text-xs font-black"
              >
                כרטיס משתמש באדמין
              </a>
              {created.passwordSetup?.link ? (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(created.passwordSetup!.link)}
                  className="rounded-full border border-[#d8c4a8] px-4 py-2 text-xs font-black"
                >
                  העתקת לינק סיסמה
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#3b2419] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "יוצר משתמש..." : "יצירת משתמש ושמירת מכירה"}
        </button>
      </form>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-bold text-[var(--admin-text)]">
          מכירות אחרונות
        </h2>
        <div className="admin-table-region w-full min-w-0">
          <div className="admin-table-scroll">
            <table className="admin-table" style={{ minWidth: 920 }}>
              <thead>
                <tr>
                  <th>לקוח</th>
                  <th>טלפון</th>
                  <th>אימייל</th>
                  <th>סטטוס</th>
                  <th>סכום</th>
                  <th>אירוע</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const userId = row.userId || row.user?._id || "";
                  return (
                    <tr key={row._id}>
                      <td>
                        <span className="cell-clip font-bold">
                          {row.customerName || row.user?.name || "—"}
                        </span>
                      </td>
                      <td dir="ltr">
                        {row.phone || row.user?.phone || "—"}
                      </td>
                      <td>
                        <span className="cell-clip-wide" dir="ltr">
                          {row.email || row.user?.email || "—"}
                        </span>
                      </td>
                      <td>
                        <span className="admin-row-badge bg-gray-100 text-gray-700">
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td>
                        {editingId === row._id ? (
                          <span className="inline-flex items-center gap-1">
                            <input
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="admin-input h-8 w-20"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              onClick={() => savePrice(row)}
                              className="text-xs font-bold text-[var(--admin-brand)]"
                            >
                              שמירה
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(row._id);
                              setEditPrice(String(row.pricePaid || 0));
                            }}
                            className="font-bold"
                          >
                            {row.pricePaid} ₪
                          </button>
                        )}
                      </td>
                      <td>
                        {row.eventId ? "מקושר" : "בלי אירוע"}
                      </td>
                      <td className="admin-actions-cell">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!userId || busyId === userId}
                            onClick={() => impersonate(userId)}
                            className="inline-flex h-8 items-center rounded-[var(--admin-radius-sm)] bg-[var(--admin-brand)] px-2.5 text-xs font-bold text-white disabled:opacity-40"
                          >
                            ניהול
                          </button>
                          {userId ? (
                            <a
                              href={`/admin/users?q=${encodeURIComponent(row.email || row.phone || userId)}`}
                              className="inline-flex h-8 items-center rounded-[var(--admin-radius-sm)] border border-[var(--admin-border)] px-2.5 text-xs font-bold"
                            >
                              משתמש
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
