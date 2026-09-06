"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";

type SaleRow = {
  _id: string;
  customerName: string;
  phone: string;
  email?: string | null;
  sourceType: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  pricePaid: number;
  giveawayPurchased: boolean;
  eventId?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export default function AdminWeddingChallengesSalesPage() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    includeGiveaway: false,
    paymentStatus: "paid",
    paymentMethod: "BANK_TRANSFER",
    notes: "",
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/admin/wedding-challenges/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שמירה נכשלה");
      setOk("המכירה נשמרה. הלקוח יכול להשלים את הגדרת המשחק מאוחר יותר.");
      setForm((prev) => ({ ...prev, customerName: "", phone: "", email: "", notes: "" }));
      await load();
    } catch (err: any) {
      setError(err.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  const total =
    WEDDING_CHALLENGES_PRICE_ILS +
    (form.includeGiveaway ? WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS : 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8" dir="rtl">
      <h1 className="font-[family-name:var(--font-playfair)] text-3xl text-[#3b2419]">
        מכירת Wedding Challenges
      </h1>
      <p className="mt-2 text-sm text-[#6b5344]">
        אפשר למכור את החבילה כ-standalone בלי שמות בני הזוג, תאריך אירוע, RSVP או רשימת אורחים.
        הלקוח ישלים את ההגדרה אחרי התשלום.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-2xl border border-[#e8d5c4] bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            שם לקוח *
            <input
              required
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#eadfd4] px-3 py-2"
            />
          </label>
          <label className="text-sm">
            טלפון *
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#eadfd4] px-3 py-2"
              dir="ltr"
            />
          </label>
          <label className="text-sm">
            אימייל (אופציונלי)
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#eadfd4] px-3 py-2"
              dir="ltr"
            />
          </label>
          <label className="text-sm">
            סטטוס תשלום
            <select
              value={form.paymentStatus}
              onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#eadfd4] px-3 py-2"
            >
              <option value="paid">שולם</option>
              <option value="pending">ממתין</option>
              <option value="unpaid">לא שולם</option>
            </select>
          </label>
          <label className="text-sm">
            אמצעי תשלום
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="mt-1 w-full rounded-xl border border-[#eadfd4] px-3 py-2"
            >
              <option value="BANK_TRANSFER">העברה בנקאית</option>
              <option value="CASH">מזומן</option>
              <option value="BIT">ביט</option>
              <option value="STRIPE">Stripe</option>
              <option value="MANUAL">ידני</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.includeGiveaway}
            onChange={(e) => setForm({ ...form, includeGiveaway: e.target.checked })}
          />
          הוספת הגרלה – {WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪ (עלות הפרס נגבית בנפרד)
        </label>

        <label className="block text-sm">
          הערות
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 w-full rounded-xl border border-[#eadfd4] px-3 py-2"
            rows={2}
          />
        </label>

        <div className="rounded-xl bg-[#f7efe6] px-4 py-3 text-sm text-[#3b2419]">
          מוצר: Wedding Challenges – {WEDDING_CHALLENGES_PRICE_ILS} ₪
          {form.includeGiveaway ? ` + הגרלה ${WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS} ₪` : ""}
          <div className="mt-1 font-semibold">סה״כ חבילה: {total} ₪</div>
          <div className="mt-1 text-xs text-[#7a5b4a]">עלות הפרס נגבית בנפרד</div>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#3b2419] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "שומר..." : "שמירת מכירה"}
        </button>
      </form>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[#3b2419]">מכירות אחרונות</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[#eadfd4] bg-white">
          <table className="w-full min-w-[700px] text-right text-sm">
            <thead className="bg-[#f7efe6] text-[#6b5344]">
              <tr>
                <th className="px-3 py-2">לקוח</th>
                <th className="px-3 py-2">טלפון</th>
                <th className="px-3 py-2">סטטוס</th>
                <th className="px-3 py-2">תשלום</th>
                <th className="px-3 py-2">סכום</th>
                <th className="px-3 py-2">אירוע</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-t border-[#f0e4d8]">
                  <td className="px-3 py-2">{row.customerName}</td>
                  <td className="px-3 py-2" dir="ltr">{row.phone}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.paymentStatus}</td>
                  <td className="px-3 py-2">{row.pricePaid} ₪</td>
                  <td className="px-3 py-2">{row.eventId ? "מקושר" : "בלי אירוע עדיין"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
