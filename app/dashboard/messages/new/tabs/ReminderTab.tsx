"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendTiming from "../shared/SendTiming";
import SendButton from "../shared/SendButton";
import { buildMessage } from "@/lib/messages/buildMessage";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
  tableName?: string;
  tableNumber?: number;
};

type Props = {
  invitationId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  lat?: number;
  lng?: number;
  giftCreditUrl?: string; // 👑 חדש
};

/* ================= CONSTANTS ================= */

const MESSAGE_WITH_TABLE =
  "היי {{name}} 🌸\n" +
  "שמחים לראות אותך 💛\n\n" +
  "השולחן שלך באירוע :\n" +
  "🪑 {{tableName}}\n\n" +
  "📍 ניווט:\n" +
  "{{navigationLink}}\n\n" +
  "נתראה!";

/* ================= COMPONENT ================= */

export default function ReminderTab({
  invitationId,
  eventDate,
  eventLocation,
  lat,
  lng,
  giftCreditUrl,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  const [includeGiftLink, setIncludeGiftLink] = useState(false); // 👑 שליטה למשתמש

  const [preview, setPreview] = useState<{
    text: string;
    totalChars: number;
    parts: number;
    blocked: boolean;
    overflow: number;
    limit: number;
    longestGuestName?: string | null;
  } | null>(null);

  /* ================= LOAD GUESTS ================= */

  useEffect(() => {
    if (!invitationId) return;

    async function loadGuests() {
      try {
        setLoading(true);
        const res = await fetch(`/api/guests?invitation=${invitationId}`);
        const data = await res.json();
        setGuests(Array.isArray(data.guests) ? data.guests : []);
      } catch (err) {
        console.error("❌ Failed to load reminder guests", err);
        setGuests([]);
      } finally {
        setLoading(false);
      }
    }

    loadGuests();
  }, [invitationId]);

  /* ================= HELPERS ================= */

  const hasTable = (g: Guest) =>
    !!g.tableName || typeof g.tableNumber === "number";

  const confirmedGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "yes"),
    [guests]
  );

  const guestsWithTable = useMemo(
    () => confirmedGuests.filter(hasTable),
    [confirmedGuests]
  );

  const guestsToSend = useMemo(() => {
    return guestsWithTable.length > 0
      ? guestsWithTable
      : confirmedGuests;
  }, [guestsWithTable, confirmedGuests]);

  const baseTemplate = MESSAGE_WITH_TABLE;

  const navigationLink =
    typeof lat === "number" && typeof lng === "number"
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : "";

  const buildReminderMessage = (g: Guest) => {
    return buildMessage({
      template: baseTemplate,
      guest: g,
      eventDate,
      eventLocation,
      navigationLink,
      includeGiftLink,
      giftLink: giftCreditUrl || "",
    });
  };

  /* ================= PREVIEW ================= */

  useEffect(() => {
    if (!invitationId || guestsToSend.length === 0) {
      setPreview(null);
      return;
    }

    let longestText = "";
    let longestGuest: Guest | null = null;

    for (const g of guestsToSend) {
      const text = buildReminderMessage(g);
      if (text.length > longestText.length) {
        longestText = text;
        longestGuest = g;
      }
    }

    if (!longestGuest) {
      setPreview(null);
      return;
    }

    async function fetchPreview() {
      const res = await fetch("/api/sms/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invitationId,
          guestId: longestGuest!._id,
          messageOverride: longestText,
        }),
      });

      const data = await res.json();

      if (
        typeof data.totalChars !== "number" ||
        typeof data.parts !== "number"
      ) {
        setPreview(null);
        return;
      }

      setPreview({
        text: longestText,
        totalChars: data.totalChars,
        parts: data.parts,
        blocked: !data.allowed,
        overflow: data.overflow ?? 0,
        limit: data.limit ?? 200,
        longestGuestName: longestGuest!.name,
      });
    }

    fetchPreview();
  }, [
    invitationId,
    guestsToSend,
    eventDate,
    eventLocation,
    includeGiftLink, // 👑 מתעדכן בלייב
  ]);

  const blocked =
    loading ||
    guestsToSend.length === 0 ||
    !!preview?.blocked;

  const renderPreviewText = (text: string) => {
    return text.split("\n").map((line, i) => (
      <p key={i} className="leading-relaxed">
        {line || <span>&nbsp;</span>}
      </p>
    ));
  };

  /* ================= RENDER ================= */

  if (loading) {
    return <p className="text-sm text-gray-500">טוען אורחים…</p>;
  }

  return (
    <div className="space-y-6">

      <AudienceFilterSelector
        value={guestsWithTable.length > 0 ? "withTable" : "all"}
        onChange={() => {}}
        totalCount={confirmedGuests.length}
        withTableCount={guestsWithTable.length}
        readOnly
      />

      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        📌 תזכורת נשלחת ב־SMS בלבד
        <br />
        ⏱️ ניתן לשלוח מיידית או לתזמן
        <br />
        🪑 מספר שולחן מצורף רק למי שיש בפועל
      </section>

      {/* 👑 שליטה על קישור מתנה */}
      {giftCreditUrl && (
        <div className="border rounded-xl p-4 bg-[#faf9f7] text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeGiftLink}
              onChange={(e) => setIncludeGiftLink(e.target.checked)}
            />
            <span>להוסיף קישור למתנות באשראי</span>
          </label>
        </div>
      )}

      {/* PHONE PREVIEW */}
      {preview && (
        <div className="w-[92%] max-w-[390px] mx-auto mt-4 mb-6">

          <p className="text-sm text-gray-500 mb-2 text-center">
            תצוגה מקדימה – כך האורח יקבל את ההודעה
          </p>

          <div className="mx-auto bg-black rounded-[36px] p-3 shadow-xl">
            <div className="rounded-[28px] overflow-hidden bg-white">
              <div className="bg-gray-100 text-center py-2 text-xs font-semibold">
                INVISTIMO · SMS
              </div>

              <div className="p-4 flex justify-center">
                <div className="rounded-2xl px-4 py-3 text-[14px] max-w-[85%] whitespace-pre-wrap leading-relaxed break-words bg-[#e9e9eb] text-gray-900">

                  {renderPreviewText(preview.text)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <SendTiming scheduledAt={scheduledAt} onChange={setScheduledAt} />

      <SendButton
        channel="sms"
        type="reminder"
        invitationId={invitationId}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        disabled={blocked}
      >
        {scheduledAt
          ? "⏱️ תזמן תזכורת"
          : `📩 שלח תזכורת (${guestsToSend.length})`}
      </SendButton>

      {blocked && (
        <p className="text-sm text-red-500">
          אין נמענים או שההודעה חורגת מהמגבלה
        </p>
      )}
    </div>
  );
}
