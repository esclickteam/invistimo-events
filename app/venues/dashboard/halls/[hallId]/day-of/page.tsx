"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

type DayEvent = {
  venueEventId: string;
  eventId: string;
  title: string;
  clientName: string;
  startTime: string;
  status: string;
  guests: {
    groups: number;
    expected: number;
    rsvpYes: number;
    rsvpNo: number;
    rsvpPending: number;
    arrived: number;
  };
  customerLiveHref: string;
  venueEventHref: string;
};

export default function VenueDayOfPage() {
  const params = useParams();
  const search = useSearchParams();
  const hallId = decodeURIComponent(String(params?.hallId || ""));
  const dateParam = search.get("date") || new Date().toISOString().slice(0, 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hallName, setHallName] = useState("");
  const [events, setEvents] = useState<DayEvent[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    if (!hallId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodeURIComponent(
          hallId
        )}/day-of?date=${encodeURIComponent(dateParam)}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        setError(data?.message || "טעינה נכשלה");
        setEvents([]);
        return;
      }
      setHallName(data.hallName || hallId);
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [hallId, dateParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(needle) ||
        e.clientName.toLowerCase().includes(needle)
    );
  }, [events, q]);

  return (
    <div className="min-h-screen bg-[#f6f3ee] text-[#1f1a17] px-4 py-6 md:px-8" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-[#6b5f55]">מצב יום אירוע · Reception</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {hallName || "אולם"}
            </h1>
            <p className="mt-1 text-sm text-[#6b5f55]">תאריך: {dateParam}</p>
          </div>
          <Link
            href={`/venues/dashboard/halls/${encodeURIComponent(hallId)}`}
            className="rounded-xl border border-[#d9cfc3] bg-white px-4 py-2 text-sm"
          >
            חזרה לאולם
          </Link>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש אירוע / לקוח"
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

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#d9cfc3] bg-white px-4 py-10 text-center text-[#6b5f55]">
            אין אירועים מאומתים לאולם בתאריך זה
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((ev) => (
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
                    RSVP ✓{ev.guests.rsvpYes} ✗{ev.guests.rsvpNo} ?{ev.guests.rsvpPending}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={ev.customerLiveHref}
                  className="rounded-xl bg-[#2b211c] px-4 py-2.5 text-sm font-medium text-white"
                >
                  קבלת אורחים (Live)
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
      </div>
    </div>
  );
}
