"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type GuestSummary = {
  groups: number;
  expected: number;
  rsvpYes: number;
  rsvpNo: number;
  rsvpPending: number;
  arrived: number;
};

type DayEvent = {
  venueEventId: string;
  eventId: string;
  title: string;
  clientName: string;
  startTime: string;
  status: string;
  guests: GuestSummary;
  canEditGuests?: boolean;
  receptionHref?: string;
  customerLiveHref: string;
  seatingLiveHref?: string;
  venueEventHref: string;
};

type DayGuest = {
  id: string;
  name: string;
  phone: string;
  side: string;
  rsvp: "yes" | "no" | "pending";
  expected: number;
  arrived: number;
  tableId: string;
  tableName: string;
  notes: string;
};

export default function VenueDayOfPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const hallId = decodeURIComponent(String(params?.hallId || ""));
  const dateParam = search.get("date") || new Date().toISOString().slice(0, 10);
  const eventIdParam = search.get("eventId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hallName, setHallName] = useState("");
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [eventDetail, setEventDetail] = useState<DayEvent | null>(null);
  const [guests, setGuests] = useState<DayGuest[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [q, setQ] = useState("");
  const [busyGuestId, setBusyGuestId] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    if (!hallId) return;
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ date: dateParam });
      if (eventIdParam) qs.set("eventId", eventIdParam);

      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(
          hallId
        )}/day-of?${qs.toString()}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.message || "טעינה נכשלה");
        setEvents([]);
        setGuests([]);
        setEventDetail(null);
        return;
      }
      setHallName(data.hallName || hallId);
      setCanEdit(Boolean(data.canEditGuests || data.event?.canEditGuests));

      if (eventIdParam) {
        setEventDetail(data.event || null);
        setGuests(Array.isArray(data.guests) ? data.guests : []);
        setEvents([]);
      } else {
        setEvents(Array.isArray(data.events) ? data.events : []);
        setEventDetail(null);
        setGuests([]);
      }
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [hallId, dateParam, eventIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredEvents = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || eventIdParam) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(needle) ||
        e.clientName.toLowerCase().includes(needle)
    );
  }, [events, q, eventIdParam]);

  const filteredGuests = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return guests;
    return guests.filter(
      (g) =>
        g.name.toLowerCase().includes(needle) ||
        g.phone.includes(q.trim()) ||
        g.tableName.toLowerCase().includes(needle)
    );
  }, [guests, q]);

  const mutateGuest = async (
    guestId: string,
    body: Record<string, unknown>
  ) => {
    if (!eventIdParam || !canEdit) return;
    setBusyGuestId(guestId);
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(hallId)}/day-of`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: eventIdParam, guestId, ...body }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setToast(data?.message || "עדכון נכשל");
        return;
      }
      if (data.guest) {
        setGuests((prev) =>
          prev.map((g) => (g.id === guestId ? { ...g, ...data.guest } : g))
        );
        setToast("עודכן");
        void load();
      }
    } catch {
      setToast("שגיאת רשת");
    } finally {
      setBusyGuestId("");
    }
  };

  const setDate = (next: string) => {
    const qs = new URLSearchParams();
    qs.set("date", next);
    if (eventIdParam) qs.set("eventId", eventIdParam);
    router.push(
      `/venues/dashboard/halls/${encodeURIComponent(hallId)}/day-of?${qs}`
    );
  };

  const openEvent = (eventId: string) => {
    const qs = new URLSearchParams({ date: dateParam, eventId });
    router.push(
      `/venues/dashboard/halls/${encodeURIComponent(hallId)}/day-of?${qs}`
    );
  };

  const backToList = () => {
    router.push(
      `/venues/dashboard/halls/${encodeURIComponent(
        hallId
      )}/day-of?date=${encodeURIComponent(dateParam)}`
    );
  };

  const summary = eventDetail?.guests;

  return (
    <div
      className="min-h-screen bg-[#f6f3ee] text-[#1f1a17] px-3 py-4 md:px-8 md:py-6"
      dir="rtl"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-[#6b5f55]">מצב יום אירוע · Reception</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {hallName || "אולם"}
            </h1>
            {eventDetail ? (
              <p className="mt-1 text-sm text-[#6b5f55]">
                {eventDetail.title} · {eventDetail.clientName || "לקוח"} ·{" "}
                {eventDetail.startTime || "—"}
              </p>
            ) : (
              <p className="mt-1 text-sm text-[#6b5f55]">תאריך: {dateParam}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {eventIdParam ? (
              <button
                type="button"
                onClick={backToList}
                className="rounded-xl border border-[#d9cfc3] bg-white px-4 py-2 text-sm"
              >
                כל האירועים
              </button>
            ) : null}
            <Link
              href={`/venues/dashboard/halls/${encodeURIComponent(hallId)}`}
              className="rounded-xl border border-[#d9cfc3] bg-white px-4 py-2 text-sm"
            >
              חזרה לאולם
            </Link>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="date"
            value={dateParam}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-[#d9cfc3] bg-white px-4 py-3 text-base outline-none focus:border-[#8a6a4a]"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              eventIdParam ? "חיפוש אורח / טלפון / שולחן" : "חיפוש אירוע / לקוח"
            }
            className="w-full rounded-xl border border-[#d9cfc3] bg-white px-4 py-3 text-base outline-none focus:border-[#8a6a4a]"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-[#2b211c] px-5 py-3 text-sm font-medium text-white"
          >
            רענון
          </button>
        </div>

        {toast ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {toast}
          </div>
        ) : null}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-[#e8e0d6]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        {/* Event list */}
        {!loading && !error && !eventIdParam && (
          <>
            {filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9cfc3] bg-white px-4 py-10 text-center text-[#6b5f55]">
                אין אירועים מאומתים לאולם בתאריך זה
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((ev) => (
                  <article
                    key={ev.eventId}
                    className="rounded-2xl border border-[#e4d9cc] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold">{ev.title}</h2>
                        <p className="text-sm text-[#6b5f55]">
                          {ev.clientName || "לקוח"} · {ev.startTime || "—"} ·{" "}
                          {ev.status}
                        </p>
                      </div>
                      <div className="text-left text-sm">
                        <div>
                          הגיעו {ev.guests.arrived}/{ev.guests.expected}
                        </div>
                        <div className="text-[#6b5f55]">
                          RSVP ✓{ev.guests.rsvpYes} ✗{ev.guests.rsvpNo} ?
                          {ev.guests.rsvpPending}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEvent(ev.eventId)}
                        className="rounded-xl bg-[#2b211c] px-4 py-2.5 text-sm font-medium text-white"
                      >
                        קבלה · אורחים
                      </button>
                      <Link
                        href={ev.customerLiveHref}
                        className="rounded-xl border border-[#d9cfc3] bg-[#faf7f2] px-4 py-2.5 text-sm"
                      >
                        Live מלא
                      </Link>
                      <Link
                        href={ev.venueEventHref}
                        className="rounded-xl border border-[#d9cfc3] bg-[#faf7f2] px-4 py-2.5 text-sm"
                      >
                        פרטי אירוע
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* Reception guest ops */}
        {!loading && !error && eventIdParam && eventDetail && (
          <>
            {summary ? (
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="הגיעו" value={`${summary.arrived}/${summary.expected}`} />
                <Stat label="RSVP ✓" value={String(summary.rsvpYes)} />
                <Stat label="RSVP ✗" value={String(summary.rsvpNo)} />
                <Stat label="ממתינים" value={String(summary.rsvpPending)} />
              </div>
            ) : null}

            <div className="mb-3 flex flex-wrap gap-2">
              <Link
                href={eventDetail.customerLiveHref}
                className="rounded-xl border border-[#d9cfc3] bg-white px-3 py-2 text-sm"
              >
                Live מלא
              </Link>
              {eventDetail.seatingLiveHref ? (
                <Link
                  href={eventDetail.seatingLiveHref}
                  className="rounded-xl border border-[#d9cfc3] bg-white px-3 py-2 text-sm"
                >
                  הושבה לייב
                </Link>
              ) : null}
              <Link
                href={eventDetail.venueEventHref}
                className="rounded-xl border border-[#d9cfc3] bg-white px-3 py-2 text-sm"
              >
                פרטי אירוע
              </Link>
            </div>

            {!canEdit ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                צפייה בלבד — אין הרשאת guests.edit לסימון הגעה
              </div>
            ) : null}

            {filteredGuests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d9cfc3] bg-white px-4 py-10 text-center text-[#6b5f55]">
                אין אורחים תואמים
              </div>
            ) : (
              <div className="space-y-2">
                {filteredGuests.map((g) => {
                  const busy = busyGuestId === g.id;
                  const arrived = g.arrived > 0;
                  return (
                    <article
                      key={g.id}
                      className={`rounded-2xl border bg-white p-3 shadow-sm ${
                        arrived ? "border-emerald-200" : "border-[#e4d9cc]"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold">{g.name}</h3>
                          <p className="text-xs text-[#6b5f55]">
                            {g.phone || "ללא טלפון"}
                            {g.tableName ? ` · שולחן ${g.tableName}` : " · ללא שולחן"}
                            {` · RSVP ${
                              g.rsvp === "yes"
                                ? "✓"
                                : g.rsvp === "no"
                                  ? "✗"
                                  : "?"
                            }`}
                            {` · צפוי ${g.expected}`}
                          </p>
                        </div>
                        <div className="text-sm font-medium">
                          הגיעו {g.arrived}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!canEdit || busy}
                          onClick={() =>
                            void mutateGuest(g.id, { action: "mark_arrived" })
                          }
                          className="rounded-xl bg-[#2b211c] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                        >
                          הגיע
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit || busy}
                          onClick={() =>
                            void mutateGuest(g.id, {
                              action: "mark_not_arrived",
                            })
                          }
                          className="rounded-xl border border-[#d9cfc3] bg-[#faf7f2] px-3 py-2 text-sm disabled:opacity-40"
                        >
                          לא הגיע
                        </button>
                        <label className="flex items-center gap-2 text-sm text-[#6b5f55]">
                          כמות
                          <input
                            type="number"
                            min={0}
                            max={g.expected + 20}
                            defaultValue={g.arrived}
                            key={`${g.id}-${g.arrived}`}
                            disabled={!canEdit || busy}
                            onBlur={(e) => {
                              const n = Math.max(
                                0,
                                Math.floor(Number(e.target.value) || 0)
                              );
                              if (n === g.arrived) return;
                              void mutateGuest(g.id, {
                                action: "set_arrived",
                                actualArrivedCount: n,
                              });
                            }}
                            className="w-16 rounded-lg border border-[#d9cfc3] bg-white px-2 py-1.5 text-center outline-none disabled:opacity-40"
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e4d9cc] bg-white px-3 py-3">
      <div className="text-xs text-[#6b5f55]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
