"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type QuoteDoc = {
  token?: string;
  status?: string;
  convertedUserId?: string;
  client?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  event?: {
    name?: string;
    date?: string;
    city?: string;
    venueName?: string;
  };
  selectedPackage?: {
    key?: string;
    title?: string;
    records?: number;
    price?: number;
    includes?: string[];
    customerSummary?: string;
  };
  upsells?: Array<{ title?: string; name?: string; price?: number }>;
  totals?: {
    grossAmount?: number;
    grossAmountBeforeDiscount?: number;
    grossAmountAfterDiscount?: number;
    discountAmount?: number;
    paymentMode?: string;
  };
  notes?: string;
};

export default function EditQuotePage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [doc, setDoc] = useState<QuoteDoc | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    eventName: "",
    eventDate: "",
    city: "",
    venueName: "",
    packageTitle: "",
    packageKey: "easy",
    records: 100,
    packagePrice: 0,
    discountAmount: 0,
    grossAmountAfterDiscount: 0,
    notes: "",
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/employee/sales/documents/${encodeURIComponent(token)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data?.error || "טעינת ההצעה נכשלה");
          return;
        }
        const d: QuoteDoc = data.document;
        setDoc(d);
        setForm({
          fullName: d.client?.fullName || "",
          email: d.client?.email || "",
          phone: d.client?.phone || "",
          eventName: d.event?.name || "",
          eventDate: d.event?.date || "",
          city: d.event?.city || "",
          venueName: d.event?.venueName || "",
          packageTitle: d.selectedPackage?.title || "",
          packageKey: d.selectedPackage?.key || "easy",
          records: Number(d.selectedPackage?.records || 100),
          packagePrice: Number(d.selectedPackage?.price || 0),
          discountAmount: Number(d.totals?.discountAmount || 0),
          grossAmountAfterDiscount: Number(
            d.totals?.grossAmountAfterDiscount || d.totals?.grossAmount || 0
          ),
          notes: d.notes || "",
        });
      } catch {
        setError("שגיאה בטעינת ההצעה");
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  const computedGross = useMemo(() => {
    const upsellTotal = (doc?.upsells || []).reduce(
      (sum, u) => sum + Number(u.price || 0),
      0
    );
    return Math.max(
      0,
      Number(form.packagePrice || 0) + upsellTotal - Number(form.discountAmount || 0)
    );
  }, [form.packagePrice, form.discountAmount, doc?.upsells]);

  async function save() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const res = await fetch(
        `/api/employee/sales/documents/${encodeURIComponent(token)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: {
              fullName: form.fullName,
              email: form.email,
              phone: form.phone,
            },
            event: {
              name: form.eventName,
              date: form.eventDate,
              city: form.city,
              venueName: form.venueName,
            },
            selectedPackage: {
              key: form.packageKey,
              title: form.packageTitle,
              records: form.records,
              price: form.packagePrice,
              includes: doc?.selectedPackage?.includes || [],
              customerSummary: doc?.selectedPackage?.customerSummary || "",
            },
            totals: {
              grossAmount: computedGross,
              grossAmountBeforeDiscount:
                Number(form.packagePrice || 0) +
                (doc?.upsells || []).reduce(
                  (sum, u) => sum + Number(u.price || 0),
                  0
                ),
              grossAmountAfterDiscount: computedGross,
              discountAmount: form.discountAmount,
              paymentMode: doc?.totals?.paymentMode || "split",
            },
            notes: form.notes,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.error || "שמירה נכשלה");
        return;
      }
      setDoc(data.document);
      setSuccess("ההצעה עודכנה בהצלחה");
    } catch {
      setError("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  async function createUser() {
    try {
      setCreatingUser(true);
      setError("");
      const res = await fetch(
        `/api/employee/sales/documents/${encodeURIComponent(token)}/create-user`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.fullName,
            email: form.email,
            phone: form.phone,
            eventName: form.eventName,
            eventDate: form.eventDate,
            city: form.city,
            venueName: form.venueName,
            guests: form.records,
            plan: form.packageKey,
            packageName: form.packageTitle,
            totalDealAmount: computedGross,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data?.message || data?.error || "יצירת משתמש נכשלה");
        return;
      }
      alert(data.message || "המשתמש נוצר בהצלחה");
      router.push(data.redirectTo || "/admin/users");
    } catch {
      setError("שגיאה ביצירת משתמש");
    } finally {
      setCreatingUser(false);
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="p-8 text-[#6B5A48]">
        טוען הצעת מחיר…
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[#352618]">עריכת הצעה</h1>
          <p className="mt-1 text-sm font-semibold text-[#7B6754]">
            עדכון פרטי הצעת מחיר קיימת
          </p>
        </div>
        <Link
          href="/admin/customers"
          className="rounded-xl border border-[#E7D8C6] bg-white px-4 py-2 text-sm font-black"
        >
          חזרה
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          {success}
        </div>
      )}

      <section className="space-y-4 rounded-[28px] border border-[#E7D8C6] bg-white p-5 shadow-sm">
        {(
          [
            ["שם הלקוח", "fullName"],
            ["אימייל", "email"],
            ["טלפון", "phone"],
            ["שם האירוע", "eventName"],
            ["תאריך האירוע", "eventDate"],
            ["עיר", "city"],
            ["שם האולם", "venueName"],
            ["שם החבילה", "packageTitle"],
          ] as const
        ).map(([label, key]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-sm font-black text-[#6B5A48]">
              {label}
            </span>
            <input
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
              type={key === "eventDate" ? "date" : "text"}
              className="h-12 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4 text-sm font-bold outline-none focus:border-[#B8844F]"
            />
          </label>
        ))}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#6B5A48]">
              מספר רשומות
            </span>
            <input
              type="number"
              value={form.records}
              onChange={(e) =>
                setForm((f) => ({ ...f, records: Number(e.target.value || 0) }))
              }
              className="h-12 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4 text-sm font-bold outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#6B5A48]">
              מחיר בסיס / חבילה
            </span>
            <input
              type="number"
              value={form.packagePrice}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  packagePrice: Number(e.target.value || 0),
                }))
              }
              className="h-12 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4 text-sm font-bold outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-black text-[#6B5A48]">
              הנחה
            </span>
            <input
              type="number"
              value={form.discountAmount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  discountAmount: Number(e.target.value || 0),
                }))
              }
              className="h-12 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4 text-sm font-bold outline-none"
            />
          </label>
        </div>

        <div className="rounded-2xl bg-[#FFF7EC] px-4 py-3 text-sm font-black text-[#8A5A24]">
          מחיר סופי מחושב: ₪{computedGross.toLocaleString("he-IL")}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-black text-[#6B5A48]">
            הערות ותנאים
          </span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4 py-3 text-sm font-bold outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-12 rounded-2xl bg-[#24190F] px-6 text-sm font-black text-white disabled:opacity-60"
          >
            {saving ? "שומר..." : "שמירת שינויים"}
          </button>

          {doc?.convertedUserId ? (
            <Link
              href={`/admin/users?q=${encodeURIComponent(form.email)}`}
              className="inline-flex h-12 items-center rounded-2xl border border-[#E7D8C6] bg-white px-6 text-sm font-black"
            >
              מעבר למשתמש
            </Link>
          ) : (
            <button
              type="button"
              onClick={createUser}
              disabled={creatingUser}
              className="h-12 rounded-2xl bg-[#B87920] px-6 text-sm font-black text-white disabled:opacity-60"
            >
              {creatingUser ? "יוצר משתמש..." : "פתיחת משתמש מההצעה"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
