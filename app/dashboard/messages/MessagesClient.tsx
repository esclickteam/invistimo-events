"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GuestAutocomplete from "../../components/GuestAutocomplete";
import ScheduledMessagesTable from "@/app/components/ScheduledMessagesTable";
import Link from "next/link";


/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  rsvp: "yes" | "no" | "pending";
  tableName?: string;
  tableNumber?: number;
};

type MessageType = "rsvp" | "table" | "custom";
type FilterType = "all" | "pending" | "withTable";
type Channel = "whatsapp" | "sms";

type Balance = {
  maxMessages: number;
  remainingMessages: number;
};

/* ================= SMS PACKAGES ================= */

const SMS_PACKAGES = [
  { count: 500, price: 50 },
  { count: 750, price: 75 },
  { count: 1000, price: 100 },
  { count: 1250, price: 125 },
  { count: 1500, price: 150 },
  
];

/* ================= TEMPLATES ================= */

const MESSAGE_TEMPLATES: Record<
  MessageType,
  { label: string; content: string; requiresTable?: boolean }
> = {
  rsvp: {
    label: "אישור הגעה",
    content:
    "היי {{name}},\nנשמח לדעת אם תגיעו לחגוג איתנו 🎉\n\nלאישור הגעה לחצו כאן:\n{{rsvpLink}}\n\nמחכים לכם באהבה 💖",

  },
  table: {
    label: "מספר שולחן",
    requiresTable: true,
    content:
  "היי {{name}} 🌸 שמחים לראות אותך 💛\n" +
  "מספר השולחן שלך באירוע:\n" +
  "🪑 {{tableName}}\n\n" +
  "📍 ניווט לאירוע:\n" +
  "{{navigationLink}}\n\n" +
  "מחכים לך!",
  },
  custom: {
  label: "הודעת תודה",
  content: "היי {{name}} 🌸\nשמחנו לראותכם באירוע.\nתודה שהשתתפתם בשמחתנו.",


},
};

/* ================= COMPONENT ================= */

  export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDemo =
  searchParams.get("demo") === "1" ||
  typeof window !== "undefined" && window.location.pathname.startsWith("/try/");


  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitation, setInvitation] = useState<any>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const [templateKey, setTemplateKey] = useState<MessageType>("rsvp");
  const [message, setMessage] = useState(MESSAGE_TEMPLATES.rsvp.content);

  const [filter, setFilter] = useState<FilterType>("all");

  const [channel, setChannel] = useState<Channel>("sms");


  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [showScheduled, setShowScheduled] = useState(false);
  const [includeGiftLink, setIncludeGiftLink] = useState(false);
  const [giftLink, setGiftLink] = useState("");



  /* ================= SCHEDULING ================= */

type SendTiming = "now" | "scheduled";

const [sendTiming, setSendTiming] = useState<SendTiming>("now");
const [scheduledDate, setScheduledDate] = useState<string>("");
const [scheduledTime, setScheduledTime] = useState<string>("");

const scheduledAt = useMemo(() => {
  if (sendTiming !== "scheduled" || !scheduledDate || !scheduledTime)
    return null;

  const [year, month, day] = scheduledDate.split("-").map(Number);
  const [hour, minute] = scheduledTime.split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}, [sendTiming, scheduledDate, scheduledTime]);

 /* ================= LOAD DATA ================= */

