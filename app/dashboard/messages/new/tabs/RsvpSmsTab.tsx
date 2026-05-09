"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AudienceFilterSelector, {
  FilterType,
} from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import TextMessagePreview from "../shared/TextMessagePreview";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";
import { useAuth } from "@/context/AuthContext";

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

type GiftOptions = {
  creditEnabled: boolean;
  creditUrl: string;
  payboxEnabled: boolean;
  payboxUrl: string;
};

function normalizeGiftOptions(raw: any): GiftOptions {
  const g = raw ?? {};
  return {
    creditEnabled: !!g.creditEnabled,
    creditUrl: String(g.creditUrl ?? ""),
    payboxEnabled: !!g.payboxEnabled,
    payboxUrl: String(g.payboxUrl ?? ""),
  };
}

function ensureHttp(u: string) {
  const s = (u ?? "").trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

/* ================= HELPERS ================= */

type HalfType = "first" | "second" | null;

function splitByHalf<T>(list: T[], half: HalfType) {
  if (!half) return list;

  const mid = Math.ceil(list.length / 2);
  return half === "first" ? list.slice(0, mid) : list.slice(mid);
}

/* ================= MESSAGE TEMPLATE ================= */

const RSVP_SMS_TEMPLATES = {
  round1:
    "היי {{name}},\n" +
    "נשמח לדעת אם תגיעו ל־{{invitationTitle}} 🎉\n\n" +
    "לאישור הגעה לחצו כאן:\n" +
    "{{rsvpLink}}\n\n" +
    "מחכים לכם באהבה 💖",

  round2:
    "היי {{name}},\n" +
    "תזכורת קצרה לאישור הגעה ל־{{invitationTitle}} 🎉\n\n" +
    "לאישור לחצו כאן:\n" +
    "{{rsvpLink}}\n\n" +
    "מחכים לכם 💖",
};

/* ================= COMPONENT ================= */

export default function RsvpSmsTab({ invitationId, invitationTitle }: Props) {
  const { user } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const [audienceFilter, setAudienceFilter] = useState<FilterType>("all");
  const [half, setHalf] = useState<HalfType>(null);

  const [round, setRound] = useState<1 | 2>(1);

  const [rsvpRound1Sent, setRsvpRound1Sent] = useState(false);
const [rsvpRound2Sent, setRsvpRound2Sent] = useState(false);

const [rsvpRound1Scheduled, setRsvpRound1Scheduled] = useState(false);
const [rsvpRound2Scheduled, setRsvpRound2Scheduled] = useState(false);

const [round1Locked, setRound1Locked] = useState(true);
const [round2Locked, setRound2Locked] = useState(true);
  /* ================= GIFT OPTIONS ================= */

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

  /* ================= TIMING ================= */

  type SendTiming = "now" | "scheduled";
  const [sendTiming, setSendTiming] = useState<SendTiming>("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const [message, setMessage] = useState(RSVP_SMS_TEMPLATES.round1);

  useEffect(() => {
  setMessage(
    round === 1
      ? RSVP_SMS_TEMPLATES.round1
      : RSVP_SMS_TEMPLATES.round2
  );
}, [round]);

  const scheduledAt = useMemo(() => {
    if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
      return null;
    }

    const [year, month, day] = scheduledDate.split("-").map(Number);
    const [hour, minute] = scheduledTime.split(":").map(Number);

    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }, [sendTiming, scheduledDate, scheduledTime]);

  /* ================= SCHEDULED MESSAGES ================= */

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);

  const round1Scheduled = scheduledMessages.some(
  (m) =>
    m.templateKey === "rsvp" &&
    m.roundNumber === 1 &&
    ["scheduled", "sending"].includes(m.status)
);

const round2Scheduled = scheduledMessages.some(
  (m) =>
    m.templateKey === "rsvp" &&
    m.roundNumber === 2 &&
    ["scheduled", "sending"].includes(m.status)
);
  

  const [showScheduled, setShowScheduled] = useState(false);

  const loadScheduledMessages = async () => {
    try {
      const res = await fetch("/api/scheduled-messages", {
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (data?.success) {
        setScheduledMessages(Array.isArray(data.messages) ? data.messages : []);
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

  /* ================= LOAD GUESTS + INVITATION (giftOptions) ================= */

  useEffect(() => {
    async function loadGuestsAndInvitation() {
      try {
        setLoading(true);

        const [guestsRes, invitationRes] = await Promise.all([
          fetch(`/api/guests?invitation=${invitationId}`, { cache: "no-store" }),
          fetch(`/api/invitations/${invitationId}`, { cache: "no-store" }),
        ]);

        const guestsData = await guestsRes.json();
        setGuests(Array.isArray(guestsData?.guests) ? guestsData.guests : []);

        const invitationData = await invitationRes.json();
        const inv = invitationData?.invitation;

        const round1Sent =
  inv?.rsvpRound1SentAt ||
  inv?.rsvpSmsRound1SentAt ||
  inv?.rsvpWhatsappRound1ScheduledAt; // 🔥 הוספה

const round2Sent =
  inv?.rsvpRound2SentAt ||
  inv?.rsvpSmsRound2SentAt ||
  inv?.rsvpWhatsappRound2ScheduledAt; // 🔥 הוספה

const round1Scheduled =
  inv?.rsvpSmsRound1ScheduledAt ||
  inv?.rsvpWhatsappRound1ScheduledAt;

const round2Scheduled =
  inv?.rsvpSmsRound2ScheduledAt ||
  inv?.rsvpWhatsappRound2ScheduledAt;

setRsvpRound1Sent(!!round1Sent);
setRsvpRound2Sent(!!round2Sent);

setRsvpRound1Scheduled(!!round1Scheduled);
setRsvpRound2Scheduled(!!round2Scheduled);

setRound1Locked(
  inv?.messageLocks?.rsvpSmsRound1 ?? true
);

setRound2Locked(
  inv?.messageLocks?.rsvpSmsRound2 ?? true
);

        setGiftOptions(normalizeGiftOptions(inv?.giftOptions));
        didInitGift.current = true;
      } catch (e) {
        console.error("❌ Failed to load guests/invitation", e);
      } finally {
        setLoading(false);
      }
    }

    if (invitationId) loadGuestsAndInvitation();
  }, [invitationId]);

  /* ================= SAVE GIFT OPTIONS (debounced) ================= */

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
            ? ensureHttp(giftOptions.creditUrl)
            : "",
          payboxEnabled: !!giftOptions.payboxEnabled,
          payboxUrl: giftOptions.payboxEnabled
            ? ensureHttp(giftOptions.payboxUrl)
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
      } catch (e: any) {
        console.error("❌ Failed to save giftOptions", e);
        setGiftSaveError("לא הצלחנו לשמור את הגדרות המתנה. נסו שוב.");
      } finally {
        setSavingGift(false);
      }
    }, 500);

    return () => {
      if (giftSaveTimer.current) clearTimeout(giftSaveTimer.current);
    };
  }, [giftOptions, invitationId]);

  /* ================= COUNTS ================= */

  const totalCount = guests.length;

  const pendingGuests = useMemo(
    () => guests.filter((g) => g.rsvp === "pending"),
    [guests]
  );

  async function toggleMessageLock(
  key: string,
  current: boolean
) {
  try {
    const res = await fetch(
      "/api/admin/toggle-message-lock",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId,
          key,
          value: !current,
        }),
      }
    );

    if (!res.ok) {
      throw new Error("FAILED");
    }

    if (key === "rsvpSmsRound1") {
      setRound1Locked(!current);
    }

    if (key === "rsvpSmsRound2") {
      setRound2Locked(!current);
    }

  } catch (err) {
    console.error(err);
    alert("שגיאה בעדכון הסבב");
  }
}

  /* ================= FILTER ================= */

  const filteredGuests = useMemo(() => {
    return audienceFilter === "pending" ? pendingGuests : guests;
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

  const guestsToSend = useMemo(() => splitByHalf(sortedGuests, half), [
    sortedGuests,
    half,
  ]);

  const noAudience = guestsToSend.length === 0;

  /* ================= PREVIEW ================= */

  const previewText = useMemo(() => {
  const g = guestsToSend[0];
  if (!g || !g.token) return "";

  const rsvpLink = `https://www.invistimo.com/invite/${invitationId}?token=${g.token}`;

  return message
    .replace(/{{name}}/g, g.name || "")
    .replace(/{{invitationTitle}}/g, invitationTitle || "")
    .replace(/{{rsvpLink}}/g, rsvpLink);
}, [guestsToSend, invitationId, invitationTitle, message]);

  if (loading) return <p>טוען אורחים…</p>;

  return (
    <div className="space-y-6">
      {/* AUDIENCE */}
     <div className="flex gap-3">

  <button
    onClick={() => {
      setRound(1);
      setAudienceFilter("all");
      setHalf(null);
    }}
    className={`flex-1 rounded-xl py-3 text-sm ${
      round === 1 ? "bg-blue-600 text-white" : "bg-gray-100"
    }`}
  >
    סבב 1 – לכולם ({totalCount})
  </button>

  <button
    onClick={() => {
      setRound(2);
      setAudienceFilter("pending");
      setHalf(null);
    }}
    className={`flex-1 rounded-xl py-3 text-sm ${
      round === 2 ? "bg-blue-600 text-white" : "bg-gray-100"
    }`}
  >
    סבב 2 – למי שטרם ענה ({pendingGuests.length})
  </button>

</div>

      {/* HALF */}
      <div>
        <h3 className="font-semibold mb-2">📊 שליחה לפי חצי רשימה</h3>

        <select
          value={half ?? ""}
          onChange={(e) =>
            setHalf(e.target.value === "" ? null : (e.target.value as HalfType))
          }
          className="w-full border rounded-xl p-3 text-sm"
        >
          <option value="">כולם (ללא פיצול) – {sortedGuests.length}</option>
          <option value="first">חצי ראשון – {firstHalfCount}</option>
          <option value="second">חצי שני – {secondHalfCount}</option>
        </select>

        <p className="text-xs text-gray-500 mt-1">החצי נקבע לפי סדר אלפביתי</p>
      </div>

      {/* GIFT OPTIONS */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">🎁 קישור למתנה (מתעדכן בדף ההזמנה)</h3>

          <div className="text-xs text-gray-500">
            {savingGift ? "שומר..." : giftSaveError ? "שגיאה" : "נשמר"}
          </div>
        </div>

        {giftSaveError && (
          <div className="text-sm text-red-600">{giftSaveError}</div>
        )}

        {/* Credit */}
        <div className="rounded-xl border border-gray-200 p-3 space-y-2">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">💳 מתנה באשראי</span>
            <input
              type="checkbox"
              checked={giftOptions.creditEnabled}
              onChange={(e) =>
                setGiftOptions((p) => ({
                  ...p,
                  creditEnabled: e.target.checked,
                  creditUrl: e.target.checked ? p.creditUrl : "",
                }))
              }
            />
          </label>

          {giftOptions.creditEnabled && (
            <input
              value={giftOptions.creditUrl}
              onChange={(e) =>
                setGiftOptions((p) => ({ ...p, creditUrl: e.target.value }))
              }
              placeholder="הדביקו כאן קישור לתשלום באשראי"
              className="w-full border rounded-xl p-3 text-sm"
              dir="ltr"
              inputMode="url"
            />
          )}
        </div>

        {/* PayBox */}
        <div className="rounded-xl border border-gray-200 p-3 space-y-2">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">💰 מתנה ב-PayBox</span>
            <input
              type="checkbox"
              checked={giftOptions.payboxEnabled}
              onChange={(e) =>
                setGiftOptions((p) => ({
                  ...p,
                  payboxEnabled: e.target.checked,
                  payboxUrl: e.target.checked ? p.payboxUrl : "",
                }))
              }
            />
          </label>

          {giftOptions.payboxEnabled && (
            <input
              value={giftOptions.payboxUrl}
              onChange={(e) =>
                setGiftOptions((p) => ({ ...p, payboxUrl: e.target.value }))
              }
              placeholder="הדביקו כאן קישור ל-PayBox"
              className="w-full border rounded-xl p-3 text-sm"
              dir="ltr"
              inputMode="url"
            />
          )}
        </div>

        <p className="text-xs text-gray-500">
          הקישורים נשמרים בהזמנה, והאורחים רואים אותם רק בקישור האישי.
        </p>
      </div>

      <div className="border rounded-2xl p-5 bg-white shadow-sm space-y-3">

  <div className="font-semibold text-gray-800">
    ✏️ עריכת תוכן ההודעה
  </div>

  <textarea
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    rows={6}
    className="w-full border rounded-xl p-4 text-sm
               focus:outline-none focus:ring-2 focus:ring-blue-500"
  />

  <p className="text-xs text-gray-500">
    משתנים אוטומטיים:
    <span className="font-mono"> {"{{name}}"} </span>
    <span className="font-mono"> {"{{invitationTitle}}"} </span>
    <span className="font-mono"> {"{{rsvpLink}}"} </span>
  </p>

</div>

      {/* PREVIEW */}
      {previewText && <TextMessagePreview channel="sms" text={previewText} />}

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
  messageOverride={message}
  round={round}
  onAfterSend={async () => {
  await loadScheduledMessages();

  if (sendTiming === "scheduled") {
    if (round === 1) setRsvpRound1Scheduled(true);
    if (round === 2) setRsvpRound2Scheduled(true);
  } else {
    if (round === 1) setRsvpRound1Sent(true);
    if (round === 2) setRsvpRound2Sent(true);
  }
}}
  disabled={
  noAudience ||
  (sendTiming === "scheduled" && !scheduledAt) ||
  (
  round === 1 &&
  (rsvpRound1Sent || rsvpRound1Scheduled || round1Scheduled) &&
  round1Locked
)||
  (
  round === 2 &&
  (rsvpRound2Sent || rsvpRound2Scheduled || round2Scheduled) &&
  round2Locked
)
}
>
  {round === 1 && (rsvpRound1Sent || rsvpRound1Scheduled || round1Scheduled)
  ? (rsvpRound1Scheduled || round1Scheduled)
    ? "⏱️ סבב 1 כבר מתוזמן"
    : "✔ סבב 1 כבר נשלח"
  : round === 2 && (rsvpRound2Sent || rsvpRound2Scheduled || round2Scheduled)
  ? (rsvpRound2Scheduled || round2Scheduled)
    ? "⏱️ סבב 2 כבר מתוזמן"
    : "✔ סבב 2 כבר נשלח"
  : sendTiming === "scheduled"
  ? "⏱️ תזמן אישור הגעה"
  : "📩 שלח אישור הגעה SMS"}
</SendButton>

{(
  user?.role === "admin" ||
  document.cookie.includes("adminToken")
) && (
  <button
    onClick={() =>
      toggleMessageLock(
        round === 1
          ? "rsvpSmsRound1"
          : "rsvpSmsRound2",

        round === 1
          ? round1Locked
          : round2Locked
      )
    }
    className={`w-full py-3 rounded-xl text-white font-medium ${
      (
        round === 1
          ? round1Locked
          : round2Locked
      )
        ? "bg-orange-500"
        : "bg-green-600"
    }`}
  >
    {(
      round === 1
        ? round1Locked
        : round2Locked
    )
      ? "🔓 פתח סבב"
      : "🔒 סגור סבב"}
  </button>
)}

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
              <h2 className="text-xl font-semibold">📅 הודעות מתוזמנות</h2>
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