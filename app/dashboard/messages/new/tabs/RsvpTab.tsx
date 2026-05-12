"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import AudienceFilterSelector from "../shared/AudienceFilterSelector";
import SendButton from "../shared/SendButton";
import WhatsappTemplatePreview from "../shared/WhatsappTemplatePreview";
import { useAuth } from "@/context/AuthContext";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  rsvp?: "yes" | "no" | "pending";
};

type Props = {
  invitationId: string;
  invitationTitle: string;
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
  invitationTitle,
  eventDate,
  eventLocation,
}: {
  invitationTitle: string;
  eventDate: string;
  eventLocation: string;
}) {
  return `משפחה וחברים יקרים,
הנכם מוזמנים ל־${invitationTitle} 🤍

📅 תאריך: ${eventDate}
📍 מיקום: ${eventLocation}

לאישור הגעה לחצו על הכפתור למטה 👇

מחכים לשמוח איתכם 💖`;
}


function getRsvpReminderPreviewText(invitationTitle: string) {
  return `משפחה וחברים יקרים,

תזכורת קצרה לאישור הגעה ל־${invitationTitle} 💜

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

function splitByHalf<T>(
  list: T[],
  half: "first" | "second" | null
) {
  if (!half) return list; // ⭐ לא נבחר חצי → הכל

  const mid = Math.ceil(list.length / 2);

  if (half === "first") {
    return list.slice(0, mid);
  }

  return list.slice(mid);
}



/* ================= COMPONENT ================= */

export default function RsvpTab({
  invitationId,
  invitationTitle,
  eventDate,
  eventLocation,
  headerImageUrl,
}: Props) {
  const { user } = useAuth();
  console.log(user);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [round, setRound] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);

  type SendTiming = "now" | "scheduled";

const [sendTiming, setSendTiming] = useState<SendTiming>("now");
const [scheduledDate, setScheduledDate] = useState("");
const [scheduledTime, setScheduledTime] = useState("");

const [existingSchedule, setExistingSchedule] = useState<any | null>(null);
const [cancelLoading, setCancelLoading] = useState(false);

useEffect(() => {
  if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime) {
    setScheduledAt(null);
    return;
  }

  const [year, month, day] = scheduledDate.split("-").map(Number);
  const [hour, minute] = scheduledTime.split(":").map(Number);

  setScheduledAt(
    new Date(year, month - 1, day, hour, minute, 0, 0)
  );
}, [sendTiming, scheduledDate, scheduledTime]);



  // 🔒 מצב סבבים
  const [round1SentAt, setRound1SentAt] = useState<Date | null>(null);
  const [round2SentAt, setRound2SentAt] = useState<Date | null>(null);
  const [round1Locked, setRound1Locked] = useState(true);
const [round2Locked, setRound2Locked] = useState(true);

  // 📅 נתוני אירוע ל־Preview
  const [eventData, setEventData] = useState<{
    title: string;
    date: string;
    location: string;
  } | null>(null);

  // 📊 סטטיסטיקת WhatsApp
  const [waStats, setWaStats] = useState<{
    total: number;
    delivered: number;
    pending: number;
    failed: number;
  } | null>(null);

  async function loadWhatsappStats() {
    try {
      const res = await fetch(
        `/api/whatsapp/stats?invitationId=${invitationId}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data?.success) {
        setWaStats({
          total: data.total,
          delivered: data.delivered,
          pending: data.pending,
          failed: data.failed,
        });
      }
    } catch (e) {
      console.error("❌ Failed to load WhatsApp stats", e);
    }
  }

  async function handleCancelSchedule() {
  if (!existingSchedule?._id) return;

  const ok = confirm("לבטל את התזמון?");
  if (!ok) return;

  setCancelLoading(true);

  try {
    const res = await fetch("/api/scheduled/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduleId: existingSchedule._id,
      }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    setExistingSchedule(null);
    setScheduledDate("");
    setScheduledTime("");
    setScheduledAt(null);
    setSendTiming("now");

  } catch (err: any) {
    alert(err.message);
  } finally {
    setCancelLoading(false);
  }
}

  useEffect(() => {
    if (!round1SentAt && !round2SentAt) return;

    loadWhatsappStats();

    const interval = setInterval(() => {
      loadWhatsappStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [round1SentAt, round2SentAt, invitationId]);

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

  type HalfType = "first" | "second" | null;


const [half, setHalf] = useState<HalfType>(null);



  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [guestsRes, invitationRes] = await Promise.all([
  fetch(`/api/guests?invitation=${invitationId}`, { cache: "no-store" }),
  fetch(`/api/invitations/${invitationId}`, { cache: "no-store" }),
]);

const scheduleRes = await fetch(
  `/api/scheduled/by-invitation?invitationId=${invitationId}&type=rsvp&round=${round}`,
  { cache: "no-store" }
);

const scheduleData = await scheduleRes.json();

if (scheduleData?.schedule) {
  setExistingSchedule(scheduleData.schedule);

  if (scheduleData.schedule.scheduledAt) {
    const d = new Date(scheduleData.schedule.scheduledAt);

    setScheduledDate(d.toISOString().slice(0, 10));
    setScheduledTime(d.toISOString().slice(11, 16));
    setSendTiming("scheduled");
  }
} else {
  setExistingSchedule(null);
}

        const guestsData = await guestsRes.json();
        const invitationData = await invitationRes.json();

        if (Array.isArray(guestsData.guests)) {
          setGuests(guestsData.guests);
        }

        const inv = invitationData?.invitation;

        const round1 =
  inv?.rsvpRound1SentAt ||
  inv?.rsvpSmsRound1SentAt ||
  inv?.rsvpSmsRound1ScheduledAt ||
  inv?.rsvpWhatsappRound1ScheduledAt; // 🔥 חדש

const round2 =
  inv?.rsvpRound2SentAt ||
  inv?.rsvpSmsRound2SentAt ||
  inv?.rsvpSmsRound2ScheduledAt ||
  inv?.rsvpWhatsappRound2ScheduledAt; // 🔥 חדש

setRound1SentAt(round1 ? new Date(round1) : null);
setRound2SentAt(round2 ? new Date(round2) : null);

setRound1Locked(
  inv?.messageLocks?.rsvpWhatsappRound1 ?? true
);

setRound2Locked(
  inv?.messageLocks?.rsvpWhatsappRound2 ?? true
);

        setGiftOptions(normalizeGiftOptions(inv?.giftOptions));
        didInitGift.current = true;

        if (inv) {
          setEventData({
            title: inv.title ?? invitationTitle,
            date: inv.eventDate
              ? new Date(inv.eventDate).toLocaleDateString("he-IL")
              : eventDate,
            location: inv.location?.address ?? eventLocation,
          });
        }
      } catch (err) {
        console.error("❌ Failed to load RSVP data", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [invitationId, invitationTitle, eventDate, eventLocation, round]);

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
      } catch (e: any) {
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

    if (key === "rsvpWhatsappRound1") {
      setRound1Locked(!current);
    }

    if (key === "rsvpWhatsappRound2") {
      setRound2Locked(!current);
    }

  } catch (err) {
    console.error(err);
    alert("שגיאה בעדכון הסבב");
  }
}


  /* ================= DERIVED ================= */

  const guestsToSend = useMemo(() => {
  // 1️⃣ בחירת קהל
  const base =
    round === 1
      ? guests
      : guests.filter((g) => g.rsvp === "pending");

  // 2️⃣ מיון אלפביתי בעברית
  const sorted = [...base].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "he")
  );

  // 3️⃣ פיצול לחצי
  return splitByHalf(sorted, half);
}, [guests, round, half]);