useEffect(() => {
  async function loadData() {

    /* ================= DEMO MODE ================= */
    if (isDemo) {
      setInvitation({
        _id: "demo-invitation",
        shareId: "demo123",
        eventLocation: {
          lat: 32.0853,
          lng: 34.7818,
        },
      });

      setGuests([
        {
          _id: "demo-1",
          name: "דנה לוי",
          phone: "0501234567",
          token: "token1",
          rsvp: "pending",
          tableName: "שולחן 5",
        },
        {
          _id: "demo-2",
          name: "יואב כהן",
          phone: "0529876543",
          token: "token2",
          rsvp: "yes",
          tableName: "שולחן 2",
        },
        {
          _id: "demo-3",
          name: "רוני ישראלי",
          phone: "0543332211",
          token: "token3",
          rsvp: "pending",
        },
      ]);

      setBalance({
        maxMessages: 300,
        remainingMessages: 300,
      });

      setLoading(false);
      return; // ⛔ חשוב: עוצר כאן ולא ממשיך לפרודקשן
    }

    /* ================= PRODUCTION ================= */
try {
  const invRes = await fetch("/api/invitations/my");
  const invData = await invRes.json();

  setInvitation(invData.invitation ?? null);

  // 🔹 טוענים יתרת הודעות תמיד
  const balanceRes = await fetch("/api/messages/balance", {
  credentials: "include",
  cache: "no-store",
});

const balanceData = await balanceRes.json();
if (balanceData.success) {
  setBalance(balanceData);
}


  // 🔹 אורחים – רק אם יש הזמנה
  if (invData.invitation?._id) {
    const guestsRes = await fetch(
      `/api/guests?invitation=${invData.invitation._id}`
    );
    const guestsData = await guestsRes.json();
    setGuests(guestsData.guests || []);
  } else {
    setGuests([]);
  }
} finally {
  setLoading(false);
}

  }

  loadData();
}, [isDemo]);



  /* ================= 🔄 REFRESH AFTER UPGRADE ================= */

  useEffect(() => {
  const upgraded = searchParams.get("upgraded");
  if (!upgraded) return;

  async function refreshBalance() {
    const balanceRes = await fetch("/api/messages/balance", {
      credentials: "include", // ⭐️ חובה – authToken
      cache: "no-store",      // ⭐️ בלי קאש
    });

    const balanceData = await balanceRes.json();

    if (balanceData.success) {
      setBalance(balanceData);
    }
  } // ✅ סוגר פונקציה

  refreshBalance(); // ✅ קריאה לפונקציה
}, [searchParams]);


  /* ================= PRESELECT GUEST ================= */

  useEffect(() => {
    const guestIdFromUrl = searchParams.get("guestId");
    if (guestIdFromUrl) {
      setChannel("whatsapp");
      setSelectedGuestId(guestIdFromUrl);
    }
  }, [searchParams]);

  /* ================= RESET SCHEDULING WHEN WHATSAPP ================= */

useEffect(() => {
  if (channel === "whatsapp") {
    setSendTiming("now");
    setScheduledDate("");
    setScheduledTime("");
  }
}, [channel]);


  /* ================= LOGIC ================= */

  const smsLength = message.length;
const smsParts = Math.max(1, Math.ceil(smsLength / 160));


  const guestsToSend = useMemo(() => {
    return guests.filter((g) => {
      if (filter === "pending") return g.rsvp === "pending";
      if (filter === "withTable") return !!g.tableName || !!g.tableNumber;

    


      return true;
    });
  }, [guests, filter]);

   const hasSmsBalance =
    balance !== null && balance.remainingMessages > 0;

  const disableSend =
    guestsToSend.length === 0 ||
    (channel === "sms" &&
      (!balance ||
        balance.remainingMessages < guestsToSend.length));

  const buildMessage = (guest: Guest) => {
  if (!invitation) return "";

  // ⭐ מקור אמת אחד
  const baseTemplate = message;

  const location = invitation.eventLocation ?? invitation.event?.location;
  const hasLocation = !!(location?.lat && location?.lng);

  // 📍 ניווט – רק אם צריך ויש מיקום
  const navigationLink =
  templateKey === "table" && hasLocation
    ? `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`
    : "";

  const rsvpLink = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

  // 🪑 מספר שולחן
  const tableName =
     guest.tableName ||
    (typeof guest.tableNumber === "number"
      ? `שולחן ${guest.tableNumber}`
      : "");

  let finalMessage = baseTemplate
    .replace(/{{name}}/g, guest.name || "")
    .replace(/{{rsvpLink}}/g, rsvpLink)
    .replace(/{{tableName}}/g, tableName)
    .replace(/{{navigationLink}}/g, navigationLink);

  // 🎁 מתנה באשראי
  if (includeGiftLink && giftLink) {
    finalMessage += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
  }

  return finalMessage.trim();
};






