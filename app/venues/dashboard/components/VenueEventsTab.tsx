"use client";

import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Search,
  Users,
  Utensils,
} from "lucide-react";

type EventStatus = "booked" | "planning" | "ready" | "completed" | "cancelled";

type DemoEvent = {
  id: string;
  title: string;
  eventType: string;
  clientName: string;
  hallName: string;
  complexName: string;
  eventDate: string;
  startTime: string;
  expectedGuests: number;
  confirmedGuests: number;
  arrivedGuests: number;
  menuStatus: string;
  seatingStatus: string;
  rsvpStatus: string;
  paymentStatus: string;
  status: EventStatus;
};

const statusLabels: Record<EventStatus, string> = {
  booked: "נסגר",
  planning: "בתכנון",
  ready: "מוכן",
  completed: "הסתיים",
  cancelled: "בוטל",
};

const events: DemoEvent[] = [
  {
    id: "1",
    title: "החתונה של לירון ואיתי",
    eventType: "חתונה",
    clientName: "לירון ואיתי",
    hallName: "אולם גפן",
    complexName: "מתחם בראשית",
    eventDate: "23.05.2026",
    startTime: "19:30",
    expectedGuests: 320,
    confirmedGuests: 286,
    arrivedGuests: 0,
    menuStatus: "ממתין לאישור",
    seatingStatus: "בתהליך",
    rsvpStatus: "פעיל",
    paymentStatus: "חלקי",
    status: "planning",
  },
  {
    id: "2",
    title: "בר המצווה של איתן",
    eventType: "בר מצווה",
    clientName: "משפחת כהן",
    hallName: "אולם הדר",
    complexName: "מתחם בראשית",
    eventDate: "26.05.2026",
    startTime: "18:00",
    expectedGuests: 180,
    confirmedGuests: 152,
    arrivedGuests: 0,
    menuStatus: "מאושר",
    seatingStatus: "הושלם",
    rsvpStatus: "הושלם",
    paymentStatus: "שולם",
    status: "ready",
  },
  {
    id: "3",
    title: "אירוע חברה אלפא",
    eventType: "אירוע חברה",
    clientName: "חברת אלפא",
    hallName: "אולם כרם",
    complexName: "מתחם בראשית",
    eventDate: "29.05.2026",
    startTime: "20:00",
    expectedGuests: 450,
    confirmedGuests: 390,
    arrivedGuests: 0,
    menuStatus: "טיוטה",
    seatingStatus: "לא התחיל",
    rsvpStatus: "פעיל",
    paymentStatus: "חלקי",
    status: "planning",
  },
];

export default function VenueEventsTab() {
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      return [
        event.title,
        event.eventType,
        event.clientName,
        event.hallName,
        event.complexName,
        event.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
    });
  }, [query]);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-black text-[#a5824f]">אירועים</p>

            <h2 className="mt-2 text-2xl font-black text-[#2f261d]">
              ניהול אירועי האולם
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-[#7b6a58]">
              כל אירוע מחובר ללקוח, אולם, תפריט, RSVP, הושבה, תשלומים וסטטוס
              תפעולי.
            </p>
          </div>

          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2f261d] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#493a2d]"
          >
            <Plus size={18} />
            פתיחת אירוע
          </button>
        </div>
      </div>

      <div className="rounded-[2rem] border border-[#eadfce] bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9b8974]"
          />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש אירוע, לקוח, אולם או סוג אירוע..."
            className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffaf4] pr-11 text-sm font-bold text-[#2f261d] outline-none transition placeholder:text-[#a99a89] focus:border-[#d6b46d]"
          />
        </div>
      </div>

      <div className="grid gap-5">
        {filteredEvents.map((event) => (
          <article
            key={event.id}
            className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
          >
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#f1e6d4] px-3 py-1 text-xs font-black text-[#7a5a25]">
                    {event.eventType}
                  </span>

                  <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-xs font-black text-[#2e7d46]">
                    {statusLabels[event.status]}
                  </span>
                </div>

                <h3 className="mt-3 text-xl font-black text-[#2f261d] sm:text-2xl">
                  {event.title}
                </h3>

                <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-[#7b6a58]">
                  <span className="flex items-center gap-1.5">
                    <Users size={16} className="text-[#a5824f]" />
                    {event.clientName}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <MapPin size={16} className="text-[#a5824f]" />
                    {event.hallName}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={16} className="text-[#a5824f]" />
                    {event.eventDate}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Clock3 size={16} className="text-[#a5824f]" />
                    {event.startTime}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="h-11 rounded-2xl bg-[#2f261d] px-5 text-sm font-black text-white transition hover:bg-[#493a2d]"
              >
                פתיחת אירוע
              </button>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <MiniStatus
                icon={Users}
                label="צפויים"
                value={String(event.expectedGuests)}
              />

              <MiniStatus
                icon={CheckCircle2}
                label="אישרו"
                value={String(event.confirmedGuests)}
              />

              <MiniStatus
                icon={Users}
                label="הגיעו בפועל"
                value={String(event.arrivedGuests)}
              />

              <MiniStatus
                icon={Utensils}
                label="תפריט"
                value={event.menuStatus}
              />

              <MiniStatus
                icon={Users}
                label="הושבה"
                value={event.seatingStatus}
              />

              <MiniStatus
                icon={CheckCircle2}
                label="תשלום"
                value={event.paymentStatus}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MiniStatus({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#f0e6d7] bg-[#fffaf4] p-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[#a5824f]" />
        <p className="text-xs font-black text-[#8a7966]">{label}</p>
      </div>

      <p className="mt-2 truncate text-base font-black text-[#2f261d]">
        {value}
      </p>
    </div>
  );
}