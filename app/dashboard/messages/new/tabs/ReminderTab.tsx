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
};

/* ================= CONSTANTS ================= */

const MESSAGE_WITH_TABLE =
  "היי {{name}},\n" +
  "נזכיר שהאירוע שלנו מתקרב 💛\n" +
  "📅 {{eventDate}}\n" +
  "📍 {{eventLocation}}\n" +
  "מספר השולחן שלך: {{tableName}}\n" +
  "מחכים לראותך!";

const MESSAGE_NO_TABLE =
  "היי {{name}},\n" +
  "נזכיר שהאירוע שלנו מתקרב 💛\n" +
  "📅 {{eventDate}}\n" +
  "📍 {{eventLocation}}\n" +
  "מחכים לראותך!";

/* ================= COMPONENT ================= */

export default function ReminderTab({
  invitationId,
  eventDate,
  eventLocation,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

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

  const baseTemplate =
    guestsWithTable.length > 0
      ? MESSAGE_WITH_TABLE
      : MESSAGE_NO_TABLE;

  const buildReminderMessage = (g: Guest) =>
    buildMessage({
      template: baseTemplate,
      guest: g,
      eventDate,
      eventLocation,
    });

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
  }, [invitationId, guestsToSend, eventDate, eventLocation]);

  const blocked =
    loading ||
    guestsToSend.length === 0 ||
    !!preview?.blocked;

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

      {preview && (
        <p
          className={`text-xs ${
            preview.blocked
              ? "text-red-600"
              : preview.parts > 1
              ? "text-orange-600"
              : "text-gray-500"
          }`}
        >
          {preview.blocked
            ? `❌ חרגת מהמגבלה · ${preview.totalChars}/${preview.limit} תווים`
            : preview.parts === 1
            ? `הודעה אחת · ${preview.totalChars}/200`
            : `שתי הודעות · ${preview.totalChars} תווים (חריגה: ${preview.overflow})`}
          {!preview.blocked && (
            <span className="block text-[11px] text-gray-500">
              ההודעה תחויב ב־<strong>{preview.parts}</strong> הודעות SMS
            </span>
          )}
        </p>
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
