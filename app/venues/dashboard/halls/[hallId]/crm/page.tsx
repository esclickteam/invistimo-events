"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Eye,
  FileSignature,
  FileText,
  Filter,
  HeartHandshake,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
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

type ClientActivityType =
  | "call"
  | "note"
  | "meeting"
  | "proposal"
  | "contract"
  | "sms";

type VenueLeadActivity = {
  id: string;
  type: ClientActivityType;
  title: string;
  description: string;
  date: string;
};

type VenueLead = {
  id: string;
  _id?: string;

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

  proposalFileName?: string;
  contractFileName?: string;
  proposalSignature?: string;
  contractSignature?: string;

  activities: VenueLeadActivity[];
};

type HallData = {
  id: string;
  name: string;
  subtitle?: string;
  capacity?: number;
  status?: string;
};

type NewLeadForm = {
  name: string;
  phone: string;
  email: string;
  eventType: string;
  requestedDate: string;
  preferredHall: string;
  guests: string;
  budget: string;
  source: string;
  owner: string;
};

type MeetingForm = {
  date: string;
  time: string;
  type: string;
  owner: string;
};

type NoteForm = {
  type: ClientActivityType;
  title: string;
  description: string;
  followUpAt: string;
};

type CloseEventForm = {
  date: string;
  startTime: string;
  endTime: string;
  paidAmount: string;
  notes: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toNumber(value: string | number, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function encodeHallPath(hallId: string) {
  return encodeURIComponent(hallId);
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimeValue() {
  return new Date().toTimeString().slice(0, 5);
}

function normalizeLead(lead: any): VenueLead {
  return {
    id: String(lead.id || lead._id || ""),
    _id: lead._id ? String(lead._id) : undefined,

    name: String(lead.name || ""),
    phone: String(lead.phone || ""),
    email: String(lead.email || ""),

    eventType: String(lead.eventType || ""),
    requestedDate: String(lead.requestedDate || ""),
    preferredHall: String(lead.preferredHall || ""),

    guests: Number(lead.guests || 0),
    budget: Number(lead.budget || 0),

    source: String(lead.source || ""),
    owner: String(lead.owner || ""),

    status: (lead.status || "new") as LeadStatus,
    lastActivity: String(lead.lastActivity || ""),

    eventId: lead.eventId ? String(lead.eventId) : "",
    meetingAt: lead.meetingAt ? String(lead.meetingAt) : "",

    proposalFileName: String(lead.proposalFileName || ""),
    contractFileName: String(lead.contractFileName || ""),
    proposalSignature: String(lead.proposalSignature || ""),
    contractSignature: String(lead.contractSignature || ""),

    activities: safeArray<VenueLeadActivity>(lead.activities),
  };
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

  const rawHallId = params?.hallId || "";
  const hallId = rawHallId ? decodeURIComponent(rawHallId) : "";
  const encodedHallId = encodeHallPath(hallId);

  const [hall, setHall] = useState<HallData | null>(null);
  const [leads, setLeads] = useState<VenueLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");

  const [clientFileOpen, setClientFileOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [closeEventOpen, setCloseEventOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [newLeadForm, setNewLeadForm] = useState<NewLeadForm>({
    name: "",
    phone: "",
    email: "",
    eventType: "",
    requestedDate: "",
    preferredHall: "",
    guests: "",
    budget: "",
    source: "ידני",
    owner: "",
  });

  const [meetingForm, setMeetingForm] = useState<MeetingForm>({
    date: todayDateValue(),
    time: "11:00",
    type: "פגישת היכרות / טעימות / הצעת מחיר",
    owner: "",
  });

  const [noteForm, setNoteForm] = useState<NoteForm>({
    type: "note",
    title: "נוספה הערה לתיק לקוח",
    description: "",
    followUpAt: "",
  });

  const [closeEventForm, setCloseEventForm] = useState<CloseEventForm>({
    date: todayDateValue(),
    startTime: "19:30",
    endTime: "00:30",
    paidAmount: "",
    notes: "",
  });

  const [proposalFileName, setProposalFileName] = useState("");
  const [contractFileName, setContractFileName] = useState("");
  const [proposalSignature, setProposalSignature] = useState("");
  const [contractSignature, setContractSignature] = useState("");

  const selectedLead =
    leads.find((lead) => lead.id === selectedLeadId) || leads[0] || null;

  const stats = useMemo(() => {
    return {
      newLeads: leads.filter((lead) => lead.status === "new").length,
      meetings: leads.filter((lead) => lead.status === "meeting").length,
      proposals: leads.filter((lead) => lead.status === "proposal").length,
      closed: leads.filter((lead) => lead.status === "closed").length,
      potentialRevenue: leads.reduce((sum, lead) => sum + lead.budget, 0),
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      const q = search.trim().toLowerCase();

      if (!q) return true;

      return [
        lead.name,
        lead.phone,
        lead.email,
        lead.eventType,
        lead.preferredHall,
        lead.source,
        lead.owner,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [leads, search, statusFilter]);

  const fetchCrm = async () => {
    if (!hallId) return;

    setLoading(true);
    setServerError("");

    try {
      const query = new URLSearchParams();

      if (statusFilter !== "all") {
        query.set("status", statusFilter);
      }

      if (search.trim()) {
        query.set("search", search.trim());
      }

      const res = await fetch(
        `/api/venues/dashboard/halls/${encodedHallId}/crm?${query.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינת CRM נכשלה");
      }

      const nextLeads = Array.isArray(data.leads)
        ? data.leads.map(normalizeLead)
        : [];

      setHall(data.hall || null);
      setLeads(nextLeads);

      setSelectedLeadId((current) => {
        if (nextLeads.some((lead: VenueLead) => lead.id === current)) {
          return current;
        }

        return nextLeads[0]?.id || "";
      });
    } catch (error) {
      console.error("GET CRM failed:", error);
      setServerError(error instanceof Error ? error.message : "טעינת CRM נכשלה");
      setHall(null);
      setLeads([]);
      setSelectedLeadId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallId]);

  const updateLeadInState = (lead: VenueLead) => {
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? lead : item))
    );
    setSelectedLeadId(lead.id);
  };

  const createLead = async () => {
    if (!newLeadForm.name.trim()) {
      alert("חובה להזין שם לקוח");
      return;
    }

    setSaving(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/halls/${encodedHallId}/crm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: newLeadForm.name,
          phone: newLeadForm.phone,
          email: newLeadForm.email,
          eventType: newLeadForm.eventType,
          requestedDate: newLeadForm.requestedDate,
          preferredHall: newLeadForm.preferredHall || hall?.name || "",
          guests: toNumber(newLeadForm.guests, 0),
          budget: toNumber(newLeadForm.budget, 0),
          source: newLeadForm.source || "ידני",
          owner: newLeadForm.owner,
          status: "new",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "יצירת ליד נכשלה");
      }

      const lead = normalizeLead(data.lead);

      setLeads((current) => [lead, ...current]);
      setSelectedLeadId(lead.id);
      setNewLeadOpen(false);

      setNewLeadForm({
        name: "",
        phone: "",
        email: "",
        eventType: "",
        requestedDate: "",
        preferredHall: "",
        guests: "",
        budget: "",
        source: "ידני",
        owner: "",
      });
    } catch (error) {
      console.error("POST CRM failed:", error);
      setServerError(
        error instanceof Error ? error.message : "יצירת ליד נכשלה"
      );
    } finally {
      setSaving(false);
    }
  };

  const saveLeadPatch = async (
    leadId: string,
    payload: Record<string, unknown>
  ) => {
    setSaving(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/halls/${encodedHallId}/crm`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          leadId,
          ...payload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "שמירת ליד נכשלה");
      }

      if (data.lead) {
        updateLeadInState(normalizeLead(data.lead));
      }

      return data;
    } catch (error) {
      console.error("PUT CRM failed:", error);
      setServerError(
        error instanceof Error ? error.message : "שמירת ליד נכשלה"
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const addActivity = async (
    lead: VenueLead,
    activity: {
      type: ClientActivityType;
      title: string;
      description: string;
      date?: string;
      status?: LeadStatus;
      meetingAt?: string;
    }
  ) => {
    return saveLeadPatch(lead.id, {
      action: "activity",
      type: activity.type,
      title: activity.title,
      description: activity.description,
      date: activity.date,
      status: activity.status,
      meetingAt: activity.meetingAt,
    });
  };

  const scheduleMeeting = async () => {
    if (!selectedLead) return;

    const meetingAt = `${meetingForm.date} ${meetingForm.time}`;

    const data = await addActivity(selectedLead, {
      type: "meeting",
      title: "נקבעה פגישה ליומן",
      description: meetingForm.type,
      date: meetingAt,
      status: "meeting",
      meetingAt,
    });

    if (data?.success) {
      setMeetingOpen(false);
    }
  };

  const saveNote = async () => {
    if (!selectedLead) return;

    const data = await addActivity(selectedLead, {
      type: noteForm.type,
      title: noteForm.title || "נוספה הערה לתיק לקוח",
      description: noteForm.description,
      date: noteForm.followUpAt || undefined,
    });

    if (data?.success) {
      setNoteOpen(false);
      setNoteForm({
        type: "note",
        title: "נוספה הערה לתיק לקוח",
        description: "",
        followUpAt: "",
      });
    }
  };

  const sendProposal = async () => {
    if (!selectedLead) return;

    await saveLeadPatch(selectedLead.id, {
      proposalFileName,
      proposalSignature,
    });

    const data = await addActivity(selectedLead, {
      type: "proposal",
      title: "הצעת מחיר נשלחה",
      description: `נשלחה הצעת מחיר בסך ${formatCurrency(selectedLead.budget)}.`,
      date: "עכשיו",
      status: "proposal",
    });

    if (data?.success) {
      setProposalOpen(false);
    }
  };

  const sendContract = async () => {
    if (!selectedLead) return;

    await saveLeadPatch(selectedLead.id, {
      contractFileName,
      contractSignature,
    });

    const data = await addActivity(selectedLead, {
      type: "contract",
      title: "חוזה נשלח ללקוח",
      description: "נשלח חוזה לסגירה וחתימה.",
      date: "עכשיו",
    });

    if (data?.success) {
      setContractOpen(false);
    }
  };

  const closeEvent = async () => {
    if (!selectedLead) return;

    const data = await saveLeadPatch(selectedLead.id, {
      action: "closeEvent",
      date: closeEventForm.date || selectedLead.requestedDate,
      startTime: closeEventForm.startTime,
      endTime: closeEventForm.endTime,
      paidAmount: toNumber(closeEventForm.paidAmount, 0),
      notes: closeEventForm.notes,
    });

    if (data?.success) {
      setCloseEventOpen(false);
    }
  };

  const deleteLead = async (lead: VenueLead) => {
    const ok = window.confirm(`למחוק את הליד של ${lead.name}?`);
    if (!ok) return;

    setSaving(true);
    setServerError("");

    try {
      const res = await fetch(
        `/api/venues/dashboard/halls/${encodedHallId}/crm?leadId=${encodeURIComponent(
          lead.id
        )}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "מחיקת ליד נכשלה");
      }

      const nextLeads = leads.filter((item) => item.id !== lead.id);
      setLeads(nextLeads);

      if (selectedLeadId === lead.id) {
        setSelectedLeadId(nextLeads[0]?.id || "");
      }
    } catch (error) {
      console.error("DELETE CRM failed:", error);
      setServerError(
        error instanceof Error ? error.message : "מחיקת ליד נכשלה"
      );
    } finally {
      setSaving(false);
    }
  };

  const goToEvent = () => {
    if (!selectedLead?.eventId) return;
    router.push(`/venues/dashboard/events/${encodeURIComponent(selectedLead.eventId)}`);
  };

  const selectedLeadForUi = selectedLead;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1800px] px-4 py-5 md:px-7">
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/venues/dashboard/halls/${encodedHallId}/calendar`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              <ArrowRight size={17} />
              חזרה ליומן אולם
            </Link>

            <Link
              href={`/venues/dashboard/halls/${encodedHallId}`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              ניהול אולם
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchCrm}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-5 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
              רענון
            </button>

            <button
              type="button"
              onClick={() => setNewLeadOpen(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
            >
              <Plus size={17} />
              ליד חדש
            </button>
          </div>
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
                    CRM ניהול לקוחות - {hall?.name || "אולם"}
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

          {serverError ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {serverError}
            </div>
          ) : null}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "הכל", value: "all" as const },
                  { label: "ליד חדש", value: "new" as const },
                  { label: "נוצר קשר", value: "contacted" as const },
                  { label: "נקבעה פגישה", value: "meeting" as const },
                  { label: "הצעה נשלחה", value: "proposal" as const },
                  { label: "במו״מ", value: "negotiation" as const },
                  { label: "נסגר", value: "closed" as const },
                  { label: "לא נסגר", value: "lost" as const },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={[
                      "h-10 rounded-2xl px-4 text-sm font-black transition",
                      statusFilter === filter.value
                        ? "bg-[#b98121] text-white"
                        : "border border-[#eadfce] bg-white text-[#6f6252] hover:bg-[#fbf5ea]",
                    ].join(" ")}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-10 w-[280px] items-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3">
                  <Search size={16} className="text-[#a2937f]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
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
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm font-black text-[#8a7b68]">
                        <Loader2 className="mx-auto mb-3 animate-spin text-[#b98121]" size={28} />
                        טוען לידים מהשרת...
                      </td>
                    </tr>
                  ) : filteredLeads.length ? (
                    filteredLeads.map((lead) => (
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
                          <div className="mt-1 text-xs font-bold text-[#8a7b68]">{lead.phone || "אין טלפון"}</div>
                        </td>
                        <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.eventType || "-"}</td>
                        <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.requestedDate || "-"}</td>
                        <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.preferredHall || hall?.name || "-"}</td>
                        <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.guests}</td>
                        <td className="px-4 py-4 font-black text-[#2b241c]">{formatCurrency(lead.budget)}</td>
                        <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.source || "-"}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(lead.status)}`}>
                            {statusLabel(lead.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold text-[#6f6252]">{lead.owner || "-"}</td>
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
                                  router.push(`/venues/dashboard/events/${encodeURIComponent(lead.eventId || "")}`);
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

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteLead(lead);
                              }}
                              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-700"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center">
                        <div className="mx-auto max-w-md rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fffdf8] p-6">
                          <UsersRound className="mx-auto text-[#b98121]" size={32} />
                          <div className="mt-3 text-lg font-black text-[#2b241c]">
                            אין עדיין לידים לאולם הזה
                          </div>
                          <p className="mt-2 text-sm font-bold leading-6 text-[#8a7b68]">
                            לחצי על “ליד חדש” כדי להוסיף לקוח ראשון ל־CRM.
                          </p>
                          <button
                            type="button"
                            onClick={() => setNewLeadOpen(true)}
                            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white"
                          >
                            <Plus size={16} />
                            ליד חדש
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-5">
            {selectedLeadForUi ? (
              <>
                <section className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black text-[#b98121]">תיק לקוח נבחר</div>
                      <h2 className="mt-1 text-2xl font-black text-[#2b241c]">
                        {selectedLeadForUi.name}
                      </h2>
                      <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                        {selectedLeadForUi.eventType || "ללא סוג אירוע"} ·{" "}
                        {selectedLeadForUi.requestedDate || "ללא תאריך"}
                      </p>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(selectedLeadForUi.status)}`}>
                      {statusLabel(selectedLeadForUi.status)}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <InfoLine label="טלפון" value={selectedLeadForUi.phone || "-"} />
                    <InfoLine label="אימייל" value={selectedLeadForUi.email || "-"} />
                    <InfoLine label="אולם מועדף" value={selectedLeadForUi.preferredHall || hall?.name || "-"} />
                    <InfoLine label="כמות אורחים" value={`${selectedLeadForUi.guests}`} />
                    <InfoLine label="תקציב" value={formatCurrency(selectedLeadForUi.budget)} />
                    <InfoLine label="מקור פנייה" value={selectedLeadForUi.source || "-"} />
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
                      href={buildSms4FreeLink(selectedLeadForUi)}
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

                  {selectedLeadForUi.eventId ? (
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

                  {!selectedLeadForUi.eventId && (
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
                    {selectedLeadForUi.activities.length ? (
                      selectedLeadForUi.activities
                        .slice(0, 4)
                        .map((activity) => (
                          <ActivityRow key={activity.id} activity={activity} />
                        ))
                    ) : (
                      <EmptySmall text="אין פעילות עדיין בתיק הלקוח." />
                    )}
                  </div>
                </section>
              </>
            ) : (
              <section className="rounded-[30px] border border-dashed border-[#d9bd83] bg-white p-5 text-center shadow-sm">
                <UsersRound className="mx-auto text-[#b98121]" size={30} />
                <div className="mt-3 text-lg font-black text-[#2b241c]">
                  לא נבחר לקוח
                </div>
                <p className="mt-2 text-sm font-bold leading-6 text-[#8a7b68]">
                  הוסיפי ליד ראשון או בחרי לקוח מהטבלה.
                </p>
              </section>
            )}
          </aside>
        </section>
      </div>

      {selectedLeadForUi && clientFileOpen && (
        <Modal
          title={`תיק לקוח - ${selectedLeadForUi.name}`}
          onClose={() => setClientFileOpen(false)}
          wide
        >
          <ClientFile
            lead={selectedLeadForUi}
            hallId={encodedHallId}
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
            <FormInput
              label="שם לקוח"
              value={newLeadForm.name}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, name: value }))}
            />
            <FormInput
              label="טלפון"
              value={newLeadForm.phone}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, phone: value }))}
            />
            <FormInput
              label="אימייל"
              value={newLeadForm.email}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, email: value }))}
            />
            <FormInput
              label="סוג אירוע"
              value={newLeadForm.eventType}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, eventType: value }))}
            />
            <FormInput
              label="תאריך מבוקש"
              value={newLeadForm.requestedDate}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, requestedDate: value }))}
            />
            <FormInput
              label="אולם מועדף"
              value={newLeadForm.preferredHall}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, preferredHall: value }))}
            />
            <FormInput
              label="כמות אורחים"
              type="number"
              value={newLeadForm.guests}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, guests: value }))}
            />
            <FormInput
              label="תקציב"
              type="number"
              value={newLeadForm.budget}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, budget: value }))}
            />
            <FormInput
              label="מקור פנייה"
              value={newLeadForm.source}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, source: value }))}
            />
            <FormInput
              label="אחראי"
              value={newLeadForm.owner}
              onChange={(value) => setNewLeadForm((prev) => ({ ...prev, owner: value }))}
            />

            <button
              type="button"
              onClick={createLead}
              disabled={saving}
              className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              שמירת ליד
            </button>
          </div>
        </Modal>
      )}

      {selectedLeadForUi && meetingOpen && (
        <Modal title="קביעת פגישה וסנכרון ליומן" onClose={() => setMeetingOpen(false)}>
          <div className="grid gap-3">
            <InfoLine label="לקוח" value={selectedLeadForUi.name} />
            <FormInput
              label="תאריך פגישה"
              type="date"
              value={meetingForm.date}
              onChange={(value) => setMeetingForm((prev) => ({ ...prev, date: value }))}
            />
            <FormInput
              label="שעה"
              type="time"
              value={meetingForm.time}
              onChange={(value) => setMeetingForm((prev) => ({ ...prev, time: value }))}
            />
            <FormInput
              label="סוג פגישה"
              value={meetingForm.type}
              onChange={(value) => setMeetingForm((prev) => ({ ...prev, type: value }))}
            />
            <FormInput
              label="נציג אחראי"
              value={meetingForm.owner || selectedLeadForUi.owner}
              onChange={(value) => setMeetingForm((prev) => ({ ...prev, owner: value }))}
            />

            <div className="rounded-2xl border border-[#eadfce] bg-[#fff8eb] p-3 text-xs font-bold leading-6 text-[#7f705d]">
              הפגישה נשמרת בתיק הלקוח. חיבור תצוגת פגישות ביומן יהיה בשלב הבא.
            </div>

            <button
              type="button"
              onClick={scheduleMeeting}
              disabled={saving}
              className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              שמור פגישה
            </button>
          </div>
        </Modal>
      )}

      {selectedLeadForUi && noteOpen && (
        <Modal title="הוספת שיחה / הערה" onClose={() => setNoteOpen(false)}>
          <div className="grid gap-3">
            <InfoLine label="לקוח" value={selectedLeadForUi.name} />

            <label className="block">
              <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                סוג פעולה
              </span>
              <select
                value={noteForm.type}
                onChange={(event) =>
                  setNoteForm((prev) => ({
                    ...prev,
                    type: event.target.value as ClientActivityType,
                  }))
                }
                className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              >
                <option value="note">הערה</option>
                <option value="call">שיחה</option>
                <option value="sms">SMS</option>
                <option value="meeting">פגישה</option>
                <option value="proposal">הצעה</option>
                <option value="contract">חוזה</option>
              </select>
            </label>

            <FormInput
              label="כותרת"
              value={noteForm.title}
              onChange={(value) => setNoteForm((prev) => ({ ...prev, title: value }))}
            />

            <textarea
              value={noteForm.description}
              onChange={(event) =>
                setNoteForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="כתבי כאן את תוכן השיחה / הערה..."
              className="min-h-[140px] rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />

            <FormInput
              label="תאריך מעקב / זמן"
              value={noteForm.followUpAt}
              onChange={(value) => setNoteForm((prev) => ({ ...prev, followUpAt: value }))}
            />

            <button
              type="button"
              onClick={saveNote}
              disabled={saving}
              className="mt-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              שמור לתיק לקוח
            </button>
          </div>
        </Modal>
      )}

      {selectedLeadForUi && proposalOpen && (
        <Modal title="שליחת הצעת מחיר" onClose={() => setProposalOpen(false)} wide>
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoLine label="לקוח" value={selectedLeadForUi.name} />
                <InfoLine label="סוג אירוע" value={selectedLeadForUi.eventType || "-"} />
                <InfoLine label="תאריך מבוקש" value={selectedLeadForUi.requestedDate || "-"} />
                <InfoLine label="אולם" value={selectedLeadForUi.preferredHall || hall?.name || "-"} />
                <InfoLine label="כמות אורחים" value={`${selectedLeadForUi.guests}`} />
                <InfoLine label="תקציב משוער" value={formatCurrency(selectedLeadForUi.budget)} />
              </div>

              <FileUploadBox
                title="העלאת קובץ הצעת מחיר"
                description="כרגע נשמר שם הקובץ בתיק הלקוח. בהמשך נחבר העלאה אמיתית לשרת."
                fileName={proposalFileName}
                onChange={(name) => setProposalFileName(name)}
              />

              <SignatureBox
                title="שדה חתימה להצעת מחיר"
                description="שם שדה החתימה יישמר בתיק הלקוח."
                value={proposalSignature}
                onChange={setProposalSignature}
              />
            </section>

            <aside className="space-y-3 rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-4">
              <h3 className="text-lg font-black text-[#2b241c]">שליחה ללקוח</h3>

              <a
                href={buildSms4FreeLink(selectedLeadForUi)}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <Send size={16} />
                שליחת SMS עם קישור חתימה
              </a>

              <button
                type="button"
                onClick={sendProposal}
                disabled={saving}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                סמן כהצעה נשלחה
              </button>
            </aside>
          </div>
        </Modal>
      )}

      {selectedLeadForUi && contractOpen && (
        <Modal title="שליחת חוזה לסגירה" onClose={() => setContractOpen(false)} wide>
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoLine label="לקוח" value={selectedLeadForUi.name} />
                <InfoLine label="אולם" value={selectedLeadForUi.preferredHall || hall?.name || "-"} />
                <InfoLine label="תאריך האירוע" value={selectedLeadForUi.requestedDate || "-"} />
                <InfoLine label="כמות אורחים" value={`${selectedLeadForUi.guests}`} />
              </div>

              <FileUploadBox
                title="העלאת חוזה / הסכם"
                description="כרגע נשמר שם הקובץ בתיק הלקוח. בהמשך נחבר העלאה אמיתית לשרת."
                fileName={contractFileName}
                onChange={(name) => setContractFileName(name)}
              />

              <SignatureBox
                title="שדה חתימה להסכם"
                description="שם שדה החתימה יישמר בתיק הלקוח."
                value={contractSignature}
                onChange={setContractSignature}
              />
            </section>

            <aside className="space-y-3 rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-4">
              <h3 className="text-lg font-black text-[#2b241c]">שליחת הסכם</h3>

              <a
                href={buildSms4FreeLink(selectedLeadForUi)}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <Send size={16} />
                שליחת SMS עם קישור חתימה
              </a>

              <button
                type="button"
                onClick={sendContract}
                disabled={saving}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />}
                סמן כחוזה נשלח
              </button>

              <button
                type="button"
                onClick={() => {
                  sendContract();
                  setCloseEventOpen(true);
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-white text-sm font-black text-[#9f6f1a]"
              >
                <CheckCircle2 size={16} />
                המשך לסגירת אירוע
              </button>
            </aside>
          </div>
        </Modal>
      )}

      {selectedLeadForUi && closeEventOpen && (
        <Modal title="סגירת אירוע והכנסה ליומן" onClose={() => setCloseEventOpen(false)}>
          <div className="space-y-3">
            <InfoLine label="לקוח" value={selectedLeadForUi.name} />
            <InfoLine label="אולם" value={selectedLeadForUi.preferredHall || hall?.name || "-"} />
            <InfoLine label="כמות אורחים" value={`${selectedLeadForUi.guests}`} />
            <InfoLine label="מחיר שסוכם" value={formatCurrency(selectedLeadForUi.budget)} />

            <FormInput
              label="תאריך אירוע"
              type="date"
              value={closeEventForm.date}
              onChange={(value) => setCloseEventForm((prev) => ({ ...prev, date: value }))}
            />

            <FormInput
              label="שעת התחלה"
              type="time"
              value={closeEventForm.startTime}
              onChange={(value) => setCloseEventForm((prev) => ({ ...prev, startTime: value }))}
            />

            <FormInput
              label="שעת סיום"
              type="time"
              value={closeEventForm.endTime}
              onChange={(value) => setCloseEventForm((prev) => ({ ...prev, endTime: value }))}
            />

            <FormInput
              label="שולם עד כה"
              type="number"
              value={closeEventForm.paidAmount}
              onChange={(value) => setCloseEventForm((prev) => ({ ...prev, paidAmount: value }))}
            />

            <textarea
              value={closeEventForm.notes}
              onChange={(event) =>
                setCloseEventForm((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              placeholder="הערות לאירוע..."
              className="min-h-[100px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />

            <button
              type="button"
              onClick={closeEvent}
              disabled={saving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              אשר וסגור אירוע
            </button>
          </div>
        </Modal>
      )}

      {filterOpen && (
        <Modal title="סינון CRM" onClose={() => setFilterOpen(false)}>
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-[#8a7b68]">
                סטטוס
              </span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as LeadStatus | "all")
                }
                className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="new">ליד חדש</option>
                <option value="contacted">נוצר קשר</option>
                <option value="meeting">נקבעה פגישה</option>
                <option value="proposal">הצעה נשלחה</option>
                <option value="negotiation">במו״מ</option>
                <option value="closed">נסגר</option>
                <option value="lost">לא נסגר</option>
              </select>
            </label>

            <FormInput
              label="חיפוש"
              value={search}
              onChange={setSearch}
            />

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
              <div className="text-xs font-black text-[#b98121]">
                תיק לקוח מלא
              </div>
              <h2 className="mt-1 text-3xl font-black text-[#2b241c]">
                {lead.name}
              </h2>
              <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                {lead.eventType || "ללא סוג אירוע"} ·{" "}
                {lead.requestedDate || "ללא תאריך"} ·{" "}
                {lead.preferredHall || "ללא אולם"}
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClass(
                lead.status
              )}`}
            >
              {statusLabel(lead.status)}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <InfoLine label="טלפון" value={lead.phone || "-"} />
            <InfoLine label="אימייל" value={lead.email || "-"} />
            <InfoLine label="מקור" value={lead.source || "-"} />
            <InfoLine label="אורחים" value={`${lead.guests}`} />
            <InfoLine label="תקציב" value={formatCurrency(lead.budget)} />
            <InfoLine label="אחראי" value={lead.owner || "-"} />
          </div>
        </div>

        <div className="rounded-[26px] border border-[#eadfce] bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-[#2b241c]">
              היסטוריית קשר ופעילות
            </h3>
            <button
              type="button"
              onClick={onNote}
              className="rounded-2xl bg-[#f4ead9] px-3 py-2 text-xs font-black text-[#b98121]"
            >
              הוסף הערה
            </button>
          </div>

          <div className="space-y-3">
            {lead.activities.length ? (
              lead.activities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))
            ) : (
              <EmptySmall text="אין פעילות עדיין." />
            )}
          </div>
        </div>

        <div className="rounded-[26px] border border-[#eadfce] bg-white p-4">
          <h3 className="text-lg font-black text-[#2b241c]">המשך טיפול</h3>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ActionButton
              icon={<CalendarDays size={17} />}
              label="קבע פגישה וסנכרן ליומן"
              onClick={onMeeting}
            />
            <ActionButton
              icon={<FileText size={17} />}
              label="צור / שלח הצעת מחיר"
              onClick={onProposal}
            />
            <ActionButton
              icon={<FileSignature size={17} />}
              label="שלח חוזה לסגירה"
              onClick={onContract}
            />
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
            {[
              "ליד חדש",
              "נוצר קשר",
              "נקבעה פגישה",
              "הצעה נשלחה",
              "במו״מ",
              "נסגר",
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-black",
                    index <= 3
                      ? "bg-[#b98121] text-white"
                      : "bg-[#f4ead9] text-[#b98121]",
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

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
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
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#fffdf8] px-3 py-2">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <span className="text-sm font-black text-[#2b241c]">{value}</span>
    </div>
  );
}

function ActivityRow({ activity }: { activity: VenueLeadActivity }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#b98121]">
        {activityIcon(activity.type)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-black text-[#2b241c]">
            {activity.title}
          </div>
          <div className="shrink-0 text-xs font-black text-[#b98121]">
            {activity.date}
          </div>
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

function FileUploadBox({
  title,
  description,
  fileName,
  onChange,
}: {
  title: string;
  description: string;
  fileName: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d9bd83] bg-[#fffdf8] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-black text-[#2b241c]">{title}</div>
          <div className="mt-1 text-xs font-bold leading-6 text-[#7f705d]">
            {description}
          </div>
          {fileName ? (
            <div className="mt-2 rounded-full bg-[#f4ead9] px-3 py-1 text-xs font-black text-[#b98121]">
              קובץ נבחר: {fileName}
            </div>
          ) : null}
        </div>

        <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]">
          <Upload size={17} />
          העלאת קובץ
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onChange(file.name);
            }}
          />
        </label>
      </div>
    </div>
  );
}

function SignatureBox({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-black text-[#2b241c]">{title}</div>
        <div className="mt-1 text-xs font-bold leading-6 text-[#7f705d]">
          {description}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-[#d9bd83] bg-[#fff8eb] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-black text-[#8a7b68]">
            תצוגת שדה חתימה
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#b98121]">
            חתימה דיגיטלית
          </span>
        </div>

        <div className="flex min-h-[95px] items-center justify-center rounded-2xl border border-[#eadfce] bg-white">
          <div className="text-center">
            <FileSignature className="mx-auto text-[#b98121]" size={26} />
            <div className="mt-2 text-sm font-black text-[#2b241c]">
              {value || "חתימת לקוח כאן"}
            </div>
            <div className="mt-1 text-xs font-bold text-[#8a7b68]">
              הלקוח יחתום בעמוד חתימה בתוך האתר
            </div>
          </div>
        </div>

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="שם שדה החתימה, לדוגמה: חתימת הלקוח"
          className="mt-3 h-11 w-full rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
        />
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date" | "time";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-[#8a7b68]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
      />
    </label>
  );
}

function EmptySmall({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9bd83] bg-[#fffdf8] p-4 text-center text-sm font-bold leading-6 text-[#8a7b68]">
      {text}
    </div>
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