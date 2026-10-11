"use client";

import { useEffect, useState } from "react";

type Contact = {
  fullName: string;
  phone: string;
  relation: string;
  canApproveReserves: boolean;
};

type EventRow = {
  eventId: string;
  title: string;
  date: string;
  time: string;
  status: "missing" | "complete" | "complete_late";
  statusLabel: string;
  missingSoon: boolean;
  contact: {
    primary: Contact | null;
    secondary: Contact | null;
    responsibilityAcceptedAt: string | null;
    responsibilityAcceptedByName: string;
    responsibilityVersion: string;
    completedAt: string | null;
    changes: Array<{ at: string | null; byName: string; summary: string }>;
  };
  notifications: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
  reminders: Array<{
    stage: string;
    channel: string;
    status: string;
    detail: string;
    smsTo: string;
    sentAt: string | null;
    createdAt: string;
  }>;
};

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
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

function ContactLine({ contact }: { contact: Contact | null }) {
  if (!contact) return null;
  return (
    <div className="rounded-2xl border border-[#EFE2D1] bg-white px-4 py-3 text-sm">
      <p className="font-black text-[#3A2A1C]">{contact.fullName}</p>
      <p className="mt-1 font-bold text-[#7B6754]" dir="ltr">
        {contact.phone}
      </p>
      <p className="mt-1 font-bold text-[#7B6754]">{contact.relation}</p>
      <p className="mt-1 text-xs font-black text-[#8B5E34]">
        {contact.canApproveReserves ? "מוסמך/ת לאשר רזרבות" : "ללא הרשאת רזרבות"}
      </p>
    </div>
  );
}

export default function VenueSeatingContactsPanel({ userId }: { userId: string }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/users/${userId}/venue-seating-contacts`, {
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
  }, [userId]);

  if (!events || events.length === 0) return null;

  return (
    <section className="rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5">
      <p className="text-[11px] font-black tracking-[0.14em] text-[#B97821]">
        הושבה באולם
      </p>
      <h3 className="mt-1 text-lg font-black text-[#3A2A1C]">אנשי קשר ואישור רזרבות</h3>
      <div className="mt-4 space-y-4">
        {events.map((event) => (
          <article key={event.eventId} className="rounded-[22px] border border-[#EFE2D1] p-4">
            {event.missingSoon ? (
              <p className="mb-3 rounded-2xl bg-[#9C3B2E] px-3 py-2 text-sm font-black text-white">
                חסרים אנשי קשר לאירוע הקרוב
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black text-[#3A2A1C]">{event.title || "אירוע"}</p>
                <p className="text-xs font-bold text-[#7B6754]">
                  {event.date} {event.time}
                </p>
              </div>
              <span className="rounded-full bg-[#FFF2D8] px-3 py-1 text-xs font-black text-[#7B5A1E]">
                {event.statusLabel}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <ContactLine contact={event.contact.primary} />
              <ContactLine contact={event.contact.secondary} />
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-[#7B6754]">
              אישור הצהרה: {formatWhen(event.contact.responsibilityAcceptedAt)}
              {event.contact.responsibilityAcceptedByName
                ? ` · ${event.contact.responsibilityAcceptedByName}`
                : ""}
              {event.contact.responsibilityVersion
                ? ` · ${event.contact.responsibilityVersion}`
                : ""}
            </p>
            <div className="mt-3">
              <p className="text-xs font-black text-[#8A7867]">התראות ו-SMS</p>
              <ul className="mt-1 space-y-1 text-xs font-bold text-[#5C4A3A]">
                {event.reminders.length === 0 ? <li>אין שליחות עדיין</li> : null}
                {event.reminders.map((reminder) => (
                  <li key={`${reminder.stage}-${reminder.channel}-${reminder.createdAt}`}>
                    {reminder.stage} · {reminder.channel} · {reminder.status}
                    {reminder.smsTo ? ` · ${reminder.smsTo}` : ""}
                    {reminder.detail ? ` · ${reminder.detail}` : ""}
                    {" · "}
                    {formatWhen(reminder.sentAt || reminder.createdAt)}
                  </li>
                ))}
              </ul>
            </div>
            {event.contact.changes.length ? (
              <div className="mt-3">
                <p className="text-xs font-black text-[#8A7867]">תיעוד שינויים</p>
                <ul className="mt-1 space-y-1 text-xs font-bold text-[#5C4A3A]">
                  {event.contact.changes.map((change) => (
                    <li key={`${change.at}-${change.summary}`}>
                      {formatWhen(change.at)} · {change.summary}
                      {change.byName ? ` · ${change.byName}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {event.notifications.length ? (
              <p className="mt-2 text-[11px] font-bold text-[#9A8773]">
                התראות פנימיות: {event.notifications.map((item) => item.status).join(", ")}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
