"use client";

import { useEffect, useState } from "react";
import { displayContactPhone } from "@/lib/venueSeatingContacts/logic";

type Contact = {
  fullName: string;
  phone: string;
  relation: string;
  canApproveReserves: boolean;
};

type EventRow = {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  customerName: string;
  status: string;
  missingSoon: boolean;
  contacts: Contact[];
};

const STATUS: Record<string, string> = {
  missing: "חסרים אנשי קשר",
  complete: "פרטי אנשי קשר הושלמו",
  complete_late: "הושלמו באיחור",
};

export default function SeatingTeamContactsPanel() {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staff/venue-seating-contacts", {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.json())
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

  if (!events) return null;
  if (events.length === 0) return null;

  return (
    <section className="mb-6 rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6" dir="rtl">
      <h2 className="text-xl font-black text-slate-950">אנשי קשר להושבה באולם</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        גורמי הקשר של האירועים שהוקצו אליך, עם חיוג ישיר. לא נשלחת אליהם הודעה מהמערכת.
      </p>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <article key={event.eventId} className="rounded-3xl border border-slate-200 p-4">
            {event.missingSoon ? (
              <p className="mb-3 rounded-2xl bg-[#9C3B2E] px-3 py-2 text-sm font-black text-white">
                חסרים אנשי קשר לאירוע הקרוב
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black text-slate-950">{event.eventTitle || event.customerName}</p>
                <p className="text-xs font-bold text-slate-500">
                  {event.customerName} · {event.eventDate}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                {STATUS[event.status] || event.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {event.contacts.length === 0 ? (
                <p className="text-sm font-bold text-slate-500">טרם הוזנו אנשי קשר</p>
              ) : (
                event.contacts.map((contact) => {
                  const dial = displayContactPhone(contact.phone).replace(/[^\d+]/g, "");
                  return (
                    <div key={`${contact.phone}-${contact.fullName}`} className="rounded-2xl bg-slate-50 p-3">
                      <p className="font-black text-slate-950">{contact.fullName}</p>
                      <p className="text-xs font-bold text-slate-500">{contact.relation}</p>
                      <p className="mt-1 text-xs font-black text-[#8B5E34]">
                        {contact.canApproveReserves ? "מוסמך/ת לאשר רזרבות" : "ללא הרשאת רזרבות"}
                      </p>
                      <a
                        href={`tel:${dial}`}
                        className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white"
                      >
                        חיוג {displayContactPhone(contact.phone)}
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
