"use client";

import { useEffect, useState } from "react";

type Contact = {
  fullName: string;
  phone: string;
  relation: string;
};

type EventRow = {
  eventId: string;
  title: string;
  dateLabel: string;
  venueName: string;
  city: string;
  receptionTime: string;
  arrivalTime: string;
  balanceLabel: string;
  primary: Contact | null;
  secondary: Contact | null;
};

function ContactCard({ title, contact }: { title: string; contact: Contact | null }) {
  if (!contact) return null;
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-400">{title}</p>
      <p className="mt-1 font-black text-slate-950">{contact.fullName}</p>
      {contact.relation ? (
        <p className="text-xs font-bold text-slate-500">{contact.relation}</p>
      ) : null}
      <p className="mt-1 text-sm font-black text-slate-800" dir="ltr">
        {contact.phone}
      </p>
    </div>
  );
}

export default function EventDayBriefingPanel() {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/venue-seating-briefing/mine", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!events || events.length === 0) return null;

  return (
    <section className="mb-6 rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6" dir="rtl">
      <h2 className="text-xl font-black text-slate-950">פרטי האירוע להיום</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        לצפייה בלבד. הפרטים שייכים לאירוע שאליו שובצתם.
      </p>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <article key={event.eventId} className="rounded-3xl border border-slate-200 p-4">
            <p className="font-black text-slate-950">{event.title || "אירוע"}</p>
            <p className="mt-1 text-sm font-bold text-slate-600">
              {event.dateLabel}
              {event.venueName ? ` · ${event.venueName}` : ""}
              {event.city ? `, ${event.city}` : ""}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <p className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800">
                קבלת פנים
                <span className="mt-1 block text-lg">{event.receptionTime || "לא הוזן"}</span>
              </p>
              <p className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800">
                שעת התייצבות
                <span className="mt-1 block text-lg">{event.arrivalTime || "לא הוזן"}</span>
              </p>
              <p className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800">
                יתרה לגבייה באירוע
                <span className="mt-1 block text-lg">{event.balanceLabel}</span>
              </p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              <ContactCard title="איש קשר ראשי" contact={event.primary} />
              <ContactCard title="איש קשר נוסף" contact={event.secondary} />
            </div>
            {event.primary ? (
              <p className="mt-3 text-sm font-bold text-slate-600">
                יש לתאם את גביית היתרה מול איש הקשר האחראי לתשלום.
              </p>
            ) : (
              <p className="mt-3 text-sm font-bold text-slate-500">טרם הוזנו אנשי קשר.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
