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
  rsvp?: "yes" | "no" | "pending";
  token?: string;
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

/* ================= MESSAGE TEMPLATE ================= */

const RSVP_SMS_TEMPLATE =
  "היי {{name}},\n" +
  "נשמח לדעת אם תגיעו ל־{{eventTitle}} 🎉\n\n" +
  "לאישור הגעה לחצו כאן:\n" +
  "{{rsvpLink}}\n\n" +
  "מחכים לכם באהבה 💖";

/* ================= COMPONENT ================= */

export default function RsvpSmsTab({
  invitationId,
  eventTitle,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [half, setHalf] = useState<HalfType>(null);

  // ⭐️ state מקומי לשם האירוע (ל־Preview)
  const [localEventTitle, setLocalEventTitle] = useState(eventTitle);

  // ⭐️ סנכרון אם מגיע eventTitle חדש מהשרת
  useEffect(() => {
    setLocalEventTitle(eventTitle);
  }, [eventTitle]);

  /* ================= LOAD GUESTS ================= */

  useEffect(() => {
    async function loadGuests() {
      try {
        setLoading(true);
        const res = await fetch(`/api/guests?invitation=${invitationId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        setGuests(Array.isArray(data?.guests) ? data.guests : []);
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

  const sortedPendingGuests = useMemo(() => {
    return [...pendingGuests].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "he")
    );
  }, [pendingGuests]);

  const mid = Math.ceil(sortedPendingGuests.length / 2);
  const firstHalfCount = sortedPendingGuests.slice(0, mid).length;
  const secondHalfCount = sortedPendingGuests.slice(mid).length;

  const guestsToSend = useMemo(
    () => splitByHalf(sortedPendingGuests, half),
    [sortedPendingGuests, half]
  );

  const noAudience = guestsToSend.length === 0;

  /* ================= PREVIEW TEXT ================= */

  const previewText = useMemo(() => {
    const g = guestsToSend[0];
    if (!g || !g.token) return "";

    const rsvpLink = `https://www.invistimo.com/invite/${invitationId}?token=${g.token}`;

    return RSVP_SMS_TEMPLATE
      .replace(/{{name}}/g, g.name || "")
      .replace(/{{eventTitle}}/g, localEventTitle || "")
      .replace(/{{rsvpLink}}/g, rsvpLink);
  }, [guestsToSend, invitationId, localEventTitle]);

  /* ================= UI ================= */

  if (loading) return <p>טוען אורחים…</p>;

  return (
    <div className="space-y-6">
      <AudienceFilterSelector
        value="pending"
        onChange={() => {}}
        pendingCount={pendingGuests.length}
        readOnly
        allowedFilters={["pending"]}
      />

      {/* OPTIONAL: אם תרצי בעתיד שדה עריכה */}
      {/*
      <input
        value={localEventTitle}
        onChange={(e) => setLocalEventTitle(e.target.value)}
        className="w-full border rounded-xl p-3 text-sm"
        placeholder="שם האירוע"
      />
      */}

      {/* HALF SELECTOR */}
      <div>
        <h3 className="font-semibold mb-2">📊 שליחה לפי חצי רשימה</h3>

        <select
          value={half ?? ""}
          onChange={(e) =>
            setHalf(
              e.target.value === ""
                ? null
                : (e.target.value as HalfType)
            )
          }
          className="w-full border rounded-xl p-3 text-sm"
        >
          <option value="">
            כולם (ללא פיצול) – {sortedPendingGuests.length}
          </option>
          <option value="first">
            חצי ראשון של הרשימה – {firstHalfCount}
          </option>
          <option value="second">
            חצי שני של הרשימה – {secondHalfCount}
          </option>
        </select>

        <p className="text-xs text-gray-500 mt-1">
          החצי נקבע לפי סדר אלפביתי של המוזמנים
        </p>
      </div>

      {/* SUMMARY */}
      <p className="text-sm text-center text-gray-700">
        הודעת SMS תישלח ל־{guestsToSend.length} מוזמנים
      </p>

      {/* PREVIEW */}
      {previewText && (
        <TextMessagePreview channel="sms" text={previewText} />
      )}

      {/* SEND */}
      <SendButton
        channel="sms"
        type="rsvp"
        invitationId={invitationId}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={null}
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