/* ================= SEND ================= */

const sendWhatsApp = (guest: Guest) => {
  if (!invitation) return;

  const phone = `972${guest.phone.replace(/\D/g, "").replace(/^0/, "")}`;

  // ✅ תמיד נשלח את ההודעה המוכנה מ-buildMessage (כולל token)
  let text = buildMessage(guest);

  // ✅ מוריד אימוג'ים רק בוואטספ
  const stripEmojis = (s: string) =>
    s
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, "") // רוב האימוג'ים
      .replace(/[\u{2600}-\u{26FF}]/gu, "")   // סמלים (☀️ וכו')
      .replace(/[\u{2700}-\u{27BF}]/gu, "")   // דינגבאטס
      .replace(/[\u{FE0F}\u{200D}]/gu, "");   // Variation Selector + ZWJ

  text = stripEmojis(text);

  // ❌ לא לנקות token — אחרת לא יזהה את האורח
  // text = text.replace(/\?token=[A-Za-z0-9_-]+/g, "");

  // ✅ אם לא רוצים את השורה הזו בוואטספ (רק את הכותרת עצמה), נשאיר:
  text = text.replace(/📍 ניווט לאירוע:\s*\n?/g, "");

  // ניקוי תווים נסתרים
  text = text.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "");

  // ניקוי רווחים כפולים אחרי הורדת אימוג'ים
  text = text.replace(/[ \t]{2,}/g, " ").trim();

  const encodedText = encodeURIComponent(text);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = isMobile
    ? `whatsapp://send?phone=${phone}&text=${encodedText}`
    : `https://wa.me/${phone}?text=${encodedText}`;

  window.open(url, "_blank", "noopener,noreferrer");
};

const loadScheduledMessages = async () => {
  try {
    const res = await fetch("/api/scheduled-messages");
    const data = await res.json();

    if (data.success) {
      setScheduledMessages(data.messages);
    }
  } catch (err) {
    console.error("❌ Failed to load scheduled messages", err);
  }
};



  const sendSMS = async () => {
  if (!invitation || !hasSmsBalance) {
    console.warn("❌ No invitation or no SMS balance");
    return;
  }



  try {
  const res = await fetch("/api/sms/send", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },

  body: JSON.stringify({
  invitationId: invitation._id,
  filter,
  templateKey,
  scheduledAt,
  includeGiftLink,
  giftLink,
}),
});

    console.log("📬 SMS API status:", res.status);

    const data = await res.json();
    console.log("📦 SMS API response:", data);

    if (!res.ok || !data?.success) {
  if (isDemo) {
    alert("🟡 אתם במצב דמו\nלשליחת הודעות אמיתית – יש להצטרף ולרכוש חבילה");
  } else {
    alert("❌ שליחת SMS נכשלה");
  }
  return;
}


if (data.scheduled) {
  alert(`⏱️ ההודעה תוזמנה בהצלחה\nתישלח ל־${data.guestsCount} אורחים`);
} else {
  alert(`✅ נשלחו ${data.sent} הודעות`);
}

    // 🔄 ריענון יתרה אחרי שליחה
    const balanceRes = await fetch("/api/messages/balance", {
  credentials: "include",
  cache: "no-store",
});

