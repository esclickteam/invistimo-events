"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TodayEvent = {
  eventId: string;
  title: string;
  timeLabel: string;
  href: string;
  problems: string[];
  needsAttention: boolean;
};

type TodayBoard = {
  dateKey: string;
  eventCount: number;
  attentionCount: number;
  missingTeam: boolean;
  missingCritical: boolean;
  roundsNeedAttention: boolean;
  events: TodayEvent[];
};

function flagSentence(board: TodayBoard) {
  const flags = [
    board.missingTeam ? "צוותי הושבה חסרים" : "",
    board.missingCritical ? "נתונים קריטיים חסרים" : "",
    board.roundsNeedAttention ? "סבבים שדורשים טיפול" : "",
  ].filter(Boolean);
  if (!flags.length) return "אין צוותי הושבה חסרים, נתונים קריטיים חסרים או סבבים שדורשים טיפול.";
  return `קיימים ${flags.join(", ")}.`;
}

export default function AdminTodayEventsPage() {
  const [board, setBoard] = useState<TodayBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/today", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.success) {
          setError("לא ניתן לטעון את אירועי היום.");
          return;
        }
        setBoard(data);
      } catch {
        if (!cancelled) setError("לא ניתן לטעון את אירועי היום.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div dir="rtl" className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--admin-text)] sm:text-xl">סיכום אירועים להיום</h1>
        <p className="mt-1 text-xs font-medium text-[var(--admin-muted)]">
          {board?.dateKey ? `תאריך ${board.dateKey}` : "אירועים פעילים שמתקיימים היום"}
        </p>
      </div>

      {loading ? <p className="text-sm text-[var(--admin-muted)]">טוען…</p> : null}
      {error ? <p className="text-sm font-medium text-[#C62828]">{error}</p> : null}

      {board ? (
        <>
          <section className="rounded-xl border border-[var(--admin-border)] bg-white p-4">
            <p className="text-sm font-semibold text-[var(--admin-text)]">
              {board.eventCount === 1
                ? "היום מתקיים אירוע אחד."
                : `היום מתקיימים ${board.eventCount} אירועים.`}
            </p>
            <p className="mt-1 text-sm text-[var(--admin-text)]">
              {board.attentionCount === 0
                ? "אין אירועים שדורשים טיפול."
                : board.attentionCount === 1
                  ? "אירוע אחד דורש טיפול."
                  : `${board.attentionCount} אירועים דורשים טיפול.`}
            </p>
            <p className="mt-1 text-sm text-[var(--admin-text)]">{flagSentence(board)}</p>
          </section>

          {board.events.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">אין אירועים פעילים להיום.</p>
          ) : (
            <ul className="space-y-3">
              {board.events.map((event) => (
                <li
                  key={event.eventId}
                  className="rounded-xl border border-[var(--admin-border)] bg-white p-4"
                  style={event.needsAttention ? { background: "#FFF6F3" } : undefined}
                >
                  <h2 className="text-sm font-bold text-[var(--admin-text)]">{event.title}</h2>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {event.timeLabel ? `שעה ${event.timeLabel}` : "שעה לא הוגדרה"}
                  </p>
                  {event.problems.length ? (
                    <ul className="mt-3 space-y-1 text-sm text-[var(--admin-text)]">
                      {event.problems.map((problem) => (
                        <li key={problem}>• {problem}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--admin-muted)]">אין בעיות פתוחות לאירוע הזה.</p>
                  )}
                  <Link
                    href={event.href}
                    className="mt-3 inline-flex items-center rounded-lg bg-[var(--admin-text)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    פתיחת האירוע
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
