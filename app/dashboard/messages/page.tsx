"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

/* ================= TEMPLATES ================= */

const MESSAGE_TEMPLATES: Record<
  MessageType,
  { label: string; content: string; requiresTable?: boolean }
> = {
  rsvp: {
    label: "אישור הגעה",
    content:
      "היי {{name}} 💛\nנשמח לדעת אם תגיע/י לאירוע 🎉\nלאישור הגעה:\n{{rsvpLink}}",
  },
  table: {
    label: "מספר שולחן",
    requiresTable: true,
    content:
      "שלום {{name}} 🌸\nמספר השולחן שלך:\n🪑 {{tableName}}\nמחכים לך!",
  },
  custom: {
    label: "הודעה חופשית",
    content: "",
  },
};

/* ================= COMPONENT ================= */

export default function MessagesPage() {
  const router = useRouter();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitation, setInvitation] = useState<any>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

  const [templateKey, setTemplateKey] = useState<MessageType>("rsvp");
  const [message, setMessage] = useState(MESSAGE_TEMPLATES.rsvp.content);

  const [filter, setFilter] = useState<FilterType>("pending");
  const [channel, setChannel] = useState<Channel>("whatsapp");

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
        if (balanceData.success) {
          setBalance(balanceData);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* ================= PLAN LOGIC ================= */

  const isBasicPlan = invitation?.plan === "basic";

  useEffect(() => {
    if (isBasicPlan && channel === "sms") {
      setChannel("whatsapp");
    }
  }, [isBasicPlan, channel]);

  /* ================= TEMPLATE CHANGE ================= */

  useEffect(() => {
    setMessage(MESSAGE_TEMPLATES[templateKey].content);
    if (
      MESSAGE_TEMPLATES[templateKey].requiresTable &&
      filter !== "withTable"
    ) {
      setFilter("withTable");
    }
  }, [templateKey]);

  /* ================= FILTERED GUESTS ================= */

  const guestsToSend = useMemo(() => {
    return guests.filter((g) => {
      if (filter === "pending") return g.rsvp === "pending";
      if (filter === "withTable") return !!g.tableName;
      return true;
    });
  }, [guests, filter]);

  const disableSend =
    guestsToSend.length === 0 ||
    (channel === "sms" && isBasicPlan) ||
    (channel === "sms" &&
      !!balance &&
      balance.remainingMessages < guestsToSend.length);

  /* ================= MESSAGE BUILD ================= */

  const buildMessage = (guest: Guest) => {
    if (!invitation) return "";

    return message
      .replace("{{name}}", guest.name)
      .replace(
        "{{rsvpLink}}",
        `https://invistimo.com/invite/rsvp/${invitation.shareId}?token=${guest.token}`
      )
      .replace("{{tableName}}", guest.tableName || "");
  };

  /* ================= SEND ================= */

  const sendWhatsApp = (guest: Guest) => {
    const phone = `972${guest.phone.replace(/\D/g, "").replace(/^0/, "")}`;
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(buildMessage(guest))}`,
      "_blank"
    );
  };

  const sendSMS = async () => {
    if (!invitation || isBasicPlan) return;

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invitationId: invitation._id,
        template: templateKey,
        filter,
        customText: templateKey === "custom" ? message : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(
        data.error === "NO_SMS_BALANCE"
          ? "❌ אין יתרת הודעות מספקת"
          : "❌ שליחת SMS נכשלה"
      );
      return;
    }

    const balanceRes = await fetch("/api/messages/balance");
    const balanceData = await balanceRes.json();
    if (balanceData.success) {
      setBalance(balanceData);
    }

    alert(`✅ נשלחו ${data.sent} הודעות`);
  };

  const sendToAll = () => {
    if (channel === "whatsapp") {
      guestsToSend.forEach((guest, index) => {
        setTimeout(() => sendWhatsApp(guest), index * 600);
      });
    } else {
      sendSMS();
    }
  };

  if (loading) return null;
  if (!invitation) return <div>לא נמצאה הזמנה</div>;

  /* ================= RENDER ================= */

  return (
    <div className="p-10 max-w-4xl mx-auto" dir="rtl">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 mb-3 hover:underline"
      >
        ← חזרה
      </button>

      <h1 className="text-3xl font-semibold mb-6">{invitation.eventType}</h1>

      {/* Balance */}
      {balance && (
        <div className="bg-gradient-to-r from-[#fffaf5] to-[#f5eee7] border border-[#e2d6c8] rounded-2xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-semibold text-[#4a413a]">
              💬 יתרת הודעות SMS
            </span>
            <span
              className={`text-lg font-bold ${
                balance.remainingMessages === 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {balance.remainingMessages} / {balance.maxMessages}
            </span>
          </div>

          <div className="w-full bg-[#e2d6c8]/40 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                balance.remainingMessages === 0
                  ? "bg-red-500"
                  : "bg-green-500"
              }`}
              style={{
                width: `${
                  balance.maxMessages > 0
                    ? (balance.remainingMessages / balance.maxMessages) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          <p className="text-sm text-[#6b5e52] mt-3">
            {invitation.plan === "basic"
              ? "חבילת בסיס – אין אפשרות לשליחת SMS (0/0)"
              : `נותרו ${balance.remainingMessages} הודעות מתוך ${balance.maxMessages} בחבילה.`}
          </p>
        </div>
      )}

      {/* Channel */}
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
          disabled={isBasicPlan}
          onClick={() => setChannel("sms")}
          className={`px-4 py-2 rounded-full border ${
            channel === "sms" ? "bg-blue-600 text-white" : ""
          } ${isBasicPlan ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          SMS
        </button>
      </div>

      {/* Filter - למי לשלוח */}
      <div className="mb-6">
        <label className="block text-[#4a413a] font-medium mb-2">
          למי לשלוח:
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="w-full border border-[#e2d6c8] rounded-xl p-3 bg-white shadow-sm"
        >
          <option value="all">לכל המוזמנים</option>
          <option value="pending">למי שטרם ענה</option>
          <option value="withTable">למי שיש מספר שולחן</option>
        </select>
      </div>

      {/* Template */}
      <select
        value={templateKey}
        onChange={(e) => setTemplateKey(e.target.value as MessageType)}
        className="w-full border rounded-xl p-3 mb-4"
      >
        {Object.entries(MESSAGE_TEMPLATES).map(([key, t]) => (
          <option key={key} value={key}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        className="w-full border rounded-xl p-4 mb-4"
      />

      {/* Send */}
      <button
        onClick={sendToAll}
        disabled={disableSend}
        className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        📩 שליחה ({guestsToSend.length})
      </button>
    </div>
  );
}
