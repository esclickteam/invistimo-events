"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Filter,
  HeartHandshake,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  UsersRound,
} from "lucide-react";

export const dynamic = "force-dynamic";

type LeadStatus =
  | "new"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "closed"
  | "lost";

type VenueLead = {
  id: string;
  name: string;
  phone: string;
  eventType: string;
  requestedDate: string;
  preferredHall: string;
  guests: number;
  budget: number;
  source: string;
  owner: string;
  status: LeadStatus;
  lastActivity: string;
};

const leads: VenueLead[] = [
  {
    id: "lead-1",
    name: "משפחת לוי",
    phone: "052-1234567",
    eventType: "חתונה",
    requestedDate: "19.05.26",
    preferredHall: "אולם הזהב",
    guests: 420,
    budget: 145000,
    source: "אתר",
    owner: "יוסי כהן",
    status: "proposal",
    lastActivity: "הצעה נשלחה היום 15:30",
  },
  {
    id: "lead-2",
    name: "דניאל כהן",
    phone: "050-9876543",
    eventType: "בר מצווה",
    requestedDate: "18.06.26",
    preferredHall: "SKY Hall",
    guests: 180,
    budget: 62000,
    source: "טלפון",
    owner: "שירן לוי",
    status: "meeting",
    lastActivity: "נקבעה פגישה למחר",
  },
  {
    id: "lead-3",
    name: "TechNova",
    phone: "03-7654321",
    eventType: "כנס חברה",
    requestedDate: "02.07.26",
    preferredHall: "גן אירועים",
    guests: 300,
    budget: 120000,
    source: "LinkedIn",
    owner: "רועי כהן",
    status: "negotiation",
    lastActivity: "שיחת מחיר אתמול",
  },
  {
    id: "lead-4",
    name: "משפחת אברהם",
    phone: "054-5554433",
    eventType: "חתונה",
    requestedDate: "15.07.26",
    preferredHall: "אולם הזהב",
    guests: 400,
    budget: 150000,
    source: "וואטסאפ",
    owner: "יוסי כהן",
    status: "closed",
    lastActivity: "נסגר ונכנס ליומן",
  },
  {
    id: "lead-5",
    name: "עדי פרץ",
    phone: "050-3332211",
    eventType: "אירוע חברה",
    requestedDate: "10.06.26",
    preferredHall: "גן אירועים",
    guests: 220,
    budget: 78000,
    source: "אורגני",
    owner: "רועי כהן",
    status: "new",
    lastActivity: "ליד חדש",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function getHallName(hallId: string) {
  if (hallId === "garden-hall") return "גן אירועים";
  if (hallId === "sky-hall") return "SKY Hall";
  return "אולם הזהב";
}

function statusLabel(status: LeadStatus) {
  if (status === "new") return "ליד חדש";
  if (status === "contacted") return "נוצר קשר";
  if (status === "meeting") return "נקבעה פגישה";
  if (status === "proposal") return "הצעה נשלחה";
  if (status === "negotiation") return "במו״מ";
  if (status === "closed") return "נסגר";
  return "לא נסגר";
}

function statusClass(status: LeadStatus) {
  if (status === "closed") return "bg-emerald-50 text-emerald-700";
  if (status === "proposal") return "bg-violet-50 text-violet-700";
  if (status === "meeting") return "bg-sky-50 text-sky-700";
  if (status === "negotiation") return "bg-amber-50 text-amber-700";
  if (status === "lost") return "bg-rose-50 text-rose-700";
  return "bg-[#f4ead9] text-[#b98121]";
}

export default function HallCrmPage() {
  const params = useParams<{ hallId: string }>();
  const hallId = params?.hallId || "main-gold-hall";
  const hallName = getHallName(hallId);
  const [selectedLeadId, setSelectedLeadId] = useState("lead-1");

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) || leads[0];

  const stats = useMemo(() => {
    return {
      newLeads: leads.filter((lead) => lead.status === "new").length,
      meetings: leads.filter((lead) => lead.status === "meeting").length,
      proposals: leads.filter((lead) => lead.status === "proposal").length,
      closed: leads.filter((lead) => lead.status === "closed").length,
      potentialRevenue: leads.reduce((sum, lead) => sum + lead.budget, 0),
    };
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1800px] px-4 py-5 md:px-7">
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/venues/dashboard/halls/${hallId}/calendar`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              <ArrowRight size={17} />
              חזרה ליומן אולם
            </Link>

            <Link
              href={`/venues/dashboard/halls/${hallId}`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              ניהול אולם
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
          >
            <Plus size={17} />
            ליד חדש
          </button>
        </div>

        <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#f4ead9] text-[#b98121]">
                  <UsersRound size={28} />
                </div>

                <div>
                  <h1 className="text-3xl font-black md:text-4xl">
                    CRM ניהול לקוחות - {hallName}
                  </h1>
                  <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                    לידים, פגישות, הצעות מחיר, סטטוס מכירה וסגירת אירוע ליומן.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="לידים חדשים" value={String(stats.newLeads)} icon={<HeartHandshake size={19} />} />
              <Metric label="פגישות" value={String(stats.meetings)} icon={<CalendarDays size={19} />} />
              <Metric label="הצעות פתוחות" value={String(stats.proposals)} icon={<FileText size={19} />} />
              <Metric label="נסגרו" value={String(stats.closed)} icon={<CheckCircle2 size={19} />} />
              <Metric label="פוטנציאל" value={formatCurrency(stats.potentialRevenue)} icon={<CircleDollarSign size={19} />} />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  "הכל",
                  "ליד חדש",
                  "נקבעה פגישה",
                  "הצעה נשלחה",
                  "במו״מ",
                  "נסגר",
                  "לא נסגר",
                ].map((filter, index) => (
                  <button
                    key={filter}
                    type="button"
                    className={[
                      "h-10 rounded-2xl px-4 text-sm font-black transition",
                      index === 0
                        ? "bg-[#b98121] text-white"
                        : "border border-[#eadfce] bg-white text-[#6f6252] hover:bg-[#fbf5ea]",
                    ].join(" ")}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-10 w-[280px] items-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3">
                  <Search size={16} className="text-[#a2937f]" />
                  <input
                    placeholder="חיפוש לפי שם, טלפון או אירוע..."
                    className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#b7a895]"
                  />
                </div>

                <button type="button" className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252]">
                  <Filter size={16} />
                  סינון מתקדם
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[24px] border border-[#eadfce]">
              <table className="w-full min-w-[1100px] border-collapse text-right">
                <thead className="bg-[#fffdf8]">
                  <tr className="border-b border-[#eadfce] text-xs font-black text-[#8a7b68]">
                    <th className="px-4 py-3">לקוח</th>
                    <th className="px-4 py-3">סוג אירוע</th>
                    <th className="px-4 py-3">תאריך מבוקש</th>
                    <th className="px-4 py-3">אולם מועדף</th>
                    <th className="px-4 py-3">אורחים</th>
                    <th className="px-4 py-3">תקציב משוער</th>
                    <th className="px-4 py-3">מקור</th>
                    <th className="px-4 py-3">סטטוס</th>
                    <th className="px-4 py-3">אחראי</th>
                    <th className="px-4 py-3">פעולות</th>
                  </tr>
                </thead>

                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={[
                        "cursor-pointer border-b border-[#eadfce] text-sm transition last:border-b-0 hover:bg-[#fff8ec]",
                        selectedLeadId === lead.id ? "bg-[#fff7e6]" : "bg-white",
                      ].join(" ")}
                    >
                      <td className="px-4 py-4">
                        <div className="font-black text-[#2b241c]">{lead.name}</div>
                        <div className="mt-1 text-xs font-bold text-[#8a7b68]">{lead.phone}</div>
                      </td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.eventType}</td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.requestedDate}</td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.preferredHall}</td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.guests}</td>
                      <td className="px-4 py-4 font-black text-[#2b241c]">{formatCurrency(lead.budget)}</td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.source}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(lead.status)}`}>
                          {statusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.owner}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#6f6252]">
                            <Eye size={15} />
                          </button>
                          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#6f6252]">
                            <Phone size={15} />
                          </button>
                          <button type="button" className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#6f6252]">
                            <MoreHorizontal size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-[#b98121]">פרטי לקוח</div>
                  <h2 className="mt-1 text-2xl font-black text-[#2b241c]">{selectedLead.name}</h2>
                  <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                    {selectedLead.eventType} · {selectedLead.requestedDate}
                  </p>
                </div>

                <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(selectedLead.status)}`}>
                  {statusLabel(selectedLead.status)}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <InfoLine label="טלפון" value={selectedLead.phone} />
                <InfoLine label="אולם מועדף" value={selectedLead.preferredHall} />
                <InfoLine label="כמות אורחים" value={`${selectedLead.guests}`} />
                <InfoLine label="תקציב" value={formatCurrency(selectedLead.budget)} />
                <InfoLine label="מקור פנייה" value={selectedLead.source} />
                <InfoLine label="אחראי" value={selectedLead.owner} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  <Phone size={16} />
                  שיחה
                </button>
                <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  <Mail size={16} />
                  מייל
                </button>
                <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  <FileText size={16} />
                  הצעה
                </button>
                <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  <Edit3 size={16} />
                  עריכה
                </button>
              </div>

              <button
                type="button"
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
              >
                <CheckCircle2 size={17} />
                סגור אירוע והכנס ליומן
              </button>
            </section>

            <section className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 size={18} className="text-[#b98121]" />
                <h2 className="text-lg font-black">סטטוס מכירה</h2>
              </div>

              <div className="space-y-4">
                {["ליד חדש", "נוצר קשר", "נקבעה פגישה", "הצעה נשלחה", "במו״מ", "נסגר"].map((step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className={[
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
                        index <= 3 ? "bg-[#b98121] text-white" : "bg-[#f4ead9] text-[#b98121]",
                      ].join(" ")}
                    >
                      {index + 1}
                    </div>
                    <div className="text-sm font-black text-[#2b241c]">{step}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black">תזכורות ומשימות</h2>
                <button type="button" className="text-sm font-black text-[#b98121]">הוסף</button>
              </div>

              <div className="space-y-3">
                <TaskLine title="לחזור למשפחת לוי" subtitle="היום 17:00 · הצעת מחיר" />
                <TaskLine title="לתאם פגישת טעימות" subtitle="מחר 11:00 · משפחת כהן" />
                <TaskLine title="לשלוח חוזה" subtitle="23.05 · TechNova" />
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="min-w-[150px] rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex items-center gap-2 text-[#b98121]">
        {icon}
        <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      </div>
      <div className="mt-2 text-lg font-black text-[#2b241c]">{value}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#fffdf8] px-3 py-2">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <span className="text-sm font-black text-[#2b241c]">{value}</span>
    </div>
  );
}

function TaskLine({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <input className="mt-1 h-4 w-4 rounded border-[#d8c7aa] text-[#b98121]" type="checkbox" />
      <div>
        <div className="text-sm font-black text-[#2b241c]">{title}</div>
        <div className="mt-1 text-xs font-bold text-[#8a7b68]">{subtitle}</div>
      </div>
    </label>
  );
}
