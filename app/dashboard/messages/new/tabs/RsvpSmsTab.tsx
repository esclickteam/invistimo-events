"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
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

function splitByHalf<T>(
  list: T[],
  half: "first" | "second" | null
) {
  if (!half) return list;

  const mid = Math.ceil(list.length / 2);

  if (half === "first") {
    return list.slice(0, mid);
  }

  return list.slice(mid);
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

  // 🔹 בחירת חצי (לא חובה)
  const [half, setHalf] = useState<HalfType>(null);
  const [scheduledAt] = useState<Date | null>(null);


  /* ================= LOAD DATA ================= */

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

    if (invitationId) {
      loadGuests();
    }
  }, [invitationId]);

  /* ================= DERIVED ================= */

  // 🔒 SMS נשלח רק למי שטרם ענה
  const pendingGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "pending"),
    [guests]
  );

  const guestsToSend = useMemo(() => {
    return splitByHalf(pendingGuests, half);
  }, [pendingGuests, half]);

  const noAudience = guestsToSend.length === 0;

  /* ================= UI ================= */

  if (loading) {
    return <p>טוען אורחים…</p>;
  }

  return (
    <div className="space-y-6">
      {/* ===== Audience (read only) ===== */}
      <AudienceFilterSelector
        value="pending"
        onChange={() => {}}
        pendingCount={pendingGuests.length}
        readOnly
        allowedFilters={["pending"]}
      />

      {/* ===== Half selector (optional) ===== */}
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

      {/* ===== Send ===== */}
      <SendButton
  channel="sms"
  type="rsvp"
  invitationId={invitationId}
  audience={guestsToSend.map((g) => g._id)}
  scheduledAt={scheduledAt}   // ⭐️ זה החסר
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
