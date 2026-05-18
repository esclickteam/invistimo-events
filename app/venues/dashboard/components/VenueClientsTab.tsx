"use client";

import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Mail,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

type ClientStatus =
  | "new_lead"
  | "contacted"
  | "meeting_scheduled"
  | "quote_sent"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

type DemoClient = {
  id: string;
  name: string;
  phone: string;
  email: string;
  eventType: string;
  requestedDate: string;
  guests: number;
  budget: string;
  source: string;
  status: ClientStatus;
  nextStep: string;
};

const statusLabels: Record<ClientStatus, string> = {
  new_lead: "ליד חדש",
  contacted: "נוצר קשר",
  meeting_scheduled: "נקבעה פגישה",
  quote_sent: "נשלחה הצעה",
  negotiation: "במו״מ",
  closed_won: "נסגר",
  closed_lost: "לא נסגר",
};

const clients: DemoClient[] = [
  {
    id: "1",
    name: "לירון ואיתי",
    phone: "050-1234567",
    email: "liron@example.com",
    eventType: "חתונה",
    requestedDate: "23.05.2026",
    guests: 320,
    budget: "₪110,000",
    source: "אתר",
    status: "closed_won",
    nextStep: "סגירת תפריט",
  },
  {
    id: "2",
    name: "משפחת כהן",
    phone: "052-7778888",
    email: "cohen@example.com",
    eventType: "בר מצווה",
    requestedDate: "26.05.2026",
    guests: 180,
    budget: "₪58,000",
    source: "המלצה",
    status: "meeting_scheduled",
    nextStep: "פגישת מכירה",
  },
  {
    id: "3",
    name: "חברת אלפא",
    phone: "03-9000000",
    email: "office@alpha.com",
    eventType: "אירוע חברה",
    requestedDate: "29.05.2026",
    guests: 450,
    budget: "₪160,000",
    source: "גוגל",
    status: "quote_sent",
    nextStep: "מעקב הצעת מחיר",
  },
  {
    id: "4",
    name: "דנה ורועי",
    phone: "054-2223333",
    email: "dana@example.com",
    eventType: "חתונה",
    requestedDate: "14.06.2026",
    guests: 280,
    budget: "₪95,000",
    source: "אינסטגרם",
    status: "negotiation",
    nextStep: "שיחת סגירה",
  },
];

export default function VenueClientsTab() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("all");

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesStatus = status === "all" || client.status === status;

      const matchesQuery = [
        client.name,
        client.phone,
        client.email,
        client.eventType,
        client.source,
        client.nextStep,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());

      return matchesStatus && matchesQuery;
    });
  }, [query, status]);

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-black text-[#a5824f]">לקוחות CRM</p>

            <h2 className="mt-2 text-2xl font-black text-[#2f261d]">
              ניהול לידים ולקוחות
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-[#7b6a58]">
              כל לקוח מקבל כרטיס CRM מלא: פרטי קשר, סוג אירוע, כמות אורחים,
              תקציב, מקור הגעה, סטטוס מכירה והצעד הבא.
            </p>
          </div>

          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2f261d] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#493a2d]"
          >
            <Plus size={18} />
            הוספת לקוח
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative rounded-[2rem] border border-[#eadfce] bg-white p-4 shadow-sm">
          <Search
            size={18}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-[#9b8974]"
          />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון, סוג אירוע, מקור או פעולה הבאה..."
            className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffaf4] pr-11 text-sm font-bold text-[#2f261d] outline-none transition placeholder:text-[#a99a89] focus:border-[#d6b46d]"
          />
        </div>

        <div className="flex items-center gap-2 rounded-[2rem] border border-[#eadfce] bg-white p-4 shadow-sm">
          <SlidersHorizontal size={18} className="text-[#a5824f]" />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientStatus | "all")}
            className="h-12 rounded-2xl border border-[#eadfce] bg-[#fffaf4] px-4 text-sm font-black text-[#2f261d] outline-none"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="new_lead">ליד חדש</option>
            <option value="contacted">נוצר קשר</option>
            <option value="meeting_scheduled">נקבעה פגישה</option>
            <option value="quote_sent">נשלחה הצעה</option>
            <option value="negotiation">במו״מ</option>
            <option value="closed_won">נסגר</option>
            <option value="closed_lost">לא נסגר</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredClients.map((client) => (
          <article
            key={client.id}
            className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr_auto] xl:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f1e6d4] text-[#a5824f]">
                  <UserRound size={24} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-[#2f261d]">
                      {client.name}
                    </h3>

                    <span className="rounded-full bg-[#f7f2ea] px-3 py-1 text-xs font-black text-[#7a5a25]">
                      {statusLabels[client.status]}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-bold text-[#7b6a58]">
                    {client.eventType} · {client.guests} אורחים ·{" "}
                    {client.requestedDate}
                  </p>

                  <p className="mt-1 text-xs font-black text-[#a5824f]">
                    מקור הגעה: {client.source}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ContactLine icon={Phone} text={client.phone} />
                <ContactLine icon={Mail} text={client.email} />
                <ContactLine icon={CalendarDays} text={client.nextStep} />
                <ContactLine icon={SlidersHorizontal} text={client.budget} />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                <button
                  type="button"
                  className="h-11 rounded-2xl bg-[#2f261d] px-5 text-sm font-black text-white transition hover:bg-[#493a2d]"
                >
                  פתיחת כרטיס
                </button>

                <button
                  type="button"
                  className="h-11 rounded-2xl border border-[#eadfce] bg-[#fffaf4] px-5 text-sm font-black text-[#2f261d] transition hover:bg-[#f1e6d4]"
                >
                  פעולה הבאה
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContactLine({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#6d5c49]">
      <Icon size={16} className="text-[#a5824f]" />
      <span className="truncate">{text}</span>
    </div>
  );
}