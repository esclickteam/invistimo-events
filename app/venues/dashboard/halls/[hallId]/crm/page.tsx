"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Edit3,
  Eye,
  FileSignature,
  FileText,
  Filter,
  HeartHandshake,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

type LeadStatus =
  | "new"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "closed"
  | "lost";

type ClientActivityType = "call" | "note" | "meeting" | "proposal" | "contract" | "sms";

type VenueLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  eventType: string;
  requestedDate: string;
  preferredHall: string;
  guests: number;
  budget: number;
  source: string;
  owner: string;
  status: LeadStatus;
  lastActivity: string;
  eventId?: string;
  meetingAt?: string;
  activities: {
    id: string;
    type: ClientActivityType;
    title: string;
    description: string;
    date: string;
  }[];
};

const initialLeads: VenueLead[] = [
  {
    id: "lead-1",
    name: "משפחת לוי",
    phone: "052-1234567",
    email: "levi.family@gmail.com",
    eventType: "חתונה",
    requestedDate: "19.05.26",
    preferredHall: "אולם הזהב",
    guests: 420,
    budget: 145000,
    source: "אתר",
    owner: "יוסי כהן",
    status: "proposal",
    lastActivity: "הצעה נשלחה היום 15:30",
    activities: [
      {
        id: "a1",
        type: "call",
        title: "שיחת פתיחה",
        description: "הלקוח ביקש מחיר ל־420 מוזמנים, אולם הזהב, תאריך 19.05.",
        date: "היום 10:15",
      },
      {
        id: "a2",
        type: "proposal",
        title: "הצעת מחיר נשלחה",
        description: "נשלחה הצעה ראשונית על סך 145,000 ₪.",
        date: "היום 15:30",
      },
    ],
  },
  {
    id: "lead-2",
    name: "דניאל כהן",
    phone: "050-9876543",
    email: "daniel@example.com",
    eventType: "בר מצווה",
    requestedDate: "18.06.26",
    preferredHall: "SKY Hall",
    guests: 180,
    budget: 62000,
    source: "טלפון",
    owner: "שירן לוי",
    status: "meeting",
    lastActivity: "נקבעה פגישה למחר",
    meetingAt: "מחר 11:00",
    activities: [
      {
        id: "a1",
        type: "meeting",
        title: "נקבעה פגישה",
        description: "פגישה באולם להצגת חבילות ותפריט.",
        date: "מחר 11:00",
      },
    ],
  },
  {
    id: "lead-3",
    name: "TechNova",
    phone: "03-7654321",
    email: "events@technova.com",
    eventType: "כנס חברה",
    requestedDate: "02.07.26",
    preferredHall: "גן אירועים",
    guests: 300,
    budget: 120000,
    source: "LinkedIn",
    owner: "רועי כהן",
    status: "negotiation",
    lastActivity: "שיחת מחיר אתמול",
    activities: [
      {
        id: "a1",
        type: "call",
        title: "שיחת מחיר",
        description: "הלקוח ביקש לבדוק אפשרות לתוספת מקרן, במה ובר קפה.",
        date: "אתמול 14:20",
      },
    ],
  },
  {
    id: "lead-4",
    name: "משפחת אברהם",
    phone: "054-5554433",
    email: "avraham.family@gmail.com",
    eventType: "חתונה",
    requestedDate: "15.07.26",
    preferredHall: "אולם הזהב",
    guests: 400,
    budget: 150000,
    source: "וואטסאפ",
    owner: "יוסי כהן",
    status: "closed",
    lastActivity: "נסגר ונכנס ליומן",
    eventId: "evt-1004",
    activities: [
      {
        id: "a1",
        type: "contract",
        title: "חוזה נשלח",
        description: "נשלח חוזה לסגירה וחתימה.",
        date: "12.05.26 16:00",
      },
      {
        id: "a2",
        type: "note",
        title: "אירוע נסגר",
        description: "האירוע נסגר ונוצר ביומן האולם.",
        date: "13.05.26 09:30",
      },
    ],
  },
  {
    id: "lead-5",
    name: "עדי פרץ",
    phone: "050-3332211",
    email: "adi@example.com",
    eventType: "אירוע חברה",
    requestedDate: "10.06.26",
    preferredHall: "גן אירועים",
    guests: 220,
    budget: 78000,
    source: "אורגני",
    owner: "רועי כהן",
    status: "new",
    lastActivity: "ליד חדש",
    activities: [
      {
        id: "a1",
        type: "note",
        title: "ליד חדש",
        description: "התקבלה פנייה דרך האתר. טרם חזרו ללקוח.",
        date: "היום 09:10",
      },
    ],
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

function activityIcon(type: ClientActivityType) {
  if (type === "call") return <Phone size={15} />;
  if (type === "meeting") return <CalendarDays size={15} />;
  if (type === "proposal") return <FileText size={15} />;
  if (type === "contract") return <FileSignature size={15} />;
  if (type === "sms") return <MessageSquareText size={15} />;
  return <Edit3 size={15} />;
}

function buildSms4FreeLink(lead: VenueLead) {
  const message = `שלום ${lead.name}, מצורפת הצעת מחיר עבור ${lead.eventType} בתאריך ${lead.requestedDate} באולם ${lead.preferredHall}. נשמח לעמוד לרשותכם.`;
  return `https://www.sms4free.co.il/?phone=${encodeURIComponent(
    lead.phone
  )}&msg=${encodeURIComponent(message)}`;
}

export default function HallCrmPage() {
  const params = useParams<{ hallId: string }>();
  const router = useRouter();

  const hallId = params?.hallId || "main-gold-hall";
  const hallName = getHallName(hallId);

  const [leads, setLeads] = useState<VenueLead[]>(initialLeads);
  const [selectedLeadId, setSelectedLeadId] = useState("lead-1");
  const [clientFileOpen, setClientFileOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [closeEventOpen, setCloseEventOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) || leads[0];

  const stats = useMemo(() => {
    return {
      newLeads: leads.filter((lead) => lead.status === "new").length,
      meetings: leads.filter((lead) => lead.status === "meeting").length,
      proposals: leads.filter((lead) => lead.status === "proposal").length,
      closed: leads.filter((lead) => lead.status === "closed").length,
      potentialRevenue: leads.reduce((sum, lead) => sum + lead.budget, 0),
    };
  }, [leads]);

  const updateLead = (leadId: string, patch: Partial<VenueLead>) => {
    setLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, ...patch } : lead))
    );
  };

  const addActivity = (
    leadId: string,
    activity: Omit<VenueLead["activities"][number], "id">
  ) => {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              lastActivity: activity.title,
              activities: [
                {
                  ...activity,
                  id: `activity-${Date.now()}`,
                },
                ...lead.activities,
              ],
            }
          : lead
      )
    );
  };

  const scheduleMeeting = () => {
    updateLead(selectedLead.id, {
      status: "meeting",
      meetingAt: "25.05.26 11:00",
      lastActivity: "נקבעה פגישה ליומן",
    });

    addActivity(selectedLead.id, {
      type: "meeting",
      title: "נקבעה פגישה ליומן",
      description:
        "הפגישה תופיע ביומן האולם כשכבת פגישות, ולא כאירוע שתופס את האולם.",
      date: "25.05.26 11:00",
    });

    setMeetingOpen(false);
  };

  const saveNote = () => {
    addActivity(selectedLead.id, {
      type: "note",
      title: "נוספה הערה לתיק לקוח",
      description: "הלקוח ביקש לחזור אליו עם אפשרות להוזלת מחיר לפי כמות מוזמנים.",
      date: "עכשיו",
    });

    setNoteOpen(false);
  };

  const sendProposal = () => {
    updateLead(selectedLead.id, {
      status: "proposal",
      lastActivity: "הצעת מחיר נשלחה",
    });

    addActivity(selectedLead.id, {
      type: "proposal",
      title: "הצעת מחיר נשלחה",
      description: `נשלחה הצעת מחיר בסך ${formatCurrency(selectedLead.budget)}.`,
      date: "עכשיו",
    });

    setProposalOpen(false);
  };

  const sendContract = () => {
    addActivity(selectedLead.id, {
      type: "contract",
      title: "חוזה נשלח ללקוח",
      description: "נשלח חוזה לסגירה וחתימה.",
      date: "עכשיו",
    });

    setContractOpen(false);
  };

  const closeEvent = () => {
    const newEventId = selectedLead.eventId || `evt-${Date.now()}`;

    updateLead(selectedLead.id, {
      status: "closed",
      eventId: newEventId,
      lastActivity: "נסגר אירוע ונוצר ביומן",
    });

    addActivity(selectedLead.id, {
      type: "contract",
      title: "אירוע נסגר ונוצר ביומן",
      description:
        "הלקוח עבר לסטטוס נסגר, ונוצר אירוע מרכזי שמופיע ביומן האולם.",
      date: "עכשיו",
    });

    setCloseEventOpen(false);
  };

  const goToEvent = () => {
    if (!selectedLead.eventId) return;
    router.push(`/venues/dashboard/events/${selectedLead.eventId}`);
  };

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
            onClick={() => setNewLeadOpen(true)}
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
                    תיק לקוח, שיחות, הערות, פגישות, הצעות מחיר, חוזים וסגירת אירוע ליומן.
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

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {["הכל", "ליד חדש", "נקבעה פגישה", "הצעה נשלחה", "במו״מ", "נסגר", "לא נסגר"].map((filter, index) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setFilterOpen(true)}
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

                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252]"
                >
                  <Filter size={16} />
                  סינון מתקדם
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[24px] border border-[#eadfce]">
              <table className="w-full min-w-[1180px] border-collapse text-right">
                <thead className="bg-[#fffdf8]">
                  <tr className="border-b border-[#eadfce] text-xs font-black text-[#8a7b68]">
                    <th className="px-4 py-3">לקוח</th>
                    <th className="px-4 py-3">סוג אירוע</th>
                    <th className="px-4 py-3">תאריך מבוקש</th>
                    <th className="px-4 py-3">אולם מועדף</th>
                    <th className="px-4 py-3">אורחים</th>
                    <th className="px-4 py-3">תקציב</th>
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
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedLeadId(lead.id);
                              setClientFileOpen(true);
                            }}
                            className="flex h-9 items-center gap-1 rounded-2xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#6f6252]"
                          >
                            <Eye size={15} />
                            תיק
                          </button>

                          {lead.eventId ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                router.push(`/venues/dashboard/events/${lead.eventId}`);
                              }}
                              className="flex h-9 items-center gap-1 rounded-2xl bg-[#b98121] px-3 text-xs font-black text-white"
                            >
                              <CalendarDays size={15} />
                              אירוע
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedLeadId(lead.id);
                                setMeetingOpen(true);
                              }}
                              className="flex h-9 items-center gap-1 rounded-2xl border border-[#eadfce] bg-white px-3 text-xs font-black text-[#6f6252]"
                            >
                              <CalendarDays size={15} />
                              פגישה
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedLeadId(lead.id);
                              setNoteOpen(true);
                            }}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#6f6252]"
                          >
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
                  <div className="text-xs font-black text-[#b98121]">תיק לקוח נבחר</div>
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
                <InfoLine label="אימייל" value={selectedLead.email} />
                <InfoLine label="אולם מועדף" value={selectedLead.preferredHall} />
                <InfoLine label="כמות אורחים" value={`${selectedLead.guests}`} />
                <InfoLine label="תקציב" value={formatCurrency(selectedLead.budget)} />
                <InfoLine label="מקור פנייה" value={selectedLead.source} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClientFileOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <UserRound size={16} />
                  תיק לקוח
                </button>

                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <Phone size={16} />
                  שיחה / הערה
                </button>

                <a
                  href={buildSms4FreeLink(selectedLead)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <Send size={16} />
                  SMS4Free
                </a>

                <button
                  type="button"
                  onClick={() => setContractOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                >
                  <FileSignature size={16} />
                  חוזה
                </button>
              </div>

              {selectedLead.eventId ? (
                <button
                  type="button"
                  onClick={goToEvent}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
                >
                  <CalendarDays size={17} />
                  כניסה לאירוע
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCloseEventOpen(true)}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
                >
                  <CheckCircle2 size={17} />
                  סגור אירוע והכנס ליומן
                </button>
              )}

              {!selectedLead.eventId && (
                <button
                  type="button"
                  onClick={() => setMeetingOpen(true)}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
                >
                  <CalendarDays size={17} />
                  קבע פגישה וסנכרן ליומן
                </button>
              )}
            </section>

            <section className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black">פעילות אחרונה</h2>
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="text-sm font-black text-[#b98121]"
                >
                  הוסף
                </button>
              </div>

              <div className="space-y-3">
                {selectedLead.activities.slice(0, 4).map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>

      {clientFileOpen && (
        <Modal title={`תיק לקוח - ${selectedLead.name}`} onClose={() => setClientFileOpen(false)} wide>
          <ClientFile
            lead={selectedLead}
            hallId={hallId}
            onMeeting={() => setMeetingOpen(true)}
            onNote={() => setNoteOpen(true)}
            onProposal={() => setProposalOpen(true)}
            onContract={() => setContractOpen(true)}
            onCloseEvent={() => setCloseEventOpen(true)}
            onOpenEvent={goToEvent}
          />
        </Modal>
      )}

      {newLeadOpen && (
        <Modal title="יצירת ליד חדש" onClose={() => setNewLeadOpen(false)}>
          <div className="grid gap-3">
            <InputLike label="שם לקוח" value="משפחת ישראלי" />
            <InputLike label="טלפון" value="050-0000000" />
            <InputLike label="אימייל" value="client@example.com" />
            <InputLike label="סוג אירוע" value="חתונה" />
            <InputLike label="תאריך מבוקש" value="25.05.26" />
            <button
              type="button"
              onClick={() => setNewLeadOpen(false)}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              שמירת ליד
            </button>
          </div>
        </Modal>
      )}

      {meetingOpen && (
        <Modal title="קביעת פגישה וסנכרון ליומן" onClose={() => setMeetingOpen(false)}>
          <div className="grid gap-3">
            <InfoLine label="לקוח" value={selectedLead.name} />
            <InputLike label="תאריך פגישה" value="25.05.26" />
            <InputLike label="שעה" value="11:00" />
            <InputLike label="סוג פגישה" value="פגישת היכרות / טעימות / הצעת מחיר" />
            <InputLike label="נציג אחראי" value={selectedLead.owner} />

            <div className="rounded-2xl border border-[#eadfce] bg-[#fff8eb] p-3 text-xs font-bold leading-6 text-[#7f705d]">
              הפגישה תופיע ביומן האולם בשכבת “פגישות”, ולא תחסום את האולם כמו אירוע סגור.
            </div>

            <button
              type="button"
              onClick={scheduleMeeting}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              שמור וסנכרן ליומן
            </button>
          </div>
        </Modal>
      )}

      {noteOpen && (
        <Modal title="הוספת שיחה / הערה" onClose={() => setNoteOpen(false)}>
          <div className="grid gap-3">
            <InfoLine label="לקוח" value={selectedLead.name} />
            <InputLike label="סוג פעולה" value="שיחה / הערה / מעקב" />
            <textarea
              defaultValue="הלקוח ביקש לחזור אליו עם הצעת מחיר מעודכנת..."
              className="min-h-[140px] rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />
            <InputLike label="תאריך מעקב" value="מחר 10:00" />
            <button
              type="button"
              onClick={saveNote}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              שמור לתיק לקוח
            </button>
          </div>
        </Modal>
      )}

      {proposalOpen && (
        <Modal title="שליחת הצעת מחיר" onClose={() => setProposalOpen(false)}>
          <div className="grid gap-3">
            <InfoLine label="לקוח" value={selectedLead.name} />
            <InfoLine label="סוג אירוע" value={selectedLead.eventType} />
            <InfoLine label="תקציב משוער" value={formatCurrency(selectedLead.budget)} />
            <InputLike label="מחיר להצעה" value={`${selectedLead.budget}`} />
            <InputLike label="מקדמה נדרשת" value="20000" />

            <a
              href={buildSms4FreeLink(selectedLead)}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
            >
              <Send size={16} />
              פתח SMS4Free לשליחה ללקוח
            </a>

            <button
              type="button"
              onClick={sendProposal}
              className="h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              סמן כהצעה נשלחה
            </button>
          </div>
        </Modal>
      )}

      {contractOpen && (
        <Modal title="שליחת חוזה לסגירה" onClose={() => setContractOpen(false)}>
          <div className="grid gap-3">
            <InfoLine label="לקוח" value={selectedLead.name} />
            <InfoLine label="אולם" value={selectedLead.preferredHall} />
            <InputLike label="סכום התחייבות" value={`${selectedLead.budget}`} />
            <InputLike label="מקדמה" value="20000" />
            <InputLike label="תאריך האירוע" value={selectedLead.requestedDate} />

            <button
              type="button"
              onClick={sendContract}
              className="h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              סמן כחוזה נשלח
            </button>
          </div>
        </Modal>
      )}

      {closeEventOpen && (
        <Modal title="סגירת אירוע והכנסה ליומן" onClose={() => setCloseEventOpen(false)}>
          <div className="space-y-3">
            <InfoLine label="לקוח" value={selectedLead.name} />
            <InfoLine label="אולם" value={selectedLead.preferredHall} />
            <InfoLine label="תאריך" value={selectedLead.requestedDate} />
            <InfoLine label="כמות אורחים" value={`${selectedLead.guests}`} />
            <InfoLine label="מחיר שסוכם" value={formatCurrency(selectedLead.budget)} />
            <InfoLine label="בדיקת זמינות" value="✓ פנוי ביומן" />

            <button
              type="button"
              onClick={closeEvent}
              className="h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              אשר וסגור אירוע
            </button>
          </div>
        </Modal>
      )}

      {filterOpen && (
        <Modal title="סינון CRM" onClose={() => setFilterOpen(false)}>
          <div className="grid gap-3">
            <InputLike label="סטטוס" value="כל הסטטוסים" />
            <InputLike label="מקור" value="כל המקורות" />
            <InputLike label="נציג אחראי" value="כל הנציגים" />
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="mt-2 h-11 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              החל סינון
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function ClientFile({
  lead,
  hallId,
  onMeeting,
  onNote,
  onProposal,
  onContract,
  onCloseEvent,
  onOpenEvent,
}: {
  lead: VenueLead;
  hallId: string;
  onMeeting: () => void;
  onNote: () => void;
  onProposal: () => void;
  onContract: () => void;
  onCloseEvent: () => void;
  onOpenEvent: () => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
      <section className="space-y-5">
        <div className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-black text-[#b98121]">תיק לקוח מלא</div>
              <h2 className="mt-1 text-3xl font-black text-[#2b241c]">{lead.name}</h2>
              <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                {lead.eventType} · {lead.requestedDate} · {lead.preferredHall}
              </p>
            </div>

            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(lead.status)}`}>
              {statusLabel(lead.status)}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <InfoLine label="טלפון" value={lead.phone} />
            <InfoLine label="אימייל" value={lead.email} />
            <InfoLine label="מקור" value={lead.source} />
            <InfoLine label="אורחים" value={`${lead.guests}`} />
            <InfoLine label="תקציב" value={formatCurrency(lead.budget)} />
            <InfoLine label="אחראי" value={lead.owner} />
          </div>
        </div>

        <div className="rounded-[26px] border border-[#eadfce] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-[#2b241c]">היסטוריית קשר ופעילות</h3>
            <button
              type="button"
              onClick={onNote}
              className="rounded-2xl bg-[#f4ead9] px-3 py-2 text-xs font-black text-[#b98121]"
            >
              הוסף הערה
            </button>
          </div>

          <div className="space-y-3">
            {lead.activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-[#eadfce] bg-white p-4">
          <h3 className="text-lg font-black text-[#2b241c]">המשך טיפול</h3>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ActionButton icon={<CalendarDays size={17} />} label="קבע פגישה וסנכרן ליומן" onClick={onMeeting} />
            <ActionButton icon={<FileText size={17} />} label="צור / שלח הצעת מחיר" onClick={onProposal} />
            <ActionButton icon={<FileSignature size={17} />} label="שלח חוזה לסגירה" onClick={onContract} />
            <a
              href={buildSms4FreeLink(lead)}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
            >
              <Send size={17} />
              שליחה דרך SMS4Free
            </a>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-[26px] border border-[#eadfce] bg-white p-4">
          <h3 className="text-lg font-black text-[#2b241c]">פעולה ראשית</h3>

          {lead.eventId ? (
            <button
              type="button"
              onClick={onOpenEvent}
              className="mt-4 h-12 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              כניסה לאירוע
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCloseEvent}
                className="mt-4 h-12 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
              >
                סגור אירוע והכנס ליומן
              </button>

              <button
                type="button"
                onClick={onMeeting}
                className="mt-2 h-12 w-full rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
              >
                קבע פגישה
              </button>
            </>
          )}

          <Link
            href={`/venues/dashboard/halls/${hallId}/calendar`}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
          >
            מעבר ליומן האולם
          </Link>
        </div>

        <div className="rounded-[26px] border border-[#eadfce] bg-white p-4">
          <h3 className="text-lg font-black text-[#2b241c]">סטטוס מכירה</h3>

          <div className="mt-4 space-y-3">
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
        </div>
      </aside>
    </div>
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

function ActivityRow({
  activity,
}: {
  activity: VenueLead["activities"][number];
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#b98121]">
        {activityIcon(activity.type)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-black text-[#2b241c]">{activity.title}</div>
          <div className="shrink-0 text-xs font-black text-[#b98121]">{activity.date}</div>
        </div>

        <div className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
          {activity.description}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
    >
      {icon}
      {label}
    </button>
  );
}

function InputLike({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">{label}</span>
      <input
        defaultValue={value}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
      />
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
      <div
        className={[
          "max-h-[92vh] w-full overflow-y-auto rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-2xl",
          wide ? "max-w-6xl" : "max-w-xl",
        ].join(" ")}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-[#2b241c]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-[#6f6252]"
          >
            <X size={18} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
