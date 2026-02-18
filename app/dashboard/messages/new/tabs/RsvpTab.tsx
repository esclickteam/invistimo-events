"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import WhatsappTemplatePreview from "../shared/WhatsappTemplatePreview";

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

type GiftOptions = {
  creditEnabled: boolean;
  creditUrl: string;
  payboxEnabled: boolean;
  payboxUrl: string;
};

const RSVP_ROUND1_TEMPLATE = "rsvp_invitation_media";
const RSVP_ROUND2_TEMPLATE = "rsvp_reminder_invistimo";

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

function normalizeGiftOptions(raw: any): GiftOptions {
  const g = raw ?? {};
  return {
    creditEnabled: !!g.creditEnabled,
    creditUrl: String(g.creditUrl ?? ""),
    payboxEnabled: !!g.payboxEnabled,
    payboxUrl: String(g.payboxUrl ?? ""),
  };
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
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [round, setRound] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);

  // 🔒 מצב סבבים מהשרת
  const [round1SentAt, setRound1SentAt] = useState<Date | null>(null);
  const [round2SentAt, setRound2SentAt] = useState<Date | null>(null);

  // 🧍 אורח ספציפי (חדש)
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  // 🎁 Gift options
  const [giftOptions, setGiftOptions] = useState<GiftOptions>({
    creditEnabled: false,
    creditUrl: "",
    payboxEnabled: false,
    payboxUrl: "",
  });

  const [savingGift, setSavingGift] = useState(false);
  const [giftSaveError, setGiftSaveError] = useState<string>("");

  const giftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitGift = useRef(false);

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

        setGiftOptions(normalizeGiftOptions(inv?.giftOptions));
        didInitGift.current = true;
      } catch (err) {
        console.error("❌ Failed to load RSVP data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId]);

  /* ================= SAVE GIFT OPTIONS ================= */

  useEffect(() => {
    if (!didInitGift.current) return;

    if (giftSaveTimer.current) clearTimeout(giftSaveTimer.current);

    giftSaveTimer.current = setTimeout(async () => {
      try {
        setSavingGift(true);
        setGiftSaveError("");

        const payload: GiftOptions = {
          creditEnabled: !!giftOptions.creditEnabled,
          creditUrl: giftOptions.creditEnabled
            ? giftOptions.creditUrl.trim()
            : "",
          payboxEnabled: !!giftOptions.payboxEnabled,
          payboxUrl: giftOptions.payboxEnabled
            ? giftOptions.payboxUrl.trim()
            : "",
        };

        const res = await fetch(`/api/invitations/${invitationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ giftOptions: payload }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "FAILED_TO_SAVE_GIFT_OPTIONS");
        }
      } catch (e) {
        console.error("❌ Failed to save giftOptions", e);
        setGiftSaveError("לא הצלחנו לשמור את הגדרות המתנה. נסי שוב.");
      } finally {
        setSavingGift(false);
      }
    }, 500);

    return () => {
      if (giftSaveTimer.current) clearTimeout(giftSaveTimer.current);
    };
  }, [giftOptions, invitationId]);

  /* ================= DERIVED ================= */

  const guestsToSend = useMemo(() => {
    // 🧍 אם נבחר אורח ספציפי – שולחים רק אליו
    if (selectedGuestId) {
      return guests.filter((g) => g._id === selectedGuestId);
    }

    // ברירת מחדל – ההתנהגות הקיימת
    if (round === 1) return guests;
    return guests.filter((g) => g.rsvp === "pending");
  }, [guests, round, selectedGuestId]);

  const totalCount = guests.length;
  const pendingCount = guests.filter((g) => g.rsvp === "pending").length;

  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = !headerImageUrl;

  const blocked =
    loading ||
    noAudience ||
    missingHeaderImage ||
    (round === 1 && !!round1SentAt) ||
    (round === 2 && !!round2SentAt);

  const previewText = useMemo(
    () => getRsvpPreviewText({ eventTitle, eventDate, eventLocation }),
    [eventTitle, eventDate, eventLocation]
  );

  const templateName = round === 1 ? RSVP_ROUND1_TEMPLATE : RSVP_ROUND2_TEMPLATE;

  if (loading) return <p>טוען אורחים...</p>;

  /* ================= UI ================= */

  return (
    <div className="space-y-6 p-6">
      {/* ===== ROUNDS ===== */}
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

      {/* ===== AUDIENCE ===== */}
      <AudienceFilterSelector
        value={round === 1 ? "all" : "pending"}
        onChange={() => {}}
        totalCount={totalCount}
        pendingCount={pendingCount}
        readOnly
      />

      {/* ===== NEW: SINGLE GUEST SELECT ===== */}
      <div className="max-w-sm">
        <label className="block text-sm font-medium mb-1">
          שליחה לאורח ספציפי (אופציונלי)
        </label>

        <select
          value={selectedGuestId ?? ""}
          onChange={(e) =>
            setSelectedGuestId(e.target.value || null)
          }
          className="w-full border rounded-xl px-3 py-2 text-sm"
        >
          <option value="">לכל המוזמנים (ברירת מחדל)</option>

          {guests.map((g) => (
            <option key={g._id} value={g._id}>
              {g.name} – {g.phone}
            </option>
          ))}
        </select>
      </div>

      {/* ===== PREVIEW ===== */}
      <WhatsappTemplatePreview
        templateKey="rsvp"
        previewText={previewText}
        headerImageUrl={headerImageUrl}
      />

      {/* ===== SEND ===== */}
      <SendButton
        channel="whatsapp"
        type="rsvp"
        invitationId={invitationId}
        templateName={templateName}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={blocked}
      >
        {(round === 1 && round1SentAt) || (round === 2 && round2SentAt)
          ? "✅ נשלח"
          : scheduledAt
          ? `⏱️ תזמן אישור הגעה – סבב ${round}`
          : `📲 שלח אישור הגעה – סבב ${round}`}
      </SendButton>

      {noAudience && (
        <p className="text-sm text-red-500">אין נמענים לשליחה</p>
      )}
    </div>
  );
}
