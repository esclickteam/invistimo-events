"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import TextMessagePreview from "../shared/TextMessagePreview";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  token?: string;
  rsvp?: "yes" | "no" | "pending";
};

type Props = {
  invitationId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
};

/* ================= HELPERS ================= */

type HalfType = "first" | "second" | null;

function splitByHalf<T>(list: T[], half: HalfType) {
  if (!half) return list;
  const mid = Math.ceil(list.length / 2);
  return half === "first" ? list.slice(0, mid) : list.slice(mid);
}

function buildRsvpSmsText({
  guest,
  invitationId,
  eventTitle,
  eventDate,
  eventLocation,
}: {
  guest: Guest;
  invitationId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
}) {
  const rsvpLink = `https://www.invistimo.com/invite/${invitationId}?token=${
    guest.token ?? guest._id
  }`;

  return `היי ${guest.name},
🎉 נשמח לדעת אם תגיעו לחגוג איתנו

${eventTitle ? `${eventTitle}\n` : ""}📅 ${eventDate}
📍 ${eventLocation}

לאישור הגעה לחצו כאן:
${rsvpLink}

מחכים לכם באהבה 💖`;
}

/* ================= COMPONENT ================= */

export default function RsvpSmsTab({
  invitationId,
  eventTitle,
  eventDate,
  eventLocation,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [half, setHalf] = useState<HalfType>(null);
  const [scheduledAt] = useState<Date | null>(null);

  /* ================= LOAD GUESTS ================= */

  useEffect(() => {
    async function loadGuests() {
      try {
        setLoading(true);
        const res = await fetch(`/api/guests?invitation=${invitationId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (Array.isArray(data?.guests)) {
          setGuests(data.guests);
        }
      } catch (err) {
        console.error("❌ Failed to load guests for SMS", err);
      } finally {
        setLoading(false);
      }
    }

    if (invitationId) loadGuests();
  }, [invitationId]);

  /* ================= DERIVED ================= */

  const pendingGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "pending"),
    [guests]
  );

  const guestsToSend = useMemo(
    () => splitByHalf(pendingGuests, half),
    [pendingGuests, half]
  );

  const previewGuest = guestsToSend[0] ?? null;
  const noAudience = guestsToSend.length === 0;

  const previewText = previewGuest
    ? buildRsvpSmsText({
        guest: previewGuest,
        invitationId,
        eventTitle,
        eventDate,
        eventLocation,
      })
    : "";

  /* ================= UI ================= */

  if (loading) return <p>טוען אורחים…</p>;

  return (
    <div className="space-y-6">
      {/* ===== Audience ===== */}
      <AudienceFilterSelector
        value="pending"
        onChange={() => {}}
        pendingCount={pendingGuests.length}
        readOnly
        allowedFilters={["pending"]}
      />

      {/* ===== Half selector ===== */}
      <div>
        <h3 className="font-semibold mb-2">📊 שליחה לפי חצי רשימה</h3>

        <select
          value={half ?? ""}
          onChange={(e) =>
            setHalf(e.target.value === "" ? null : (e.target.value as HalfType))
          }
          className="w-full border rounded-xl p-3 text-sm"
        >
          <option value="">כולם (ללא פיצול)</option>
          <option value="first">חצי ראשון של הרשימה</option>
          <option value="second">חצי שני של הרשימה</option>
        </select>

        <p className="text-xs text-gray-500 mt-1">
          ברירת מחדל – שליחה לכל מי שטרם ענה
        </p>
      </div>

      {/* ===== Summary ===== */}
      <p className="text-sm text-center text-gray-700">
        הודעת SMS תישלח ל־{guestsToSend.length} מוזמנים
      </p>

      {/* ===== Preview ===== */}
      <TextMessagePreview
        channel="sms"
        text={previewText}
        loading={!previewGuest}
      />

      {/* ===== Send ===== */}
      <SendButton
        channel="sms"
        type="rsvp"
        invitationId={invitationId}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={noAudience}
      >
        📩 שלח אישור הגעה SMS
      </SendButton>

      {noAudience && (
        <p className="text-sm text-red-500 text-center">
          אין נמענים לשליחה
        </p>
      )}
    </div>
  );
}