const balanceData = await balanceRes.json();
if (balanceData.success) {
  setBalance(balanceData);
}

  } catch (err) {
    console.error("💥 SMS SEND ERROR:", err);
    alert("❌ שגיאה בשליחת SMS");
  }
};


  const sendToAll = () => {
  if (isDemo) {
    alert("🟡 זהו דמו בלבד\nכדי לשלוח הודעות אמיתיות יש לפתוח אירוע");
    return;
  }

  // 🎁 ולידציה – קישור מתנה באשראי
  if (includeGiftLink && !giftLink) {
    alert("נא להזין קישור למתנה באשראי");
    return;
  }

  // ⏱️ ולידציה לתזמון
  if (sendTiming === "scheduled" && !scheduledAt) {
    alert("נא לבחור תאריך ושעה לשליחה");
    return;
  }

  // ❗ לחסום תזמון ל־WhatsApp
  if (channel === "whatsapp" && sendTiming === "scheduled") {
    alert("תזמון זמין כרגע לשליחת SMS בלבד");
    return;
  }

  // 🔒 ולידציה לתבניות שדורשות שולחן
  if (channel === "sms") {
    const template = MESSAGE_TEMPLATES[templateKey];

    if (template.requiresTable && filter !== "withTable") {
      alert("הודעת מספר שולחן ניתנת לשליחה רק למוזמנים עם שולחן");
      return;
    }
  }

  // 🚀 שליחה בפועל
  if (channel === "whatsapp") {
    const guest = guests.find((g) => g._id === selectedGuestId);
    if (!guest) {
      alert("בחר/י מוזמן לשליחה");
      return;
    }
    sendWhatsApp(guest);
  } else {
    sendSMS();
  }
};




  const selectedGuest =
    guests.find((g) => g._id === selectedGuestId) || null;

      /* ================= PREVIEW HELPER ================= */
  const renderPreviewText = (text: string) => {
    return text.split("\n").map((line, i) => (
      <p key={i} className="leading-relaxed">
        {line || <span>&nbsp;</span>}
      </p>
    ));
  };

const smsPreviewText =
  channel === "sms" && guests.length > 0
    ? buildMessage(guests[0])
    : message;


  /* ================= RENDER ================= */

  if (loading) return null;

// בפרודקשן – חובה הזמנה, בדמו לא חוסמים תצוגה
const hasInvitation = !!invitation;


  const remaining = balance?.remainingMessages ?? 0;
const max = balance?.maxMessages ?? 0;
const used = max - remaining;

