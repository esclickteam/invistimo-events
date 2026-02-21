"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceFilterSelector, {
  FilterType,
} from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import TextMessagePreview from "../shared/TextMessagePreview";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";

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
  invitationTitle: string;
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
  "נשמח לדעת אם תגיעו ל־{{invitationTitle}} 🎉\n\n" +
  "לאישור הגעה לחצו כאן:\n" +
  "{{rsvpLink}}\n\n" +
  "מחכים לכם באהבה 💖";

/* ================= COMPONENT ================= */

export default function RsvpSmsTab({
  invitationId,
  invitationTitle,
}: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [audienceFilter, setAudienceFilter] =
    useState<FilterType>("all");
  const [half, setHalf] = useState<HalfType>(null);

  /* ================= TIMING ================= */

  type SendTiming = "now" | "scheduled";
  const [sendTiming, setSendTiming] =
    useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const scheduledAt = useMemo(() => {
    if (
      sendTiming !== "scheduled" ||
      !scheduledDate ||
      !scheduledTime
    ) {
      return null;
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= SCHEDULED MESSAGES ================= */

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduled, setShowScheduled] = useState(false);

  const loadScheduledMessages = async () => {
    try {
      const res = await fetch("/api/scheduled-messages", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (data?.success) {
        setScheduledMessages(
          Array.isArray(data.messages) ? data.messages : []
        );
      } else {
        setScheduledMessages([]);
      }
    } catch {
      setScheduledMessages([]);
    }
  };

  useEffect(() => {
    loadScheduledMessages();
  }, []);

  /* ================= LOAD GUESTS ================= */

  useEffect(() => {
    async function loadGuests() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/guests?invitation=${invitationId}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setGuests(Array.isArray(data?.guests) ? data.guests : []);
      } finally {
        setLoading(false);
      }
    }

    if (invitationId) loadGuests();
  }, [invitationId]);

  /* ================= COUNTS ================= */

  const totalCount = guests.length;

  const pendingGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "pending"),
    [guests]
  );

  /* ================= FILTER ================= */

  const filteredGuests = useMemo(() => {
    return audienceFilter === "pending"
      ? pendingGuests
      : guests;
  }, [audienceFilter, guests, pendingGuests]);

  /* ================= SORT ================= */

  const sortedGuests = useMemo(() => {
    return [...filteredGuests].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "he")
    );
  }, [filteredGuests]);

  /* ================= HALF ================= */

  const mid = Math.ceil(sortedGuests.length / 2);
  const firstHalfCount = sortedGuests.slice(0, mid).length;
  const secondHalfCount = sortedGuests.slice(mid).length;

  const guestsToSend = useMemo(
    () => splitByHalf(sortedGuests, half),
    [sortedGuests, half]
  );

  const noAudience = guestsToSend.length === 0;

  /* ================= PREVIEW ================= */

  const previewText = useMemo(() => {
    const g = guestsToSend[0];
    if (!g || !g.token) return "";

    const rsvpLink = `https://www.invistimo.com/invite/${invitationId}?token=${g.token}`;

    return RSVP_SMS_TEMPLATE
      .replace(/{{name}}/g, g.name || "")
      .replace(/{{invitationTitle}}/g, invitationTitle || "")
      .replace(/{{rsvpLink}}/g, rsvpLink);
  }, [guestsToSend, invitationId, invitationTitle]);

  if (loading) return <p>טוען אורחים…</p>;

  return (
    <div className="space-y-6">
      {/* AUDIENCE */}
      <AudienceFilterSelector
        value={audienceFilter}
        onChange={(v) => {
          setAudienceFilter(v);
          setHalf(null);
        }}
        totalCount={totalCount}
        pendingCount={pendingGuests.length}
        allowedFilters={["all", "pending"]}
      />

      {/* HALF */}
      <div>
        <h3 className="font-semibold mb-2">
          📊 שליחה לפי חצי רשימה
        </h3>

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
            כולם (ללא פיצול) – {sortedGuests.length}
          </option>
          <option value="first">
            חצי ראשון – {firstHalfCount}
          </option>
          <option value="second">
            חצי שני – {secondHalfCount}
          </option>
        </select>

        <p className="text-xs text-gray-500 mt-1">
          החצי נקבע לפי סדר אלפביתי
        </p>
      </div>

      {/* PREVIEW */}
      {previewText && (
        <TextMessagePreview channel="sms" text={previewText} />
      )}

      {/* TIMING */}
      <div className="border rounded-2xl p-6 space-y-5">
        <div className="font-semibold">⏱️ תזמון ההודעה</div>

        <label className="flex items-center gap-3">
          <input
            type="radio"
            checked={sendTiming === "now"}
            onChange={() => setSendTiming("now")}
            className="accent-blue-600"
          />
          <span>שליחה מיידית</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="radio"
            checked={sendTiming === "scheduled"}
            onChange={() => setSendTiming("scheduled")}
            className="accent-blue-600"
          />
          <span>שליחה מתוזמנת</span>
        </label>

        {sendTiming === "scheduled" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="border rounded-xl px-4 py-3 text-sm"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="border rounded-xl px-4 py-3 text-sm"
            />
          </div>
        )}
      </div>

      {/* SEND */}
      <SendButton
        channel="sms"
        type="rsvp"
        invitationId={invitationId}
        audience={guestsToSend.map((g) => g._id)}
        scheduledAt={scheduledAt}
        onAfterSend={loadScheduledMessages}
        disabled={
          noAudience ||
          (sendTiming === "scheduled" && !scheduledAt)
        }
      >
        {sendTiming === "scheduled"
          ? "⏱️ תזמן אישור הגעה"
          : "📩 שלח אישור הגעה SMS"}
      </SendButton>

      {/* OPEN MODAL BUTTON */}
      {scheduledMessages.length > 0 && (
        <div className="flex justify-center mt-8">
          <button
            onClick={async () => {
              await loadScheduledMessages();
              setShowScheduled(true);
            }}
            className="px-6 py-3 rounded-2xl border shadow-sm text-sm"
          >
            📅 צפייה בהודעות מתוזמנות
          </button>
        </div>
      )}

      {/* MODAL */}
      {showScheduled && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-[95%] max-w-[900px] p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold">
                📅 הודעות מתוזמנות
              </h2>
              <button onClick={() => setShowScheduled(false)}>✕</button>
            </div>

            <ScheduledMessagesTable
              messages={scheduledMessages}
              onChange={loadScheduledMessages}
            />
          </div>
        </div>
      )}
    </div>
  );
}