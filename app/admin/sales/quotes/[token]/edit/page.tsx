"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  SEATING_SCHEDULE_FIELDS,
  emptySeatingScheduleTimes,
  hasApprovedSeatingSchedule,
  isSeatingScheduleFrozen,
  missingSeatingScheduleLabels,
  orderIncludesVenueSeating,
  type SeatingScheduleChange,
  type SeatingScheduleRecord,
  type SeatingScheduleTimes,
} from "@/lib/seatingSchedule";

type QuoteDoc = {
  token?: string;
  type?: string;
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
  upsells?: Array<{ key?: string; title?: string; name?: string; price?: number }>;
  seatingSchedule?: SeatingScheduleRecord | null;
  totals?: {
    grossAmount?: number;
    grossAmountBeforeDiscount?: number;
    grossAmountAfterDiscount?: number;
    discountAmount?: number;
    paymentMode?: string;
  };
  notes?: string;
};

function readScheduleTimes(
  schedule: SeatingScheduleRecord | null | undefined,
): SeatingScheduleTimes {
  if (!hasApprovedSeatingSchedule(schedule)) return emptySeatingScheduleTimes();

  const changes = Array.isArray(schedule?.changes) ? schedule.changes : [];
  const latest = changes.length > 0 ? changes[changes.length - 1] : schedule;

  return {
    receptionStartTime: latest?.receptionStartTime || "",
    plannedChuppahTime: latest?.plannedChuppahTime || "",
    plannedSeatingStartTime: latest?.plannedSeatingStartTime || "",
    teamArrivalTime: latest?.teamArrivalTime || "",
  };
}

function formatChangeStamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

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
  const [scheduleTimes, setScheduleTimes] = useState<SeatingScheduleTimes>(
    () => emptySeatingScheduleTimes(),
  );
  const [scheduleSaving, setScheduleSaving] = useState(false);

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
        setScheduleTimes(readScheduleTimes(d.seatingSchedule));
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

  const includesVenueSeating = orderIncludesVenueSeating(doc?.upsells);
  const scheduleFrozen = isSeatingScheduleFrozen(doc?.status);
  const approvedSchedule = hasApprovedSeatingSchedule(doc?.seatingSchedule)
    ? doc?.seatingSchedule
    : null;

  async function saveSchedule(times: SeatingScheduleTimes) {
    const missing = missingSeatingScheduleLabels(times);
    if (missing.length > 0) {
      setError(`חסרות שעות הושבה: ${missing.join(", ")}`);
      return null;
    }

    const res = await fetch(
      `/api/employee/sales/documents/${encodeURIComponent(token)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatingSchedule: times }),
      },
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data?.error || "שמירת לוחות הזמנים נכשלה");
      return null;
    }

    setDoc(data.document);
    setScheduleTimes(readScheduleTimes(data.document?.seatingSchedule));
    setSuccess(data.message || "לוחות הזמנים נשמרו");
    return data.document as QuoteDoc;
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (includesVenueSeating && !scheduleFrozen) {
        const saved = await saveSchedule(scheduleTimes);
        if (!saved) return;
      }

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
          <h1 className="text-3xl font-black text-[#352618]">
            {doc?.type === "agreement" ? "לוחות זמנים בהסכם" : "עריכת הצעה"}
          </h1>
          <p className="mt-1 text-sm font-semibold text-[#7B6754]">
            {doc?.type === "agreement"
              ? "הסכם שנשמר אינו נערך מכאן. אפשר לתעד רק שינוי מאוחר בשעות ההושבה."
              : "עדכון פרטי הצעת מחיר קיימת"}
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

      {doc?.type === "agreement" ? null : (
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
      )}

      {includesVenueSeating ? (
        <section className="space-y-4 rounded-[28px] border border-[#E7D8C6] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-[#352618]">לוחות זמנים להושבה באולם</h2>
          {approvedSchedule && scheduleFrozen ? (
            <div>
              <p className="mb-3 text-sm font-black text-[#352618]">השעות שאושרו בעת ההתקשרות</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SEATING_SCHEDULE_FIELDS.map((field) => (
                  <div key={field.key} className="rounded-2xl bg-[#FFF7EC] px-4 py-3">
                    <p className="text-xs font-black text-[#8A5A24]">{field.label}</p>
                    <p className="mt-1 text-sm font-black text-[#352618]">
                      {approvedSchedule[field.key]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {scheduleFrozen && !approvedSchedule ? (
            <p className="text-sm font-bold leading-6 text-[#7B6754]">
              במסמך הזה, שכבר נשלח או נחתם, לא נשמרו לוחות זמנים מקוריים. אי אפשר להוסיף אותם בדיעבד.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold leading-6 text-[#7B6754]">
                {scheduleFrozen
                  ? "שינוי מאוחר נשמר עם תאריך, שעה ושם המבצע, בלי לדרוס את השעות שאושרו."
                  : "לפני שליחת המסמך, השמירה מעדכנת את השעות שיוצגו ללקוח."}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {SEATING_SCHEDULE_FIELDS.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1 block text-sm font-black text-[#6B5A48]">
                      {scheduleFrozen ? `שעה מעודכנת: ${field.label}` : field.label}
                    </span>
                    <input
                      type="time"
                      step={60}
                      value={scheduleTimes[field.key]}
                      onChange={(event) =>
                        setScheduleTimes((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="h-12 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-4 text-sm font-bold outline-none focus:border-[#B8844F]"
                    />
                  </label>
                ))}
              </div>
              {scheduleFrozen || doc?.type === "agreement" ? (
                <button
                  type="button"
                  disabled={scheduleSaving}
                  onClick={async () => {
                    try {
                      setScheduleSaving(true);
                      setError("");
                      setSuccess("");
                      await saveSchedule(scheduleTimes);
                    } catch {
                      setError("שגיאה בשמירת לוחות הזמנים");
                    } finally {
                      setScheduleSaving(false);
                    }
                  }}
                  className="h-12 rounded-2xl bg-[#24190F] px-6 text-sm font-black text-white disabled:opacity-60"
                >
                  {scheduleSaving
                    ? "שומר..."
                    : scheduleFrozen
                      ? "שמירת שינוי מאוחר"
                      : "שמירת לוחות הזמנים"}
                </button>
              ) : null}
            </>
          )}

          {Array.isArray(doc?.seatingSchedule?.changes) &&
          doc.seatingSchedule.changes.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-[#352618]">שינויים מאוחרים</h3>
              {doc.seatingSchedule.changes.map((change: SeatingScheduleChange, index) => (
                <div key={`${change.changedAt}-${index}`} className="rounded-2xl border border-[#E7D8C6] px-4 py-3 text-sm font-bold leading-6 text-[#6B5A48]">
                  <p>
                    {formatChangeStamp(change.changedAt)} · {change.changedByName || change.changedByUserId || "לא זוהה"}
                  </p>
                  <p>
                    קבלת פנים {change.receptionStartTime} · חופה {change.plannedChuppahTime} · הושבה {change.plannedSeatingStartTime} · הגעה {change.teamArrivalTime}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
