"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GuestAutocomplete from "../../components/GuestAutocomplete";

/* ================= TYPES ================= */

type Guest = {
  _id: string;
  name: string;
  phone: string;
  token: string;
  rsvp: "yes" | "no" | "pending";
  tableName?: string;
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
  { count: 1750, price: 175 },
  { count: 2000, price: 200 },
  { count: 2500, price: 250 },
  { count: 3000, price: 300 },
  { count: 4000, price: 400 },
  { count: 5000, price: 500 },
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
      "שלום {{name}} 🌸 שמחים לראות אותך 💛 מספר השולחן שלך באירוע: 🪑 {{tableName}} מחכים לך!",
  },
  custom: {
    label: "היי {{name}} 🌸 שמחנו לראותכם באירוע. תודה שהשתתפתם בשמחתנו.",
    content: "",
  },
};

/* ================= COMPONENT ================= */

  export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitation, setInvitation] = useState<any>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const [templateKey, setTemplateKey] = useState<MessageType>("rsvp");
  const [message, setMessage] = useState(MESSAGE_TEMPLATES.rsvp.content);

  const [filter, setFilter] = useState<FilterType>("pending");
  const [channel, setChannel] = useState<Channel>("whatsapp");

  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function loadData() {
      try {
        const invRes = await fetch("/api/invitations/my");
        const invData = await invRes.json();
        if (!invData.success) return;

        setInvitation(invData.invitation);

        const guestsRes = await fetch(
          `/api/guests?invitation=${invData.invitation._id}`
        );
        const guestsData = await guestsRes.json();
        setGuests(guestsData.guests || []);

        const balanceRes = await fetch("/api/messages/balance");
        const balanceData = await balanceRes.json();
        if (balanceData.success) setBalance(balanceData);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* ================= 🔄 REFRESH AFTER UPGRADE ================= */

  useEffect(() => {
    const upgraded = searchParams.get("upgraded");
    if (!upgraded) return;

    async function refreshBalance() {
      const balanceRes = await fetch("/api/messages/balance");
      const balanceData = await balanceRes.json();
      if (balanceData.success) setBalance(balanceData);
    }

    refreshBalance();
  }, [searchParams]);

  /* ================= PRESELECT GUEST ================= */

  useEffect(() => {
    const guestIdFromUrl = searchParams.get("guestId");
    if (guestIdFromUrl) {
      setChannel("whatsapp");
      setSelectedGuestId(guestIdFromUrl);
    }
  }, [searchParams]);

  /* ================= LOGIC ================= */

  const guestsToSend = useMemo(() => {
    return guests.filter((g) => {
      if (filter === "pending") return g.rsvp === "pending";
      if (filter === "withTable") return !!g.tableName;
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

    return message
      .replace("{{name}}", guest.name)
      .replace(
        "{{rsvpLink}}",
        `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`
      )
      .replace("{{tableName}}", guest.tableName || "");
  };

  /* ================= SEND ================= */

  const sendWhatsApp = (guest: Guest) => {
    const phone = `972${guest.phone.replace(/\D/g, "").replace(/^0/, "")}`;
    const text = buildMessage(guest);

    window.open(
      `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURI(text)}`,
      "_blank"
    );
  };

  const sendSMS = async () => {
  if (!invitation || !hasSmsBalance) {
    console.warn("❌ No invitation or no SMS balance");
    return;
  }

  console.log("📤 Sending SMS", {
    invitationId: invitation._id,
    template: templateKey,
    filter,
  });

  try {
    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationId: invitation._id,
        template: templateKey,
        filter,
        customText: templateKey === "custom" ? message : undefined,
      }),
    });

    console.log("📬 SMS API status:", res.status);

    const data = await res.json();
    console.log("📦 SMS API response:", data);

    if (!res.ok || !data?.success) {
      alert("❌ שליחת SMS נכשלה");
      return;
    }

    alert(`✅ נשלחו ${data.sent} הודעות`);

    // 🔄 ריענון יתרה אחרי שליחה
    const balanceRes = await fetch("/api/messages/balance");
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
    if (channel === "whatsapp") {
      const guest = guests.find((g) => g._id === selectedGuestId);
      if (!guest) return alert("בחר/י מוזמן לשליחה");
      sendWhatsApp(guest);
    } else {
      sendSMS();
    }
  };

  const selectedGuest =
    guests.find((g) => g._id === selectedGuestId) || null;

  /* ================= RENDER ================= */

  if (loading) return null;
  if (!invitation) return <div>לא נמצאה הזמנה</div>;

  const remaining = balance?.remainingMessages ?? 0;
const max = balance?.maxMessages ?? 0;
const used = max - remaining;

const progress = max > 0 ? (used / max) * 100 : 0;

  return (
    <div className="p-10 flex flex-col items-center" dir="rtl">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 mb-3 hover:underline self-start"
      >
        ← חזרה
      </button>

      <h1 className="text-3xl font-semibold mb-8 text-[#4a413a] text-center">
        שליחת הודעות לאורחים 💌
      </h1>

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
                  `/dashboard/purchase-sms?count=${selectedPackage || ""}`
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
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setChannel("whatsapp")}
          className={`px-4 py-2 rounded-full border ${
            channel === "whatsapp" ? "bg-blue-600 text-white" : ""
          }`}
        >
          WhatsApp
        </button>

        <button
          disabled={!hasSmsBalance}
          onClick={() => setChannel("sms")}
          className={`px-4 py-2 rounded-full border ${
            channel === "sms" ? "bg-blue-600 text-white" : ""
          } ${!hasSmsBalance ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          SMS
        </button>
      </div>

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

      {channel === "sms" && (
        <div className="mb-6 w-[90%] md:w-[600px]">
          <label className="block mb-2">למי לשלוח:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="w-full border rounded-xl p-3"
          >
            <option value="all">לכל המוזמנים</option>
            <option value="pending">למי שטרם ענה</option>
            <option value="withTable">למי שיש מספר שולחן</option>
          </select>
        </div>
      )}

      <select
        value={templateKey}
        onChange={(e) => {
          const key = e.target.value as MessageType;
          setTemplateKey(key);
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

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        className="w-[90%] md:w-[600px] border rounded-xl p-4 mb-6"
      />

      <button
        onClick={sendToAll}
        disabled={channel === "whatsapp" ? !selectedGuestId : disableSend}
        className="w-[90%] md:w-[600px] bg-green-600 text-white py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        {channel === "whatsapp"
          ? "💬 שלח ב־WhatsApp"
          : `📩 שליחה (${guestsToSend.length})`}
      </button>
    </div>
  );
}