// 🔢 חישוב כמויות לכל חצי (כדי להציג ב־select)
const baseGuests = useMemo(() => {
  return round === 1
    ? guests
    : guests.filter((g) => g.rsvp === "pending");
}, [guests, round]);

const sortedGuests = useMemo(() => {
  return [...baseGuests].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "he")
  );
}, [baseGuests]);

const mid = Math.ceil(sortedGuests.length / 2);

const firstHalfCount = sortedGuests.slice(0, mid).length;
const secondHalfCount = sortedGuests.slice(mid).length;




  const totalCount = guests.length;
  const pendingCount = guests.filter((g) => g.rsvp === "pending").length;

  const noAudience = guestsToSend.length === 0;
  const missingHeaderImage = !headerImageUrl;

  const blocked =
  loading ||
  noAudience ||
  missingHeaderImage ||
  (sendTiming === "scheduled" && !scheduledAt) ||
  (
    existingSchedule?.status === "scheduled" &&
    existingSchedule?.scheduledAt &&
    !isNaN(new Date(existingSchedule.scheduledAt).getTime())
  ) ||
  (round === 1 && !!round1SentAt) ||
  (round === 2 && !!round2SentAt);

  const previewText = useMemo(() => {
    if (!eventData) return "";

    if (round === 1) {
      return getRsvpPreviewText({
        invitationTitle: eventData.title,
        eventDate: eventData.date,
        eventLocation: eventData.location,
      });
    }

    return getRsvpReminderPreviewText(eventData.title);
  }, [eventData, round]);

  const templateName =
    round === 1 ? RSVP_ROUND1_TEMPLATE : RSVP_ROUND2_TEMPLATE;

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

      <AudienceFilterSelector
        value={round === 1 ? "all" : "pending"}
        onChange={() => {}}
        totalCount={totalCount}
        pendingCount={pendingCount}
        readOnly
      />

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
    כולם (ללא פיצול) – {sortedGuests.length}
  </option>

  <option value="first">
    חצי ראשון של הרשימה – {firstHalfCount}
  </option>

  <option value="second">
    חצי שני של הרשימה – {secondHalfCount}
  </option>
