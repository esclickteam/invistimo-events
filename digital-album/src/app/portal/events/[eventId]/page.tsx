"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

type EventData = {
  event: {
    id: string;
    slug: string;
    hostNames: string;
    title: string;
    uploadMode: string;
    mediaAllowed: string;
    faceAiEnabled: boolean;
    requireApproval: boolean;
    allowDownload: boolean;
    allowZip: boolean;
    status: string;
    stories: { id: string; title: string; sortOrder: number }[];
  };
  pendingApproval: number;
};

type MediaItem = {
  id: string;
  type: string;
  status: string;
  thumbUrl: string | null;
  url: string;
  originalName: string;
};

const uploadLabels: Record<string, string> = {
  GUESTS_ONLY: "אורחים בלבד",
  OWNERS_ONLY: "בעלי השמחה בלבד",
  EVERYONE: "כולם",
};

export default function EventManagePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const [data, setData] = useState<EventData | null>(null);
  const [pending, setPending] = useState<MediaItem[]>([]);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  async function reload() {
    const [ev, media] = await Promise.all([
      fetch(`/api/portal/events/${eventId}`).then((r) => r.json()),
      fetch(`/api/portal/events/${eventId}/media?status=PENDING_APPROVAL`).then((r) =>
        r.json()
      ),
    ]);
    if (ev.ok) {
      setData(ev.data);
      setLoadError("");
    } else {
      setLoadError(ev.error || "לא ניתן לטעון את האירוע");
    }
    if (media.ok) setPending(media.data.media);
  }

  useEffect(() => {
    void reload();
    // intentionally reload when event changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function setUploadMode(mode: string) {
    const res = await fetch(`/api/portal/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadMode: mode }),
    });
    const json = await res.json();
    if (json.ok) {
      setMessage("מצב ההעלאה עודכן ונאכף מיד");
      reload();
    } else setMessage(json.error);
  }

  async function toggleFaceAi(enabled: boolean) {
    const res = await fetch(`/api/portal/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faceAiEnabled: enabled }),
    });
    const json = await res.json();
    if (json.ok) {
      setMessage(
        enabled && !json.data.event.faceAiEnabled
          ? "זיהוי פנים נשאר כבוי עד שהספק מאושר ומופעל בסביבה"
          : "נשמר"
      );
      reload();
    } else setMessage(json.error);
  }

  async function moderate(action: "approve" | "reject" | "delete", ids: string[]) {
    const res = await fetch(`/api/portal/events/${eventId}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, mediaIds: ids }),
    });
    const json = await res.json();
    if (json.ok) {
      setMessage(action === "approve" ? "אושר ויופיע בגלריה" : "עודכן");
      reload();
    } else setMessage(json.error);
  }

  if (loadError) {
    return <p className="text-red-700">{loadError}</p>;
  }
  if (!data) return <p className="text-[var(--muted)]">טוען…</p>;
  const { event } = data;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">{event.hostNames}</h1>
          <p className="mt-1 text-[var(--muted)]">{event.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/a/${event.slug}`} className="btn-ghost text-sm" target="_blank">
            פתיחת האלבום
          </Link>
          <Link href={`/live/${event.slug}`} className="btn-ghost text-sm" target="_blank">
            מסך LIVE
          </Link>
          <Link href={`/portal/events/${eventId}/upload`} className="btn-gold text-sm">
            העלאת תכנים
          </Link>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-xl bg-[var(--gold-soft)] px-4 py-3 text-sm">{message}</p>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-3xl mb-2">הגדרות העלאה</h2>
        <p className="text-[var(--muted)] mb-5">מי יכול להעלות תמונות וסרטונים לאלבום?</p>
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              ["GUESTS_ONLY", "אורחים בלבד", "רק האורחים יכולים להעלות"],
              ["OWNERS_ONLY", "בעלי השמחה בלבד", "רק אתם והמורשים מטעמכם"],
              ["EVERYONE", "כולם", "אורחים ובעלי השמחה"],
            ] as const
          ).map(([mode, title, desc]) => (
            <button
              key={mode}
              type="button"
              className="upload-option"
              data-selected={event.uploadMode === mode}
              onClick={() => setUploadMode(mode)}
            >
              <div className="font-medium">{title}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{desc}</div>
              {event.uploadMode === mode ? (
                <div className="mt-3 text-[var(--gold-deep)] text-sm">✓ נבחר</div>
              ) : null}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          מצב נוכחי: {uploadLabels[event.uploadMode]} · סוגי קבצים: {event.mediaAllowed}
        </p>
      </section>

      <section className="mt-10 surface p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl">חיפושי פנים באמצעות AI</h2>
          <p className="text-sm text-[var(--muted)] mt-1 max-w-xl">
            מאפשר לאורחים למצוא את עצמם בתמונות. לא יוצג כאקטיבי באלבום עד שהאינטגרציה
            עובדת ונבדקה.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={event.faceAiEnabled}
          onClick={() => toggleFaceAi(!event.faceAiEnabled)}
          className="relative h-8 w-14 rounded-full border border-[var(--line)] transition"
          style={{
            background: event.faceAiEnabled ? "var(--gold)" : "var(--stone)",
          }}
        >
          <span
            className="absolute top-0.5 h-7 w-7 rounded-full bg-white shadow transition"
            style={{
              insetInlineStart: event.faceAiEnabled ? "calc(100% - 1.85rem)" : "0.15rem",
            }}
          />
        </button>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-3xl">
            תמונות להמתנה לאישור
            <span className="ms-2 text-[var(--gold-deep)] text-2xl">
              ({data.pendingApproval})
            </span>
          </h2>
          {pending.length ? (
            <Button
              variant="gold"
              className="text-sm"
              onClick={() => moderate("approve", pending.map((p) => p.id))}
            >
              אישור הכל
            </Button>
          ) : null}
        </div>
        {pending.length === 0 ? (
          <div className="surface p-6 text-[var(--muted)]">אין פריטים ממתינים.</div>
        ) : (
          <div className="story-rail">
            {pending.map((m) => (
              <div key={m.id} className="story-card w-[160px]">
                <div className="story-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumbUrl || m.url} alt={m.originalName} />
                </div>
                <div className="mt-2 flex gap-1 justify-center">
                  <button
                    className="pill text-xs"
                    onClick={() => moderate("approve", [m.id])}
                  >
                    אישור
                  </button>
                  <button
                    className="pill text-xs"
                    onClick={() => moderate("reject", [m.id])}
                  >
                    דחייה
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {event.stories?.length ? (
        <section className="mt-10">
          <h2 className="font-display text-3xl mb-4">רגעי האירוע</h2>
          <div className="story-rail">
            {event.stories.map((s, i) => (
              <div key={s.id} className="story-card">
                <div className="story-thumb">
                  <span className="story-num">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <p className="mt-2 text-sm">{s.title}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10 surface p-5">
        <h2 className="font-display text-2xl mb-2">שיתוף</h2>
        <p className="text-sm text-[var(--muted)] break-all">
          קישור האלבום: {typeof window !== "undefined" ? window.location.origin : ""}/a/
          {event.slug}
        </p>
        <p className="text-sm text-[var(--muted)] mt-2">
          QR להדפסה: /api/public/qr/{event.slug} (יוצר קישור לאלבום)
        </p>
      </section>
    </div>
  );
}