const progress = max > 0 ? (used / max) * 100 : 0;

 return (
  <div className="p-10 flex flex-col items-center" dir="rtl">
    {isDemo && (
      <div className="mb-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-xl text-sm">
        🧪 מצב הדגמה – שליחת הודעות זמינה לאחר{" "}
        <a
          href="https://www.invistimo.com/pricing"
          className="
            font-semibold
            underline
            underline-offset-2
            text-amber-700
            hover:text-amber-900
            transition
            whitespace-nowrap
          "
        >
          הצטרפות
        </a>
      </div>
    )}

    <button
      onClick={() => router.back()}
      className="text-sm text-gray-500 mb-3 hover:underline self-start"
    >
      ← חזרה
    </button>

    <div className="w-full max-w-[900px] flex items-center justify-center mb-8">
  <h1 className="text-3xl font-semibold text-[#4a413a] text-center">
    שליחת הודעות לאורחים 💌
  </h1>
</div>



      {/* BALANCE CARD */}
      {balance && (
        <div className="bg-gradient-to-r from-[#fff7f0] to-[#f7ede2] border border-[#e2d6c8] rounded-2xl shadow-md p-6 w-[90%] md:w-[600px] text-center mb-10">
          <h2 className="text-lg font-semibold text-[#4a413a] mb-2">
            💬 יתרת הודעות SMS
          </h2>

          <div className="w-full bg-[#e2d6c8]/40 h-3 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                remaining === 0 ? "bg-red-500" : "bg-green-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-4xl font-bold text-[#4a413a] mb-1">
  {remaining}
</p>

<p className="text-sm text-[#6b5e52] mb-1">
  הודעות SMS זמינות
</p>

{remaining <= 20 && remaining > 0 && (
  <p className="text-xs text-orange-600">
    ⚠️ נותרו מעט הודעות – מומלץ לרכוש חבילה
  </p>
)}

{remaining === 0 && (
  <p className="text-xs text-red-600">
    ❌ אין יתרת הודעות – יש לרכוש חבילה
  </p>
)}


          <div className="mt-5">
            <select
              className="w-full border border-[#e2d6c8] rounded-xl p-3 mb-3"
              value={selectedPackage ?? ""}
              onChange={(e) => setSelectedPackage(Number(e.target.value))}
            >
              <option value="">בחרו חבילת הודעות לרכישה</option>
              {SMS_PACKAGES.map((pkg) => (
                <option key={pkg.count} value={pkg.count}>
                  {pkg.count.toLocaleString()} הודעות ב־{pkg.price} ₪
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                router.push(
                  `/dashboard/purchase-sms?priceKey=extra_messages_${selectedPackage}`
                )
              }
              disabled={!selectedPackage}
              className="w-full py-3 bg-[#c9a46a] text-white rounded-xl font-semibold disabled:opacity-50"
            >
              💳 מעבר לתשלום ורכישת הודעות
            </button>
          </div>
        </div>
      )}

      {/* CHANNEL */}
      {/* ================= STEP 1: CHANNEL ================= */}
{/* ================= STEP 3: MESSAGE ================= */}
<section className="w-[90%] md:w-[600px] mb-10">
  <div className="mb-4">
    <h2 className="text-lg font-semibold text-[#4a413a]">
      3️⃣ תוכן ההודעה
    </h2>
    <p className="text-sm text-gray-500">
      בחרו תבנית או ערכו את ההודעה לפני השליחה
    </p>
  </div>


  <div className="flex gap-4">
    <button
      onClick={() => setChannel("whatsapp")}
      className={`px-4 py-2 rounded-full border ${
        channel === "whatsapp" ? "bg-blue-600 text-white" : ""
      }`}
    >
      WhatsApp
    </button>

    <button
      disabled={!hasInvitation && !isDemo}
      onClick={() => setChannel("sms")}
      className={`px-4 py-2 rounded-full border ${
        channel === "sms" ? "bg-blue-600 text-white" : ""
      } ${!hasInvitation && !isDemo ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      SMS
    </button>
  </div>

  {/* טקסט הכוונה מקצועי */}
  <p className="text-xs text-gray-500 mt-2">
    💡 SMS – פתיחה גבוהה להזמנות | WhatsApp – שליחה אישית
  </p>
</section>



      {channel === "whatsapp" && (
        <div className="w-[90%] md:w-[600px] mb-6">
          <label className="block mb-2 font-semibold text-[#4a413a]">
            בחר/י מוזמן לשליחה:
          </label>

          <GuestAutocomplete
            guests={guests}
            value={selectedGuest}
            onSelect={(id: string) => setSelectedGuestId(id)}
          />
        </div>
      )}

      {/* ================= STEP 2: AUDIENCE ================= */}
{channel === "sms" && (
  <section className="w-[90%] md:w-[600px] mb-10">
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-[#4a413a]">
        2️⃣ קהל יעד
      </h2>
      <p className="text-sm text-gray-500">
        בחרו אילו אורחים יקבלו את ההודעה
      </p>
    </div>

    <select
      value={filter}
      onChange={(e) => setFilter(e.target.value as FilterType)}
      className="w-full border rounded-xl p-3"
    >
      <option value="all">
        לכל המוזמנים ({guests.length})
      </option>

      <option value="pending">
        למי שטרם ענה ({guests.filter(g => g.rsvp === "pending").length})
      </option>

      <option value="withTable">
        למי שיש מספר שולחן (
        {guests.filter(g => g.tableName || g.tableNumber).length})
      </option>
    </select>

    {/* חיווי בטחון */}
    <div className="mt-3">
      <p className="text-sm text-[#4a413a]">
        יישלח ל־<strong>{guestsToSend.length}</strong> אורחים
      </p>

      {filter === "pending" && (
        <p className="text-xs text-green-600 mt-1">
          ✔ מומלץ – מגדיל שיעור אישורי הגעה
        </p>
      )}

      {filter === "withTable" && (
        <p className="text-xs text-blue-600 mt-1">
          ℹ️ רק אורחים ששובצו לשולחן יקבלו הודעה
        </p>
      )}

      {filter === "all" && (
        <p className="text-xs text-orange-600 mt-1">
          ⚠️ כולל גם אורחים שכבר ענו
        </p>
      )}
    </div>

    {isDemo && (
      <p className="text-xs text-gray-500 mt-2">
        🧪 בדמו ניתן לצפות בפילוחים – שליחה פעילה לאחר פתיחת אירוע
      </p>
    )}
  </section>
)}



      <div className="w-[90%] md:w-[600px] mb-2">
  <label className="block font-semibold text-[#4a413a] mb-1">
    תוכן ההודעה:
  </label>
  <p className="text-sm text-gray-500">
    בחרו הודעה מתוך מאגר התבניות או ערכו את הטקסט לפי הצורך
  </p>
</div>


      <select
  value={templateKey}
  onChange={(e) => {
    const key = e.target.value as MessageType;
    setTemplateKey(key);

    // ⭐ מקור אמת: message
    setMessage(MESSAGE_TEMPLATES[key].content);
  }}
  className="w-[90%] md:w-[600px] border rounded-xl p-3 mb-4"
>
        {Object.entries(MESSAGE_TEMPLATES).map(([key, t]) => (
          <option key={key} value={key}>
            {t.label}
          </option>
        ))}
      </select>

      {templateKey === "table" && filter !== "withTable" && (
  <p className="text-xs text-red-600 mt-2">
    ❌ הודעת מספר שולחן זמינה רק לשליחה לאורחים עם שולחן
  </p>
)}


      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        className="w-[90%] md:w-[600px] border rounded-xl p-4 mb-6"
      />

      <p
  className={`text-xs mt-1 text-left ${
    smsParts > 1 ? "text-orange-600" : "text-gray-500"
  }`}
>
  {smsLength} תווים · {smsParts} SMS
</p>


      {/* ================= CREDIT GIFT LINK ================= */}
<div className="w-[90%] md:w-[600px] mb-6 border rounded-xl p-4 bg-[#faf9f7]">
  <label className="flex items-start gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={includeGiftLink}
      onChange={(e) => setIncludeGiftLink(e.target.checked)}
      className="mt-1"
    />
    <span className="text-sm text-[#4a413a]">
      תוספת להודעה: קישור למתנות באשראי  
      <span className="block text-xs text-gray-500">
        מותנה בהרשמה למערכת ספק צד ג’ (RSVP)
      </span>
    </span>
  </label>

  {includeGiftLink && (
    <div className="mt-4">
      <label className="block text-sm font-semibold mb-1">
        קישור למתנה באשראי (לכל האורחים)
      </label>
      <input
        type="url"
        placeholder="https://..."
        value={giftLink}
        onChange={(e) => setGiftLink(e.target.value)}
        className="w-full border rounded-xl p-3"
      />
    </div>
  )}
</div>


      {/* PHONE PREVIEW */}
<div className="w-[90%] md:w-[360px] mt-4 mb-6">
  <p className="text-sm text-gray-500 mb-2 text-center">
    תצוגה מקדימה – כך האורח יקבל את ההודעה
  </p>

  <div className="mx-auto bg-black rounded-[36px] p-3 shadow-xl">

    <div
  className={`rounded-[28px] overflow-hidden ${
    channel === "sms" ? "bg-white" : ""
  }`}
  style={
    channel === "whatsapp"
      ? {
          backgroundImage: "url('/whatsapp-bg.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",

        }
      : undefined
  }
>


      {/* Header */}
      <div className="bg-gray-100 text-center py-2 text-xs font-semibold">
  INVISTIMO · {channel === "sms" ? "SMS" : "WhatsApp"}
</div>

      {/* Message bubble */}
      <div className="p-4 flex justify-center">


  <div
  className={`rounded-2xl p-3 text-sm max-w-[90%] whitespace-pre-wrap leading-relaxed break-words ${
    channel === "sms"
      ? "bg-gray-200 text-gray-900"
      : "bg-[#dcf8c6] text-gray-900"
  }`}
>

    {channel === "sms" ? (
  renderPreviewText(smsPreviewText)
) : selectedGuest ? (

  <div className="space-y-2">
    {buildMessage(selectedGuest)
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("http")) {
          return (
            <div
              key={i}
              className="bg-white border rounded-lg p-2 text-green-700 text-xs break-all"
            >
              {line}
            </div>
          );
        }

        return <p key={i}>{line}</p>;
      })}
  </div>
) : (
  renderPreviewText(message)
)}

  </div>
</div>

    </div>
  </div>
</div>

 {/* ================= MESSAGE TIMING ================= */}
{channel === "sms" && !isDemo && (

  <div className="w-[90%] md:w-[600px] mb-6 border rounded-xl p-4 bg-[#faf9f7]">
  <label className="block font-semibold text-[#4a413a] mb-3">
    ⏱️ תזמון ההודעה
  </label>

  {/* בחירת סוג שליחה */}
  <div className="flex flex-col gap-3 mb-4">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        checked={sendTiming === "now"}
        onChange={() => setSendTiming("now")}
      />
      <span className="font-medium">שליחה מיידית</span>
    </label>

    {sendTiming === "now" && (
      <p className="text-xs text-orange-600 mr-6">
        ⚠️ ההודעה תישלח מיד ולא ניתן יהיה לבטל את השליחה
      </p>
    )}

    <label className="flex items-center gap-2 cursor-pointer mt-2">
      <input
        type="radio"
        checked={sendTiming === "scheduled"}
        onChange={() => setSendTiming("scheduled")}
      />
      <span className="font-medium">שליחה מתוזמנת</span>
    </label>

    {sendTiming === "scheduled" && (
      <p className="text-xs text-green-600 mr-6">
        ✔ ניתן לערוך או לבטל את ההודעה עד מועד השליחה
      </p>
    )}
  </div>

  {/* תאריך ושעה */}
  {sendTiming === "scheduled" && (
    <div className="flex gap-4 mb-2">
      <div className="flex-1">
        <label className="text-sm text-gray-600 block mb-1">
          תאריך שליחה
        </label>
        <input
          type="date"
          min={new Date().toLocaleDateString("en-CA")}
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          className="w-full border rounded-xl p-3"
        />
      </div>

      <div className="flex-1">
        <label className="text-sm text-gray-600 block mb-1">
          שעת שליחה
        </label>
        <input
          type="time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="w-full border rounded-xl p-3"
        />
      </div>
    </div>
  )}

  {/* סיכום קטן */}
  {sendTiming === "scheduled" && scheduledAt && (
    <p className="text-xs text-gray-500 mt-2">
      📅 ההודעה תישלח ב־
      <strong>{scheduledAt.toLocaleDateString("he-IL")}</strong>{" "}
      בשעה{" "}
      <strong>
        {scheduledAt.toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </strong>
    </p>
  )}
</div>

)}






      {/* כפתור שליחה ראשי */}
{/* כפתור שליחה ראשי */}
<button
  onClick={sendToAll}
  disabled={
    isDemo ||
    (channel === "whatsapp" ? !selectedGuestId : disableSend)
  }
  title={isDemo ? "שליחה זמינה לאחר פתיחת אירוע" : undefined}
  className="
    w-[90%] md:w-[600px]
    bg-green-600 text-white
    py-4 rounded-xl text-lg font-semibold
    disabled:opacity-50 disabled:cursor-not-allowed
  "
>
  {isDemo
    ? "🔒 שליחה זמינה לאחר פתיחת אירוע"
    : channel === "whatsapp"
    ? "💬 שלח ב־WhatsApp"
    : `📩 שליחה (${guestsToSend.length})`}
</button>

{/* כפתור פתיחת מודאל הודעות מתוזמנות */}
{channel === "sms" && !isDemo && (
  <button
    onClick={async () => {
      await loadScheduledMessages();
      setShowScheduled(true);
    }}
    className="mt-4 text-sm text-[#6b5e52] underline hover:text-black"
  >
    📅 צפייה בהודעות מתוזמנות
  </button>
)}


{/* מודאל הודעות מתוזמנות – נפתח רק בלחיצה */}
{showScheduled && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
    <div
  className="
    bg-white rounded-2xl relative
    w-[95%] max-w-[900px]

    max-h-[85vh] overflow-y-auto
    p-4 sm:p-6
  "
>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">📅 הודעות מתוזמנות</h2>

        <button
          onClick={() => setShowScheduled(false)}
          className="text-gray-500 hover:text-black text-xl"
        >
          ✕
        </button>
      </div>

      {/* Table */}
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