</select>



  <p className="text-xs text-gray-500 mt-1">
    החצי נקבע לפי סדר הרשימה המוצגת
  </p>
</div>

{/* ================= GIFT OPTIONS ================= */}
<div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold">🎁 קישור למתנה</h3>

    <div className="text-xs text-gray-500">
      {savingGift ? "שומר..." : giftSaveError ? "שגיאה בשמירה" : "נשמר"}
    </div>
  </div>

  {giftSaveError && (
    <div className="text-sm text-red-600">{giftSaveError}</div>
  )}

  {/* אשראי */}
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
            // אם כיבו – ננקה כדי שלא יופיע בטעות
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
        placeholder="הדביקי כאן קישור לתשלום באשראי"
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
        placeholder="הדביקי כאן קישור ל-PayBox"
        className="w-full border rounded-xl p-3 text-sm"
        dir="ltr"
        inputMode="url"
      />
    )}
  </div>

  <p className="text-xs text-gray-500">
    הקישורים נשמרים בהזמנה ומתעדכנים בדף הקישור האישי.
  </p>
</div>


      <WhatsappTemplatePreview
        templateKey={templateName}
        previewText={previewText}
        headerImageUrl={headerImageUrl}
      />

      <div className="border rounded-2xl p-5 bg-white shadow-sm space-y-4">
  
  <div className="flex items-center justify-between">
    <div className="font-semibold text-gray-800">
      תזמון ההודעה
    </div>
    <span>⏱️</span>
  </div>

  {/* שליחה מיידית */}
  <label
    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer
    ${sendTiming === "now" ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
  >
    <span className="text-sm">שליחה מיידית</span>

    <input
      type="radio"
      checked={sendTiming === "now"}
      onChange={() => {
        setSendTiming("now");
        setScheduledDate("");
        setScheduledTime("");
      }}
      className="accent-blue-600"
    />
  </label>

  {/* שליחה מתוזמנת */}
  <label
    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer
    ${sendTiming === "scheduled" ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
  >
    <span className="text-sm">שליחה מתוזמנת</span>

    <input
      type="radio"
      checked={sendTiming === "scheduled"}
      onChange={() => setSendTiming("scheduled")}
      className="accent-blue-600"
    />
  </label>

  {/* תאריך ושעה */}
  {sendTiming === "scheduled" && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

{existingSchedule &&
  existingSchedule.status === "scheduled" &&
  existingSchedule.scheduledAt &&
  !isNaN(new Date(existingSchedule.scheduledAt).getTime()) && (
    <>
      <div className="text-sm text-gray-600">
        מתוזמן ל־
        {new Date(existingSchedule.scheduledAt).toLocaleDateString("he-IL")}{" "}
        בשעה{" "}
        {new Date(existingSchedule.scheduledAt).toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      <button
        onClick={handleCancelSchedule}
        disabled={cancelLoading}
        className="w-full bg-red-500 text-white py-3 rounded-xl mt-2 disabled:opacity-60"
      >
        {cancelLoading ? "מבטל..." : "❌ בטל תזמון"}
      </button>
    </>
)}


</div>

      {waStats && (
        <p className="text-sm text-center text-gray-700">
          נמסרו {waStats.delivered} מתוך {waStats.total}
          {waStats.pending > 0 && ` (עוד ${waStats.pending} בתהליך)`}
          {waStats.failed > 0 && ` • ${waStats.failed} נכשלו`}
        </p>
      )}

       <SendButton
  key={`${invitationId}-${templateName}-${
    round === 1
      ? (round1SentAt?.toISOString() ?? "null")
      : (round2SentAt?.toISOString() ?? "null")
  }`}
  channel="whatsapp"
  type="rsvp"
  invitationId={invitationId}
  templateName={templateName}
  audience={guestsToSend.map((g) => g._id)}
  scheduledAt={scheduledAt}
  disabled={blocked}
>
  {(round === 1 && round1SentAt) || (round === 2 && round2SentAt)
    ? "⏳ תהליך שליחה החל"
    : `📲 שלח אישור הגעה – סבב ${round}`}
</SendButton>

{(
  user?.role === "admin" ||
  (user as any)?.impersonatedByAdmin
) && (
  <button
    onClick={() =>
      toggleMessageLock(
        round === 1
          ? "rsvpWhatsappRound1"
          : "rsvpWhatsappRound2",

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

      {noAudience && (
        <p className="text-sm text-red-500">אין נמענים לשליחה בסבב זה</p>
      )}
    </div>

    
  );
}
