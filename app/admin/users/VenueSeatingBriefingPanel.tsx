"use client";

import { useCallback, useEffect, useState } from "react";

type Recipient = {
  userId: string;
  name: string;
  phone: string;
  role: string;
  roleLabel: string;
  status: "pending" | "sent" | "failed";
  statusLabel: string;
  sentAt: string | null;
  kind: string;
  error: string;
  history: Array<{
    at: string | null;
    kind: string;
    status: string;
    error: string;
  }>;
};

type EventRow = {
  eventId: string;
  title: string;
  date: string;
  dateLabel: string;
  receptionTime: string;
  arrivalTime: string;
  arrivalManual: boolean;
  venueName: string;
  city: string;
  balanceLabel: string;
  alerts: string[];
  preview: string;
  canSend: boolean;
  recipients: Recipient[];
};

function formatWhen(value: string | null | undefined) {
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

function kindLabel(kind: string) {
  if (kind === "manual") return "ידנית";
  if (kind === "automatic") return "אוטומטית";
  return "";
}

export default function VenueSeatingBriefingPanel({ userId }: { userId: string }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [active, setActive] = useState(false);
  const [openEventId, setOpenEventId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/users/${userId}/venue-seating-briefing`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      setActive(false);
      setEvents([]);
      return;
    }
    setActive(Boolean(data.active));
    setEvents(Array.isArray(data.events) ? data.events : []);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    load().catch(() => {
      if (!cancelled) {
        setActive(false);
        setEvents([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!events || !active || events.length === 0) return null;

  const openEvent = events.find((event) => event.eventId === openEventId) || null;

  function openSend(event: EventRow) {
    setNotice("");
    setOpenEventId(event.eventId);
    setSelected(event.recipients.map((recipient) => recipient.userId));
  }

  async function saveArrival(event: EventRow, arrivalTime: string, clearManual = false) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/venue-seating-briefing`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.eventId,
          arrivalTime,
          clearManual,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setNotice(data?.error || "שמירת שעת ההתייצבות נכשלה");
        return;
      }
      setEvents((current) =>
        (current || []).map((row) => (row.eventId === event.eventId ? data.event : row))
      );
    } finally {
      setBusy(false);
    }
  }

  async function send(event: EventRow, recipientIds: string[]) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${userId}/venue-seating-briefing`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.eventId, recipientIds }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setNotice(data?.error || "השליחה נכשלה");
        return;
      }
      setEvents((current) =>
        (current || []).map((row) => (row.eventId === event.eventId ? data.event : row))
      );
      setOpenEventId(null);
      const results = Array.isArray(data.results) ? data.results : [];
      const failed = results.filter((row: { status?: string }) => row.status === "failed").length;
      const sent = results.filter((row: { status?: string }) => row.status === "sent").length;
      setNotice(
        failed
          ? "חלק מההודעות נכשלו. אפשר לנסות שוב לנמענים שנכשלו."
          : sent
            ? "ההודעות נשלחו."
            : "לא נשלחה הודעה חדשה. שליחה קודמת עדיין מתבצעת."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[26px] border border-[#E7D8C6] bg-[#FFFDF8] p-5" dir="rtl">
      <p className="text-[11px] font-black tracking-[0.14em] text-[#B97821]">הושבה באולם</p>
      <h3 className="mt-1 text-lg font-black text-[#3A2A1C]">פרטי אירוע לעובדים ולמפיק</h3>
      <p className="mt-1 text-sm font-bold text-[#7B6754]">
        ביום שלפני האירוע בשעה 14:00 נשלחת הודעה אחת לכל עובד הושבה ומפיק משובצים. אם היום שבת או חג, השליחה מוקדמת ליום המותר הקרוב, עדיין בשעה 14:00. שליחה ידנית אפשרית גם לפני כן.
      </p>
      {notice ? (
        <p className="mt-3 rounded-2xl bg-[#FFF2D8] px-3 py-2 text-sm font-black text-[#7B5A1E]">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        {events.map((event) => (
          <article key={event.eventId} className="rounded-[22px] border border-[#EFE2D1] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black text-[#3A2A1C]">{event.title || "אירוע"}</p>
                <p className="text-xs font-bold text-[#7B6754]">
                  {event.dateLabel || event.date}
                  {event.venueName ? ` · ${event.venueName}` : ""}
                  {event.city ? `, ${event.city}` : ""}
                </p>
              </div>
              {event.canSend ? (
                <button
                  type="button"
                  onClick={() => openSend(event)}
                  className="rounded-2xl bg-[#3A2A1C] px-4 py-2 text-sm font-black text-white"
                >
                  שליחת פרטי אירוע לעובדים
                </button>
              ) : null}
            </div>

            {event.alerts.length > 0 ? (
              <div className="mt-3 rounded-2xl bg-[#9C3B2E] px-3 py-2 text-sm font-black text-white">
                {event.alerts.map((alert) => (
                  <p key={alert}>{alert}</p>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="text-xs font-black text-[#8A7867]">
                שעת התייצבות
                <input
                  type="time"
                  defaultValue={event.arrivalTime}
                  key={`${event.eventId}-${event.arrivalTime}-${event.arrivalManual}`}
                  disabled={busy}
                  onBlur={(input) => {
                    if (input.target.value && input.target.value !== event.arrivalTime) {
                      void saveArrival(event, input.target.value);
                    }
                  }}
                  className="mt-1 block rounded-2xl border border-[#E7D8C6] bg-white px-3 py-2 text-sm font-black text-[#3A2A1C]"
                />
              </label>
              <p className="pb-2 text-xs font-bold text-[#7B6754]">
                {event.arrivalManual
                  ? "נקבע ידנית. שינוי שעת קבלת הפנים לא ידרוס את השעה הזו."
                  : "מחושב אוטומטית: 30 דקות לפני קבלת הפנים."}
                {event.receptionTime ? ` קבלת פנים ${event.receptionTime}.` : ""}
              </p>
              {event.arrivalManual ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveArrival(event, "", true)}
                  className="rounded-2xl border border-[#E7D8C6] bg-white px-3 py-2 text-xs font-black text-[#3A2A1C]"
                >
                  חזרה לחישוב אוטומטי
                </button>
              ) : null}
            </div>

            <p className="mt-3 text-sm font-black text-[#3A2A1C]">
              יתרה לגבייה באירוע: {event.balanceLabel}
            </p>

            <div className="mt-3 space-y-2">
              {event.recipients.length === 0 ? (
                <p className="text-sm font-bold text-[#7B6754]">
                  אין עובדי הושבה או מפיק משובצים לאירוע.
                </p>
              ) : (
                event.recipients.map((recipient) => (
                  <div
                    key={recipient.userId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#EFE2D1] bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-black text-[#3A2A1C]">
                        {recipient.name || "ללא שם"} · {recipient.roleLabel}
                      </p>
                      <p className="text-xs font-bold text-[#7B6754]" dir="ltr">
                        {recipient.phone || "אין טלפון"}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-[#7B5A1E]">
                        {recipient.statusLabel}
                        {(() => {
                          const latest = recipient.history[recipient.history.length - 1];
                          const when = recipient.sentAt || latest?.at;
                          return when ? ` · ${formatWhen(when)}` : "";
                        })()}
                        {recipient.kind ? ` · ${kindLabel(recipient.kind)}` : ""}
                      </p>
                      {recipient.history.length > 1 ? (
                        <ul className="mt-1 space-y-0.5 text-[11px] font-bold text-[#8A7867]">
                          {recipient.history.map((attempt, index) => (
                            <li key={`${attempt.at}-${index}`}>
                              {kindLabel(attempt.kind) || attempt.kind} · {attempt.status === "sent" ? "נשלח" : "נכשל"}
                              {attempt.at ? ` · ${formatWhen(attempt.at)}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {recipient.error ? (
                        <p className="text-xs font-bold text-[#9C3B2E]">{recipient.error}</p>
                      ) : null}
                      {recipient.status === "failed" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void send(event, [recipient.userId])}
                          className="mt-1 text-xs font-black text-[#3A2A1C] underline"
                        >
                          שליחה חוזרת
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </div>

      {openEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-5" dir="rtl">
            <h4 className="text-lg font-black text-[#3A2A1C]">שליחת פרטי אירוע לעובדים</h4>
            <p className="mt-1 text-sm font-bold text-[#7B6754]">
              בחרו עובד, כמה עובדים, או את כל המשובצים. השליחה תיעוד גם אם כבר נשלחה הודעה.
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm font-black text-[#3A2A1C]">
              <input
                type="checkbox"
                checked={
                  openEvent.recipients.length > 0 &&
                  selected.length === openEvent.recipients.length
                }
                onChange={(input) =>
                  setSelected(
                    input.target.checked
                      ? openEvent.recipients.map((recipient) => recipient.userId)
                      : []
                  )
                }
              />
              כל המשובצים
            </label>
            <div className="mt-2 space-y-2">
              {openEvent.recipients.map((recipient) => (
                <label
                  key={recipient.userId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[#EFE2D1] px-3 py-2 text-sm font-bold"
                >
                  <span>
                    <input
                      type="checkbox"
                      className="ml-2"
                      checked={selected.includes(recipient.userId)}
                      onChange={(input) =>
                        setSelected((current) =>
                          input.target.checked
                            ? [...current, recipient.userId]
                            : current.filter((id) => id !== recipient.userId)
                        )
                      }
                    />
                    {recipient.name || "ללא שם"} · {recipient.roleLabel}
                  </span>
                  <span className="text-xs font-black text-[#7B5A1E]">{recipient.statusLabel}</span>
                </label>
              ))}
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-[#FFFDF8] p-3 text-sm font-bold leading-6 text-[#3A2A1C]">
              {openEvent.preview}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy || selected.length === 0}
                onClick={() => void send(openEvent, selected)}
                className="rounded-2xl bg-[#3A2A1C] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                אישור ושליחה
              </button>
              <button
                type="button"
                onClick={() => setOpenEventId(null)}
                className="rounded-2xl border border-[#E7D8C6] px-4 py-2 text-sm font-black text-[#3A2A1C]"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
