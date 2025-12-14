"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@headlessui/react";

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

  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [query, setQuery] = useState("");

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

  /* ================= REFRESH AFTER PAYMENT ================= */

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("success") === "true") {
      fetch("/api/messages/balance")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setBalance(data);
        });

      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  /* ================= LOGIC ================= */

  const filteredGuests =
    query === ""
      ? guests
      : guests.filter((g) =>
          `${g.name} ${g.phone}`.toLowerCase().includes(query.toLowerCase())
        );

  const hasSmsBalance =
    balance !== null && balance.remainingMessages > 0;

  const guestsToSend = useMemo(() => {
    return guests.filter((g) => {
      if (filter === "pending") return g.rsvp === "pending";
      if (filter === "withTable") return !!g.tableName;
      return true;
    });
  }, [guests, filter]);

  const disableSend =
    guestsToSend.length === 0 ||
    (channel === "sms" &&
      (!balance || balance.remainingMessages < guestsToSend.length));

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
    if (!invitation || !hasSmsBalance) return;

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
      alert("❌ שליחת SMS נכשלה");
      return;
    }

    const balanceRes = await fetch("/api/messages/balance");
    const balanceData = await balanceRes.json();
    if (balanceData.success) setBalance(balanceData);

    alert(`✅ נשלחו ${data.sent} הודעות`);
  };

  const handleSend = () => {
    if (channel === "whatsapp") {
      if (!selectedGuest) return alert("בחר/י מוזמן לשליחה");
      sendWhatsApp(selectedGuest);
    } else {
      sendSMS();
    }
  };

  /* ================= RENDER ================= */

  if (loading) return null;
  if (!invitation) return <div>לא נמצאה הזמנה</div>;

  const remaining = balance?.remainingMessages ?? 0;
  const max = balance?.maxMessages ?? 0;
  const progress = max > 0 ? (remaining / max) * 100 : 0;

  return (
    <div className="p-10 flex flex-col items-center" dir="rtl">
      <h1 className="text-3xl font-semibold mb-8 text-[#4a413a] text-center">
        שליחת הודעות לאורחים 💌
      </h1>

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

      {/* COMBOBOX לוואטסאפ */}
      {channel === "whatsapp" && (
        <div className="w-[90%] md:w-[600px] mb-6">
          <label className="block mb-2 font-semibold text-[#4a413a]">
            בחר/י מוזמן לשליחה:
          </label>
          <Combobox value={selectedGuest} onChange={setSelectedGuest}>
            <div className="relative">
              <Combobox.Input
                className="w-full border rounded-xl p-3"
                placeholder="הקלד/י שם או טלפון..."
                displayValue={(guest: Guest) =>
                  guest ? `${guest.name} (${guest.phone})` : ""
                }
                onChange={(e) => setQuery(e.target.value)}
              />
              <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border bg-white shadow-md">
                {filteredGuests.length === 0 && (
                  <div className="p-3 text-gray-500">לא נמצאו תוצאות</div>
                )}
                {filteredGuests.map((guest) => (
                  <Combobox.Option
                    key={guest._id}
                    value={guest}
                    className="cursor-pointer p-3 hover:bg-[#f2ece5]"
                  >
                    {guest.name} ({guest.phone})
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </div>
          </Combobox>
        </div>
      )}

      {/* FILTER (רק ב־SMS) */}
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

      {/* TEMPLATE */}
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

      {/* MESSAGE */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        className="w-[90%] md:w-[600px] border rounded-xl p-4 mb-6"
      />

      {/* SEND */}
      <button
        onClick={handleSend}
        disabled={channel === "whatsapp" ? !selectedGuest : disableSend}
        className="w-[90%] md:w-[600px] bg-green-600 text-white py-4 rounded-xl text-lg font-semibold disabled:opacity-50"
      >
        {channel === "whatsapp"
          ? "💬 שלח ב־WhatsApp"
          : `📩 שליחה (${guestsToSend.length})`}
      </button>
    </div>
  );
}
