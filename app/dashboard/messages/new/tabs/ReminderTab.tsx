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
  giftCreditUrl?: string;
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

  const [includeGiftLink, setIncludeGiftLink] = useState(false);

  const [preview, setPreview] = useState<{
    text: string;
    totalChars: number;
    parts: number;
    blocked: boolean;
    overflow: number;
    limit: number;
    longestGuestName?: string | null;
  } | null>(null);

  /* ================= NEW: TEST MESSAGE ================= */

  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testsRemaining, setTestsRemaining] = useState(10);

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
        console.error(err);
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

  const navigationLink =
    typeof lat === "number" && typeof lng === "number"
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : "";

  const buildReminderMessage = (g: Guest) =>
    buildMessage({
      template: MESSAGE_WITH_TABLE,
      guest: g,
      eventDate,
      eventLocation,
      navigationLink,
      includeGiftLink,
      giftLink: giftCreditUrl || "",
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

    setPreview({
      text: longestText,
      totalChars: longestText.length,
      parts: 1,
      blocked: false,
      overflow: 0,
      limit: 200,
      longestGuestName: longestGuest.name,
    });

    async function fetchPreview() {
      try {
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
          typeof data.totalChars === "number" &&
          typeof data.parts === "number"
        ) {
          setPreview((prev) =>
            prev
              ? {
                  ...prev,
                  totalChars: data.totalChars,
                  parts: data.parts,
                  blocked: !data.allowed,
                  overflow: data.overflow ?? 0,
                  limit: data.limit ?? 200,
                }
              : prev
          );
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchPreview();
  }, [
    invitationId,
    guestsToSend,
    eventDate,
    eventLocation,
    includeGiftLink,
  ]);

  /* ================= TEST SEND ================= */

  async function sendTestMessage() {
    if (!preview?.text || !testPhone) return;

    try {
      setSendingTest(true);

      const res = await fetch("/api/sms/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          invitationId,
          phone: testPhone,
          message: preview.text,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTestsRemaining((prev) => Math.max(prev - 1, 0));
        alert("נשלח בהצלחה ✅");
      } else {
        alert("שליחה נכשלה ❌");
      }
    } catch (err) {
      alert("שגיאה בשליחה");
    } finally {
      setSendingTest(false);
    }
  }

  const blocked =
    loading ||
    guestsToSend.length === 0 ||
    !!preview?.blocked;

  const renderPreviewText = (text: string) =>
    text.split("\n").map((line, i) => (
      <p key={i}>{line || <span>&nbsp;</span>}</p>
    ));

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

      {/* PHONE PREVIEW */}
      {preview && (
        <div className="w-full flex justify-center mt-6 mb-8">
          <div className="relative w-[260px] h-[520px] bg-black rounded-[48px] p-3 shadow-2xl">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[22px] bg-black rounded-b-2xl" />
            <div className="relative w-full h-full bg-[#f5f5f5] rounded-[38px] overflow-hidden">
              <div className="bg-gray-100 text-center py-2 text-[11px] font-semibold text-gray-600 border-b">
                INVISTIMO · SMS
              </div>
              <div className="flex justify-center items-center h-full p-4">
                <div className="bg-gray-200 text-gray-900 rounded-3xl px-4 py-3 text-sm max-w-[85%] text-right">
                  {renderPreviewText(preview.text)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEST MESSAGE UI */}
      {preview && (
        <div className="border rounded-xl p-4 bg-[#faf9f7] text-sm space-y-3">
          <div className="font-semibold">
            שליחת הודעה לבדיקה ✏️
          </div>

          <div className="text-xs text-gray-500">
            בדיקות שנותרו: {testsRemaining} / 10
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="05XXXXXXXX"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2"
            />
            <button
              onClick={sendTestMessage}
              disabled={sendingTest || testsRemaining <= 0}
              className="bg-gray-200 px-4 rounded-lg"
            >
              {sendingTest ? "שולח..." : "שלח לבדיקה"}
            </button>
          </div>

          <div className="text-xs text-gray-400">
            הודעת בדיקה זו תחויב כהודעת SMS אחת
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

    </div>
  );
}
