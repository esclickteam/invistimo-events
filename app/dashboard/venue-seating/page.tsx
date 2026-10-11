"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VENUE_SEATING_RESPONSIBILITY_TEXT } from "@/lib/venueSeatingContacts/logic";

type ContactForm = {
  fullName: string;
  phone: string;
  relation: string;
  canApproveReserves: boolean;
};

type SavedContact = {
  status: "missing" | "complete" | "complete_late";
  primary: ContactForm | null;
  secondary: ContactForm | null;
  responsibilityAccepted: boolean;
  responsibilityAcceptedAt: string | null;
  completedAt: string | null;
};

const EMPTY_CONTACT: ContactForm = {
  fullName: "",
  phone: "",
  relation: "",
  canApproveReserves: false,
};

function formatWhen(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function ContactFields({
  title,
  required,
  value,
  onChange,
}: {
  title: string;
  required: boolean;
  value: ContactForm;
  onChange: (next: ContactForm) => void;
}) {
  return (
    <fieldset className="rounded-[24px] border border-[#E7D8C6] bg-white p-4">
      <legend className="px-1 text-sm font-black text-[#3F3328]">
        {title}
        {required ? " — חובה" : " — אופציונלי"}
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block text-xs font-black text-[#7B6754]">
          שם מלא
          <input
            value={value.fullName}
            onChange={(event) => onChange({ ...value, fullName: event.target.value })}
            className="mt-1 h-12 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-3 text-sm font-bold text-[#3F3328] outline-none"
          />
        </label>
        <label className="block text-xs font-black text-[#7B6754]">
          טלפון
          <input
            dir="ltr"
            inputMode="tel"
            value={value.phone}
            onChange={(event) => onChange({ ...value, phone: event.target.value })}
            className="mt-1 h-12 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-3 text-left text-sm font-bold text-[#3F3328] outline-none"
          />
        </label>
        <label className="block text-xs font-black text-[#7B6754] md:col-span-2">
          תפקיד או קרבה לבעלי האירוע
          <input
            value={value.relation}
            onChange={(event) => onChange({ ...value, relation: event.target.value })}
            className="mt-1 h-12 w-full rounded-2xl border border-[#E7D8C6] bg-[#FFFDF8] px-3 text-sm font-bold text-[#3F3328] outline-none"
          />
        </label>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm font-bold text-[#3F3328]">
        <input
          type="checkbox"
          checked={value.canApproveReserves}
          onChange={(event) =>
            onChange({ ...value, canApproveReserves: event.target.checked })
          }
          className="mt-1 h-4 w-4 accent-[#9b7a3c]"
        />
        מוסמך/ת לאשר פתיחת שולחנות רזרבה
      </label>
    </fieldset>
  );
}

function VenueSeatingContactsScreen() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") || "";
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [primary, setPrimary] = useState<ContactForm>(EMPTY_CONTACT);
  const [secondary, setSecondary] = useState<ContactForm>(EMPTY_CONTACT);
  const [accepted, setAccepted] = useState(false);
  const [saved, setSaved] = useState<SavedContact | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setEligible(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/venue-seating-contacts?eventId=${encodeURIComponent(eventId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setEligible(Boolean(data?.eligible));
        const contact = data?.contact as SavedContact | null;
        if (contact?.primary) setPrimary({ ...EMPTY_CONTACT, ...contact.primary });
        if (contact?.secondary) setSecondary({ ...EMPTY_CONTACT, ...contact.secondary });
        setAccepted(Boolean(contact?.responsibilityAccepted));
        setSaved(contact);
      })
      .catch(() => {
        if (!cancelled) setEligible(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const statusLabel = useMemo(() => {
    if (!saved?.completedAt) return "";
    if (saved.status === "complete_late") return "הושלמו באיחור";
    return "הפרטים נשמרו";
  }, [saved]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors([]);
    setMessage("");
    try {
      const secondaryBlank =
        !secondary.fullName.trim() &&
        !secondary.phone.trim() &&
        !secondary.relation.trim() &&
        !secondary.canApproveReserves;
      const res = await fetch("/api/venue-seating-contacts", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          primary,
          secondary: secondaryBlank ? null : secondary,
          responsibilityAccepted: accepted,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrors(Array.isArray(data?.errors) ? data.errors : ["שמירת הפרטים נכשלה"]);
        return;
      }
      setSaved(data.contact);
      setMessage("אנשי הקשר נשמרו. תזכורות ההשלמה בוטלו.");
      window.dispatchEvent(new CustomEvent("invistimo:customer-notifications"));
    } catch {
      setErrors(["שמירת הפרטים נכשלה"]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 md:px-6 md:py-8" dir="rtl">
      <div className="mb-4">
        <p className="text-[11px] font-black tracking-[0.14em] text-[#B88A2D]">הושבה באולם</p>
        <h1 className="mt-1 text-2xl font-black text-[#3F3328]">אנשי קשר ואישור רזרבות</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#7B6754]">
          הפרטים גלויים לצוות ההושבה באירוע. לא נשלחת הודעה לאנשי הקשר עצמם.
        </p>
      </div>

      {loading ? (
        <p className="text-sm font-bold text-[#8A7867]">טוען...</p>
      ) : !eligible ? (
        <div className="rounded-[24px] border border-[#E7D8C6] bg-white p-5 text-sm font-bold text-[#7B6754]">
          הכרטיס זמין רק לאירוע עתידי שבו נרכש שירות הושבה באולם.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {statusLabel ? (
            <div className="rounded-2xl bg-[#F8F1E4] px-4 py-3 text-sm font-black text-[#6F5430]">
              {statusLabel}
              {saved?.completedAt ? ` · ${formatWhen(saved.completedAt)}` : ""}
            </div>
          ) : null}

          <ContactFields title="איש קשר ראשי" required value={primary} onChange={setPrimary} />
          <ContactFields
            title="איש קשר נוסף"
            required={false}
            value={secondary}
            onChange={setSecondary}
          />

          <label className="flex items-start gap-3 rounded-[24px] border border-[#E7D8C6] bg-[#FFFDF8] p-4 text-sm font-semibold leading-6 text-[#3F3328]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#9b7a3c]"
            />
            <span className="whitespace-pre-wrap">{VENUE_SEATING_RESPONSIBILITY_TEXT}</span>
          </label>

          {errors.length ? (
            <ul className="rounded-2xl bg-[#FFF1EE] px-4 py-3 text-sm font-bold text-[#9C3B2E]">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
          {message ? (
            <p className="rounded-2xl bg-[#EEF8F1] px-4 py-3 text-sm font-bold text-[#1F7A45]">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving || !accepted}
            className="h-12 w-full rounded-2xl bg-[#3F3328] text-sm font-black text-white disabled:opacity-50 md:w-auto md:px-8"
          >
            {saving ? "שומר..." : "שמירת אנשי קשר"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function VenueSeatingPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm font-bold text-[#8A7867]" dir="rtl">
          טוען...
        </div>
      }
    >
      <VenueSeatingContactsScreen />
    </Suspense>
  );
}
