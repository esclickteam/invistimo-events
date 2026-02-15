"use client";

import { useMemo, useState, useEffect } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import WhatsappTemplatePreview from "../shared/WhatsappTemplatePreview";
import GuestAutocomplete from "@/app/components/GuestAutocomplete";

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
  headerImageUrl?: string;
};

/* ================= HELPERS ================= */

function getRsvpPreviewText({
  eventTitle,
  eventDate,
  eventLocation,
}: {
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
}) {
  return `משפחה וחברים יקרים,
הנכם מוזמנים ל- ${eventTitle} 🤍

📅 תאריך: ${eventDate}
📍 מיקום: ${eventLocation}

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
}

/* ================= COMPONENT ================= */

export default function RsvpTab({
  invitationId,
  eventTitle,
  eventDate,
  eventLocation,
  headerImageUrl,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [round, setRound] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");

  const [round1SentAt, setRound1SentAt] = useState<Date | null>(null);
  const [round2SentAt, setRound2SentAt] = useState<Date | null>(null);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [guestsRes, invitationRes] = await Promise.all([
          fetch(`/api/guests?invitation=${invitationId}`),
          fetch(`/api/invitations/${invitationId}`),
        ]);

        const guestsData = await guestsRes.json();
        const invitationData = await invitationRes.json();

        if (Array.isArray(guestsData.guests)) {
          setGuests(guestsData.guests);
        }

        const inv = invitationData?.invitation;
        if (inv?.rsvpRound1SentAt) {
          setRound1SentAt(new Date(inv.rsvpRound1SentAt));
        }
        if (inv?.rsvpRound2SentAt) {
          setRound2SentAt(new Date(inv.rsvpRound2SentAt));
        }
      } catch (err) {
        console.error("❌ Failed to load RSVP data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId]);

  /* ================= RESET SELECTION ON ROUND CHANGE ================= */

  useEffect(() => {
    setSelectedGuestId("");
  }, [round]);

  /* ================= DERIVED ================= */

  const baseAudience =
    round === 1
      ? guests
      : guests.filter((g) => g.rsvp === "pending");

  const selectedGuest =
    baseAudience.find((g) => g._id === selectedGuestId) || null;

  const previewText = useMemo(
    () =>
      getRsvpPreviewText({
        eventTitle,
        eventDate,
        eventLocation,
      }),
    [eventTitle, eventDate, eventLocation]
  );

  const noAudience = baseAudience.length === 0;
  const missingHeaderImage = !headerImageUrl;

  const blocked =
    loading ||
    noAudience ||
    missingHeaderImage ||
    (round === 1 && !!round1SentAt) ||
    (round === 2 && !!round2SentAt);

  /* ================= MANUAL WHATSAPP ================= */

  const openManualWhatsApp = (guest: Guest) => {
    if (!guest.phone) {
      alert(`אין מספר טלפון לאורח ${guest.name}`);
      return;
    }

    const normalized = normalizePhone(guest.phone);

    if (!normalized) {
      alert("מספר טלפון לא תקין");
      return;
    }

    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(
      previewText
    )}`;

    window.open(url, "_blank");
  };

  const sendManual = () => {
    if (blocked) return;

    if (selectedGuest) {
      openManualWhatsApp(selectedGuest);
      alert("נפתח WhatsApp לאורח הנבחר");
      return;
    }

    alert(
      "שליחה ידנית לכולם תפתח לשונית WhatsApp עבור כל אורח.\nמומלץ לבחור אורח ספציפי."
    );
  };

  if (loading) return <p>טוען אורחים...</p>;

  /* ================= UI ================= */

  return (
    <div className="space-y-6 p-6">

      {/* ROUNDS */}
      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded-xl font-medium border ${
            round === 1 ? "bg-blue-600 text-white" : "border-gray-300"
          }`}
          onClick={() => setRound(1)}
        >
          סבב 1 – לכולם {round1SentAt ? "(נשלח)" : ""}
        </button>

        <button
          className={`flex-1 py-2 rounded-xl font-medium border ${
            round === 2 ? "bg-blue-600 text-white" : "border-gray-300"
          }`}
          onClick={() => setRound(2)}
        >
          סבב 2 – למי שטרם ענה {round2SentAt ? "(נשלח)" : ""}
        </button>
      </div>

      {/* AUDIENCE SUMMARY */}
      <AudienceFilterSelector
        value={round === 1 ? "all" : "pending"}
        onChange={() => {}}
        totalCount={guests.length}
        pendingCount={guests.filter((g) => g.rsvp === "pending").length}
        readOnly
      />

      {/* GUEST AUTOCOMPLETE */}
      <div className="w-full max-w-[600px]">
        <label className="block mb-2 font-semibold text-[#4a413a]">
          שליחה לאורח ספציפי (אופציונלי)
        </label>

        <GuestAutocomplete
          guests={baseAudience}
          value={selectedGuest}
          onSelect={(id: string) => setSelectedGuestId(id)}
        />

        {selectedGuest && (
          <button
            onClick={() => setSelectedGuestId("")}
            className="text-xs text-blue-600 mt-2 underline"
          >
            ניקוי בחירה – שלח לכולם
          </button>
        )}
      </div>

      {/* PREVIEW */}
      <WhatsappTemplatePreview
        templateKey="rsvp"
        previewText={previewText}
        headerImageUrl={headerImageUrl}
      />

      {/* MANUAL SEND BUTTON (AFTER PREVIEW) */}
      <button
        onClick={sendManual}
        disabled={blocked}
        className="w-full max-w-[600px] bg-green-600 text-white py-4 rounded-xl font-semibold disabled:opacity-50"
      >
        {blocked
          ? "🚫 לא ניתן לשלוח"
          : selectedGuest
          ? "📲 פתח WhatsApp לאורח"
          : "📲 בחר אורח לשליחה ידנית"}
      </button>

      {noAudience && (
        <p className="text-sm text-red-500">
          אין נמענים לשליחה בסבב זה
        </p>
      )}
    </div>
  );
}
