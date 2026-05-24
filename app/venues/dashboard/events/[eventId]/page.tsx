"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Edit3,
  Eye,
  FileText,
  FolderOpen,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Receipt,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

type PaymentRowStatus = "paid" | "partial" | "unpaid";

type EventStatus = "active" | "archived";
type EventPaymentStatus = "paid" | "refunded";
type VenueAccessStatus = "none" | "linked" | "disabled";

type EventType =
  | "wedding"
  | "bar-mitzvah"
  | "bat-mitzvah"
  | "brit"
  | "brita"
  | "henna"
  | "other";

type EventDashboardData = {
  id: string;
  _id?: string;

  userId?: string;
  producerId?: string;
  assignedStaffIds?: string[];

  venueOwnerId?: string;
  venueHallId?: string;
  venueHallName?: string;
  venueLinkedAt?: string;
  venueAccessStatus?: VenueAccessStatus;

  venueClientUserId?: string;
venueClientInvitationId?: string;
venueClientPackageType?: string;
venueClientPaymentStatus?: string;
venueClientRecordsCount?: number;

  email: string;

  eventType: EventType;
  title: string;

  budgetTotal?: number;
  estimatedGuests?: number | null;
  estimatedGuestCount?: number | null;

  date: string;
  time?: string;

  location?: {
    address?: string;
    lat?: number;
    lng?: number;
  };

  giftCreditUrl?: string;

  maxGuests: number;

  paymentStatus: EventPaymentStatus;
  status: EventStatus;

  notes?: string;

  createdAt?: string;
  updatedAt?: string;
};

type EventStats = {
  rsvp: {
    enabled: boolean;
    recordsCount: number;
    confirmedRecords: number;
    declinedRecords: number;
    pendingRecords: number;
    confirmedGuestsAmount: number;
  };

  seating: {
    enabled: boolean;
    totalTables: number;
    seatedGuests: number;
    unseatedGuests: number;
    completed: boolean;
  };

  production: {
    managerName?: string;
    tasksTotal: number;
    tasksDone: number;
  };
};

type VenueHall = {
  id: string;
  name: string;
  subtitle?: string;
  capacity?: number;
  status?: string;
  image?: string;
};

type PaymentRow = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: PaymentRowStatus;
  note: string;
};

type TaskRow = {
  id: string;
  title: string;
  dueDate: string;
  status: "done" | "open" | "urgent";
};

type FileRow = {
  id: string;
  title: string;
  type: "pdf" | "image" | "excel";
  date: string;
  size: string;
};

type ActivityRow = {
  id: string;
  title: string;
  date: string;
  description: string;
};

type VenueMenuTemplate = {
  id: string;
  name: string;
  type: string;
  categories: number;
  dishes: number;
  status: "active" | "draft";
  description: string;
};

type AssignedMenu = {
  id: string;
  templateId: string;
  name: string;
  sentToCouple: boolean;
  coupleSelected: boolean;
  approved: boolean;
};

type VenueSeatingTemplateRow = {
  id: string;
  name: string;
  description?: string;
  tablesCount: number;
  createdAt?: string;
};

type ClientInviteState = {
  registrationLink: string;
  copyText: string;
};

type EventEditForm = {
  title: string;
  eventType: EventType;
  date: string;
  time: string;
  estimatedGuests: string;
  budgetTotal: string;
  venueHallId: string;
  venueHallName: string;
  notes: string;
};

const emptyStats: EventStats = {
  rsvp: {
    enabled: false,
    recordsCount: 0,
    confirmedRecords: 0,
    declinedRecords: 0,
    pendingRecords: 0,
    confirmedGuestsAmount: 0,
  },
  seating: {
    enabled: false,
    totalTables: 0,
    seatedGuests: 0,
    unseatedGuests: 0,
    completed: false,
  },
  production: {
    managerName: "",
    tasksTotal: 0,
    tasksDone: 0,
  },
};

const venueMenuTemplates: VenueMenuTemplate[] = [
  {
    id: "menu-premium",
    name: "תפריט פרימיום",
    type: "חתונות",
    categories: 5,
    dishes: 28,
    status: "active",
    description: "ראשונות, עיקריות, בופה, קינוחים ובר אפטר.",
  },
  {
    id: "menu-classic",
    name: "תפריט קלאסי",
    type: "אירועים כלליים",
    categories: 4,
    dishes: 22,
    status: "active",
    description: "תפריט בסיס עשיר עם בחירה גמישה לזוג.",
  },
  {
    id: "menu-vip",
    name: "תפריט VIP",
    type: "אירועי יוקרה",
    categories: 6,
    dishes: 34,
    status: "active",
    description: "תפריט מורחב עם עמדות מיוחדות וקינוחים אישיים.",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value?: string) {
  if (!value) return "לא הוגדר";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatDateTime(value?: string) {
  if (!value) return "לא הוגדר";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function eventStatusLabel(status?: EventStatus) {
  if (status === "active") return "פעיל";
  if (status === "archived") return "בארכיון";
  return "פעיל";
}

function eventStatusTone(status?: EventStatus): "green" | "amber" | "rose" | "gray" | "gold" {
  if (status === "archived") return "gray";
  return "green";
}

function eventTypeLabel(type?: EventType | string) {
  if (type === "wedding") return "חתונה";
  if (type === "bar-mitzvah") return "בר מצווה";
  if (type === "bat-mitzvah") return "בת מצווה";
  if (type === "brit") return "ברית";
  if (type === "brita") return "בריתה";
  if (type === "henna") return "חינה";
  if (type === "other") return "אחר";
  return type || "לא הוגדר";
}

function paymentStatusLabel(status: PaymentRowStatus) {
  if (status === "paid") return "שולם";
  if (status === "partial") return "חלקי";
  return "פתוח";
}

function paymentStatusClass(status: PaymentRowStatus) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
  if (status === "partial") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function taskStatusClass(status: TaskRow["status"]) {
  if (status === "done") return "bg-emerald-50 text-emerald-700";
  if (status === "urgent") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function taskStatusLabel(status: TaskRow["status"]) {
  if (status === "done") return "בוצע";
  if (status === "urgent") return "דחוף";
  return "פתוח";
}

export default function VenueEventPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params?.eventId || "";

  const [eventData, setEventData] = useState<EventDashboardData | null>(null);
  const [eventStats, setEventStats] = useState<EventStats>(emptyStats);
  const [hallData, setHallData] = useState<VenueHall | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingEvent, setSavingEvent] = useState(false);
  const [serverError, setServerError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [menuSelectOpen, setMenuSelectOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [assignedMenu, setAssignedMenu] = useState<AssignedMenu | null>(null);

  const [seatingTemplates, setSeatingTemplates] = useState<VenueSeatingTemplateRow[]>([]);
  const [selectedSeatingTemplateId, setSelectedSeatingTemplateId] = useState("");
  const [clientInviteLoading, setClientInviteLoading] = useState(false);
  const [clientInviteError, setClientInviteError] = useState("");
  const [clientInvite, setClientInvite] = useState<ClientInviteState | null>(null);

  const hallId = eventData?.venueHallId || "";
  const hallName = hallData?.name || eventData?.venueHallName || "אולם";
  const clientName = eventData?.email || "לא הוגדר";
  const eventTitle = eventData?.title || "אירוע ללא שם";

  const guestsCount =
    eventStats.rsvp.enabled && eventStats.rsvp.confirmedGuestsAmount > 0
      ? eventStats.rsvp.confirmedGuestsAmount
      : eventData?.estimatedGuestCount ||
        eventData?.estimatedGuests ||
        eventData?.maxGuests ||
        0;

  const fetchEvent = async () => {
    if (!eventId) return;

    setLoading(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/events/${eventId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינת פרטי האירוע נכשלה");
      }

      setEventData(data.event || null);
      setHallData(data.hall || null);
      setEventStats(data.stats || emptyStats);
    } catch (error) {
      console.error("GET event details failed:", error);
      setServerError(
        error instanceof Error ? error.message : "טעינת פרטי האירוע נכשלה"
      );
      setEventData(null);
      setHallData(null);
      setEventStats(emptyStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchEvent();

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [eventId]);


  useEffect(() => {
    if (!hallId) {
      setSeatingTemplates([]);
      setSelectedSeatingTemplateId("");
      return;
    }

    let cancelled = false;

    async function fetchSeatingTemplates() {
      try {
        const res = await fetch(
          `/api/venues/dashboard/seating-templates?hallId=${encodeURIComponent(hallId)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || data?.error || "טעינת תבניות ההושבה נכשלה");
        }

        const templates = Array.isArray(data?.templates)
          ? data.templates.map((template: any) => ({
              id: String(template._id || template.id || ""),
              name: String(template.name || "תבנית ללא שם"),
              description: String(template.description || ""),
              tablesCount: Array.isArray(template.tables) ? template.tables.length : 0,
              createdAt: template.createdAt ? String(template.createdAt) : "",
            }))
          : [];

        if (cancelled) return;

        setSeatingTemplates(templates);

        if (!selectedSeatingTemplateId && templates[0]?.id) {
          setSelectedSeatingTemplateId(templates[0].id);
        }
      } catch (error) {
        console.error("GET seating templates failed:", error);

        if (!cancelled) {
          setSeatingTemplates([]);
        }
      }
    }

    fetchSeatingTemplates();

    return () => {
      cancelled = true;
    };
  }, [hallId, selectedSeatingTemplateId]);

  const financial = useMemo(() => {
    const commitment = toNumber(eventData?.budgetTotal, 0);
    const totalPaid = eventData?.paymentStatus === "paid" ? commitment : 0;
    const estimatedBalance = Math.max(0, commitment - totalPaid);
    const paidPercentage =
      commitment > 0 ? Math.round((totalPaid / commitment) * 100) : 0;

    return {
      commitment,
      deposit: totalPaid,
      totalPaid,
      estimatedBalance,
      nextPayment: estimatedBalance,
      expectedAfterEvent: estimatedBalance,
      paidPercentage,
    };
  }, [eventData]);

  const payments = useMemo<PaymentRow[]>(() => {
    if (!eventData) return [];

    const rows: PaymentRow[] = [];

    if (financial.commitment > 0) {
      rows.push({
        id: "event-payment",
        title:
          eventData.paymentStatus === "paid"
            ? "תשלום אירוע שולם"
            : "תשלום אירוע הוחזר",
        amount: financial.commitment,
        dueDate: formatDate(eventData.date),
        status: eventData.paymentStatus === "paid" ? "paid" : "unpaid",
        note:
          eventData.paymentStatus === "paid"
            ? "לפי סטטוס התשלום באירוע"
            : "הסטטוס במערכת הוא refunded",
      });
    }

    return rows;
  }, [eventData, financial]);

  const tasks = useMemo<TaskRow[]>(() => {
    const total = eventStats.production.tasksTotal || 0;
    const done = eventStats.production.tasksDone || 0;
    const open = Math.max(0, total - done);

    if (!total) return [];

    return [
      {
        id: "production-tasks",
        title: `משימות הפקה פתוחות: ${open}`,
        dueDate: "מתוך מערכת ניהול האירוע",
        status: open === 0 ? "done" : "open",
      },
    ];
  }, [eventStats]);

  const files = useMemo<FileRow[]>(() => {
    return [];
  }, []);

  const activities = useMemo<ActivityRow[]>(() => {
    if (!eventData) return [];

    const rows: ActivityRow[] = [];

    if (eventData.createdAt) {
      rows.push({
        id: "created",
        title: "אירוע נוצר במערכת",
        date: formatDateTime(eventData.createdAt),
        description: "האירוע נשמר במודל Event של Invistimo.",
      });
    }

    if (eventData.venueLinkedAt) {
      rows.push({
        id: "venue-linked",
        title: "האירוע שויך לאולם",
        date: formatDateTime(eventData.venueLinkedAt),
        description: `האירוע שויך לאולם ${hallName}.`,
      });
    }

    if (eventData.updatedAt && eventData.updatedAt !== eventData.createdAt) {
      rows.push({
        id: "updated",
        title: "אירוע עודכן",
        date: formatDateTime(eventData.updatedAt),
        description: "פרטי האירוע עודכנו לאחרונה.",
      });
    }

    return rows;
  }, [eventData, hallName]);

  const progress = useMemo(() => {
    const paymentProgress =
      financial.commitment > 0 ? Math.min(100, financial.paidPercentage) : 0;

    const seatingProgress = eventStats.seating.enabled
      ? eventStats.seating.completed
        ? 100
        : eventStats.seating.seatedGuests > 0 && guestsCount > 0
          ? Math.min(99, Math.round((eventStats.seating.seatedGuests / guestsCount) * 100))
          : 25
      : 0;

    const menuProgress = assignedMenu ? 65 : 0;

    const productionProgress =
      eventStats.production.tasksTotal > 0
        ? Math.round(
            (eventStats.production.tasksDone / eventStats.production.tasksTotal) * 100
          )
        : eventData?.status === "active"
          ? 35
          : 0;

    const total = Math.round(
      (paymentProgress + seatingProgress + menuProgress + productionProgress) / 4
    );

    return {
      payments: paymentProgress,
      seating: seatingProgress,
      menu: menuProgress,
      production: productionProgress,
      total,
    };
  }, [assignedMenu, eventData, eventStats, financial, guestsCount]);

  const chooseMenuForEvent = (template: VenueMenuTemplate) => {
    setAssignedMenu({
      id: `event-menu-${Date.now()}`,
      templateId: template.id,
      name: template.name,
      sentToCouple: false,
      coupleSelected: false,
      approved: false,
    });

    setMenuSelectOpen(false);
    setActiveTab("menu");
  };

  const markMenuSent = () => {
    setAssignedMenu((current) =>
      current
        ? {
            ...current,
            sentToCouple: true,
          }
        : current
    );

    setSendMenuOpen(false);
  };

  const updateEvent = async (form: EventEditForm) => {
    if (!eventData) return;

    setSavingEvent(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/events/${eventData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: form.title,
          eventType: form.eventType,
          date: form.date,
          time: form.time,
          estimatedGuests: toNumber(form.estimatedGuests, 0),
          estimatedGuestCount: toNumber(form.estimatedGuests, 0),
          budgetTotal: toNumber(form.budgetTotal, 0),
          venueHallId: form.venueHallId,
          venueHallName: form.venueHallName,
          notes: form.notes,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "עדכון האירוע נכשל");
      }

      if (data.event) {
        setEventData(data.event);
      } else {
        await fetchEvent();
      }

      if (data.stats) {
        setEventStats(data.stats);
      }

      if (data.hall) {
        setHallData(data.hall);
      }

      setEditOpen(false);
    } catch (error) {
      console.error("PATCH event details failed:", error);
      setServerError(error instanceof Error ? error.message : "עדכון האירוע נכשל");
    } finally {
      setSavingEvent(false);
    }
  };

  const createClientInvite = async () => {
    if (!eventData?.id) {
      alert("לא נמצא מזהה אירוע");
      return;
    }

    if (!selectedSeatingTemplateId) {
      alert("חובה לבחור תבנית הושבה לפני יצירת קישור הרשמה");
      setActiveTab("client-invite");
      return;
    }

    setClientInviteLoading(true);
    setClientInviteError("");

    try {
      const res = await fetch(
        `/api/venues/dashboard/events/${eventData.id}/client-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            seatingTemplateId: selectedSeatingTemplateId,
            packageType: "seating_only",
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message || data?.error || "יצירת קישור הרשמה ללקוח נכשלה"
        );
      }

      const registrationLink = String(data?.registrationLink || "");
      const copyText = String(
        data?.copyText ||
          `שלום, האולם פתח עבורך גישה ל-Invistimo לניהול האירוע שלך. להרשמה: ${registrationLink}`
      );

      setClientInvite({
        registrationLink,
        copyText,
      });

      setActiveTab("client-invite");

      if (registrationLink && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(registrationLink).catch(() => undefined);
      }
    } catch (error) {
      console.error("POST client invite failed:", error);
      setClientInviteError(
        error instanceof Error ? error.message : "יצירת קישור הרשמה ללקוח נכשלה"
      );
    } finally {
      setClientInviteLoading(false);
    }
  };

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f6f2] p-10 text-[#2b241c]">
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#eadfce] bg-white p-8 text-center shadow-sm">
          <div className="text-lg font-black">טוען פרטי אירוע...</div>
          <div className="mt-2 text-sm font-bold text-[#8a7b68]">
            הנתונים נטענים מהשרת לפי מזהה האירוע.
          </div>
        </div>
      </main>
    );
  }

  if (serverError || !eventData) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#f8f6f2] p-10 text-[#2b241c]">
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-100 bg-white p-8 text-center shadow-sm">
          <div className="text-lg font-black text-rose-700">
            {serverError || "האירוע לא נמצא"}
          </div>

          <Link
            href="/venues/dashboard"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white"
          >
            חזרה לדשבורד
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1820px] px-4 py-5 md:px-7">
        <header className="mb-5 rounded-[32px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#9b8a73]">
                <span>אירועים</span>
                <span>›</span>
                <span>{hallName}</span>
                <span>›</span>
                <span>#{eventData.id}</span>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121]">
                  <CalendarDays size={32} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight md:text-5xl">
                      {eventTitle}
                    </h1>

                    <span className="rounded-full bg-[#fff4dc] px-3 py-1 text-xs font-black text-[#b98121]">
                      {eventStatusLabel(eventData.status)}
                    </span>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black",
                        eventStats.seating.enabled
                          ? eventStats.seating.completed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {eventStats.seating.enabled
                        ? eventStats.seating.completed
                          ? "הושבה הושלמה"
                          : "הושבה בתהליך"
                        : "לא הופעלה הושבה"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold text-[#7f705d]">
                    <span>{formatDate(eventData.date)}</span>
                    <span>•</span>
                    <span>{eventData.time || "לא הוגדרה שעה"}</span>
                    <span>•</span>
                    <span>{hallName}</span>
                    <span>•</span>
                    <span>{guestsCount} אורחים</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={
                  hallId
                    ? `/venues/dashboard/halls/${hallId}/calendar`
                    : "/venues/dashboard"
                }
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <ArrowRight size={17} />
                חזרה ליומן
              </Link>

              <button
                type="button"
                onClick={() => setActionsOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <MoreHorizontal size={17} />
                פעולות נוספות
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("client-invite")}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] transition hover:bg-[#f4ead9]"
              >
                <Link2 size={17} />
                פתיחת לקוח Invistimo
              </button>

              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
              >
                <Edit3 size={17} />
                עריכת אירוע
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <HeroMetric
            title="תקציב האירוע"
            value={formatCurrency(financial.commitment)}
            subtitle="budgetTotal מתוך Event"
            icon={<CircleDollarSign size={22} />}
          />

          <HeroMetric
            title="סטטוס תשלום"
            value={eventData.paymentStatus === "paid" ? "שולם" : "הוחזר"}
            subtitle="paymentStatus מתוך Event"
            icon={<WalletCards size={22} />}
            success={eventData.paymentStatus === "paid"}
            danger={eventData.paymentStatus === "refunded"}
          />

          <HeroMetric
            title="אחוז תשלום"
            value={`${financial.paidPercentage}%`}
            subtitle="לפי סטטוס התשלום"
            icon={<CreditCard size={22} />}
          />

          <HeroMetric
            title="אישרו הגעה"
            value={`${eventStats.rsvp.confirmedGuestsAmount || 0}`}
            subtitle={
              eventStats.rsvp.enabled
                ? `${eventStats.rsvp.confirmedRecords} רשומות אישרו`
                : "אישורי הגעה לא הופעלו"
            }
            icon={<UsersRound size={22} />}
            success={eventStats.rsvp.enabled}
          />

          <HeroMetric
            title="הושבו"
            value={`${eventStats.seating.seatedGuests || 0}`}
            subtitle={
              eventStats.seating.enabled
                ? `${eventStats.seating.totalTables} שולחנות`
                : "הושבה לא הופעלה"
            }
            icon={<CalendarDays size={22} />}
            success={eventStats.seating.completed}
          />
        </section>

        <section className="mt-5 rounded-[30px] border border-[#eadfce] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-6">
            <StatusTile
              label="סטטוס אירוע"
              value={eventStatusLabel(eventData.status)}
              tone={eventStatusTone(eventData.status)}
            />

            <StatusTile
              label="סטטוס הושבה"
              value={
                eventStats.seating.enabled
                  ? eventStats.seating.completed
                    ? "הושלמה"
                    : "בתהליך"
                  : "לא הופעלה"
              }
              tone={
                eventStats.seating.enabled
                  ? eventStats.seating.completed
                    ? "green"
                    : "amber"
                  : "gray"
              }
            />

            <StatusTile
              label="סטטוס תפריט"
              value={assignedMenu ? "תפריט נבחר" : "חסר תפריט"}
              tone={assignedMenu ? "green" : "rose"}
            />

            <StatusTile
              label="סטטוס תשלום"
              value={eventData.paymentStatus === "paid" ? "שולם" : "הוחזר"}
              tone={eventData.paymentStatus === "paid" ? "green" : "rose"}
            />

            <StatusTile
              label="אישורי הגעה"
              value={
                eventStats.rsvp.enabled
                  ? `${eventStats.rsvp.confirmedGuestsAmount} מגיעים`
                  : "לא הופעל"
              }
              tone={eventStats.rsvp.enabled ? "green" : "gray"}
            />

            <StatusTile
              label="מנהל אירוע"
              value={eventStats.production.managerName || "לא הוגדר"}
              tone={eventStats.production.managerName ? "green" : "gold"}
            />
          </div>
        </section>

        <nav className="mt-5 overflow-x-auto rounded-[26px] border border-[#eadfce] bg-white shadow-sm">
          <div className="flex min-w-[1150px]">
            {[
              { id: "overview", label: "סקירה כללית", icon: Sparkles },
              { id: "details", label: "פרטי אירוע", icon: CalendarDays },
              { id: "client", label: "לקוח", icon: UsersRound },
              { id: "client-invite", label: "פתיחת לקוח", icon: Link2 },
              { id: "payments", label: "תשלומים", icon: CreditCard },
              { id: "menu", label: "תפריט", icon: Utensils },
              { id: "seating", label: "הושבה", icon: UsersRound },
              { id: "rsvp", label: "אישורי הגעה", icon: CheckCircle2 },
              { id: "staff", label: "צוות וספקים", icon: ShieldCheck },
              { id: "tasks", label: "משימות", icon: CheckCircle2 },
              { id: "files", label: "קבצים", icon: FolderOpen },
            ].map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "flex h-14 flex-1 items-center justify-center gap-2 border-l border-[#eadfce] px-4 text-sm font-black transition",
                    activeTab === tab.id
                      ? "bg-[#b98121] text-white"
                      : "bg-white text-[#6f6252] hover:bg-[#fbf5ea] hover:text-[#b98121]",
                  ].join(" ")}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <section className="mt-5 grid gap-5 xl:grid-cols-[310px_1fr]">
          <aside className="space-y-5">
            <SideCard title="התקדמות האירוע" icon={<CheckCircle2 size={18} />}>
              <div className="space-y-4">
                {[
                  {
                    label: "יצירת אירוע",
                    date: eventData.createdAt
                      ? formatDateTime(eventData.createdAt)
                      : "בוצע",
                    done: true,
                  },
                  {
                    label: "שיוך לאולם",
                    date:
                      eventData.venueAccessStatus === "linked"
                        ? eventData.venueHallName || hallName
                        : "לא משויך",
                    done: eventData.venueAccessStatus === "linked",
                  },
                  {
                    label: "פרטי אירוע",
                    date: eventData.title ? "הוזנו" : "חסר",
                    done: Boolean(eventData.title),
                  },
                  {
                    label: "אישורי הגעה",
                    date: eventStats.rsvp.enabled
                      ? `${eventStats.rsvp.confirmedGuestsAmount} מגיעים`
                      : "לא הופעל",
                    done: eventStats.rsvp.enabled,
                  },
                  {
                    label: "הושבה",
                    date: eventStats.seating.enabled
                      ? `${eventStats.seating.seatedGuests} הושבו`
                      : "לא הופעלה",
                    done: eventStats.seating.completed,
                  },
                  {
                    label: "תפריט",
                    date: assignedMenu ? assignedMenu.name : "טרם נבחר",
                    done: Boolean(assignedMenu),
                  },
                ].map((step) => (
                  <div key={step.label} className="flex items-start gap-3">
                    <div
                      className={[
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black",
                        step.done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-[#eadfce] bg-white text-[#b8a88e]",
                      ].join(" ")}
                    >
                      {step.done ? "✓" : ""}
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#2b241c]">
                        {step.label}
                      </div>
                      <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                        {step.date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
                  <span>השלמה כללית</span>
                  <span>{progress.total}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                  <div
                    className="h-full rounded-full bg-[#b98121]"
                    style={{ width: `${progress.total}%` }}
                  />
                </div>
              </div>
            </SideCard>

            <SideCard title="פרטי לקוח" icon={<UsersRound size={18} />}>
              <div className="space-y-3">
                <InfoLine label="אימייל לקוח" value={clientName} />
                <InfoLine label="בעל האירוע" value={eventData.userId || "לא הוגדר"} />
                <InfoLine label="מפיק" value={eventData.producerId || "לא הוגדר"} />
                <InfoLine label="מקור" value="Event" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="h-10 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  שיחה
                </button>
                <button className="h-10 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]">
                  מייל
                </button>
              </div>
            </SideCard>

            <SideCard title="תקציר פיננסי" icon={<WalletCards size={18} />}>
              <div className="space-y-3">
                <InfoLine
                  label="תקציב"
                  value={formatCurrency(financial.commitment)}
                />
                <InfoLine
                  label="סטטוס"
                  value={eventData.paymentStatus === "paid" ? "שולם" : "הוחזר"}
                  danger={eventData.paymentStatus === "refunded"}
                />
                <InfoLine
                  label="יתרה משוערת"
                  value={formatCurrency(financial.estimatedBalance)}
                  danger={financial.estimatedBalance > 0}
                />
              </div>

              <button
                type="button"
                onClick={() => setPaymentOpen(true)}
                className="mt-4 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
              >
                צפייה בתשלומים
              </button>
            </SideCard>
          </aside>

          <div className="space-y-5">
            {activeTab === "overview" && (
              <>
                <section className="grid gap-5 xl:grid-cols-3">
                  <MainCard title="פרטי האירוע" icon={<CalendarDays size={19} />}>
                    <div className="space-y-3">
                      <InfoLine
                        label="סוג אירוע"
                        value={eventTypeLabel(eventData.eventType)}
                      />
                      <InfoLine label="אולם" value={hallName} />
                      <InfoLine label="תאריך" value={formatDate(eventData.date)} />
                      <InfoLine label="שעה" value={eventData.time || "לא הוגדר"} />
                      <InfoLine label="מיקום" value={eventData.location?.address || "לא הוגדר"} />
                      <InfoLine label="כמות אורחים" value={`${guestsCount}`} />
                      <InfoLine
                        label="מנהל אירוע"
                        value={eventStats.production.managerName || "לא הוגדר"}
                      />
                    </div>
                  </MainCard>

                  <MainCard title="אישורי הגעה" icon={<CheckCircle2 size={19} />}>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceMini
                        label="מגיעים"
                        value={`${eventStats.rsvp.confirmedGuestsAmount}`}
                        success={eventStats.rsvp.confirmedGuestsAmount > 0}
                      />
                      <FinanceMini
                        label="רשומות שאישרו"
                        value={`${eventStats.rsvp.confirmedRecords}`}
                      />
                      <FinanceMini
                        label="רשומות שלא מגיעות"
                        value={`${eventStats.rsvp.declinedRecords}`}
                        danger={eventStats.rsvp.declinedRecords > 0}
                      />
                      <FinanceMini
                        label="ממתינים"
                        value={`${eventStats.rsvp.pendingRecords}`}
                      />
                    </div>

                    {!eventStats.rsvp.enabled && (
                      <div className="mt-4">
                        <EmptyBox text="לא נמצאו אישורי הגעה מחוברים לאירוע הזה." />
                      </div>
                    )}
                  </MainCard>

                  <MainCard title="הושבה" icon={<UsersRound size={19} />}>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceMini
                        label="שולחנות"
                        value={`${eventStats.seating.totalTables}`}
                      />
                      <FinanceMini
                        label="הושבו"
                        value={`${eventStats.seating.seatedGuests}`}
                        success={eventStats.seating.seatedGuests > 0}
                      />
                      <FinanceMini
                        label="לא הושבו"
                        value={`${eventStats.seating.unseatedGuests}`}
                        danger={eventStats.seating.unseatedGuests > 0}
                      />
                      <FinanceMini
                        label="סטטוס"
                        value={eventStats.seating.completed ? "הושלם" : "בתהליך"}
                      />
                    </div>

                    {!eventStats.seating.enabled && (
                      <div className="mt-4">
                        <EmptyBox text="לא נמצאה הושבה מחוברת לאירוע הזה." />
                      </div>
                    )}
                  </MainCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-3">
                  <MainCard title="סיכום פיננסי" icon={<Receipt size={19} />}>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceMini
                        label="תקציב"
                        value={formatCurrency(financial.commitment)}
                      />
                      <FinanceMini
                        label="שולם"
                        value={formatCurrency(financial.totalPaid)}
                        success={financial.totalPaid > 0}
                      />
                      <FinanceMini
                        label="יתרה"
                        value={formatCurrency(financial.estimatedBalance)}
                        danger={financial.estimatedBalance > 0}
                      />
                      <FinanceMini
                        label="אחוז תשלום"
                        value={`${financial.paidPercentage}%`}
                      />
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
                        <span>אחוז תשלום</span>
                        <span>{financial.paidPercentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${financial.paidPercentage}%` }}
                        />
                      </div>
                    </div>
                  </MainCard>

                  <MainCard title="סטטוס והתקדמות" icon={<Sparkles size={19} />}>
                    <div className="space-y-3">
                      <ProgressRow label="תשלומים" value={progress.payments} />
                      <ProgressRow label="הושבה" value={progress.seating} />
                      <ProgressRow label="תפריט" value={progress.menu} />
                      <ProgressRow label="משימות הפקה" value={progress.production} />
                    </div>

                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="mt-4 h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252]"
                    >
                      צפייה בהערות
                    </button>
                  </MainCard>

                  <MainCard title="פעילות אחרונה" icon={<Clock3 size={19} />}>
                    <div className="space-y-3">
                      {activities.length ? (
                        activities.map((activity) => (
                          <ActivityItem key={activity.id} activity={activity} />
                        ))
                      ) : (
                        <EmptyBox text="אין פעילות מתועדת עדיין." />
                      )}
                    </div>
                  </MainCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <MainCard title="קבצים ומסמכים" icon={<FolderOpen size={19} />}>
                    <div className="space-y-3">
                      {files.length ? (
                        files.map((file) => <FileItem key={file.id} file={file} />)
                      ) : (
                        <EmptyBox text="עדיין לא הועלו קבצים לאירוע הזה." />
                      )}
                    </div>
                  </MainCard>

                  <MainCard title="הערות פנימיות" icon={<MessageCircle size={19} />}>
                    {eventData.notes ? (
                      <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
                        <p className="text-sm font-bold leading-7 text-[#7f705d]">
                          {eventData.notes}
                        </p>
                        <div className="mt-3 text-xs font-black text-[#9b8a73]">
                          הערה מתוך Event
                        </div>
                      </div>
                    ) : (
                      <EmptyBox text="אין הערות פנימיות לאירוע הזה." />
                    )}

                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="mt-4 h-11 w-full rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
                    >
                      צפייה בהערות
                    </button>
                  </MainCard>
                </section>
              </>
            )}

            {activeTab === "details" && (
              <MainCard title="פרטי אירוע" icon={<CalendarDays size={19} />}>
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoLine label="שם אירוע" value={eventTitle} />
                  <InfoLine label="סוג אירוע" value={eventTypeLabel(eventData.eventType)} />
                  <InfoLine label="תאריך" value={formatDate(eventData.date)} />
                  <InfoLine label="שעה" value={eventData.time || "לא הוגדר"} />
                  <InfoLine label="מיקום" value={eventData.location?.address || "לא הוגדר"} />
                  <InfoLine label="כמות משוערת" value={`${guestsCount}`} />
                  <InfoLine label="אולם" value={hallName} />
                  <InfoLine
                    label="סטטוס שיוך לאולם"
                    value={eventData.venueAccessStatus || "none"}
                  />
                </div>
              </MainCard>
            )}

            {activeTab === "client-invite" && (
              <ClientInviteTab
                eventId={eventId}
                hallId={hallId}
                hallName={hallName}
                clientName={clientName}
                eventTitle={eventTitle}
                seatingTemplates={seatingTemplates}
                selectedSeatingTemplateId={selectedSeatingTemplateId}
                onSelectSeatingTemplate={setSelectedSeatingTemplateId}
                clientInvite={clientInvite}
                clientInviteError={clientInviteError}
                loading={clientInviteLoading}
                onCreateInvite={createClientInvite}
              />
            )}

            {activeTab === "rsvp" && (
  <MainCard title="אישורי הגעה" icon={<CheckCircle2 size={19} />}>
    <div className="grid gap-4 md:grid-cols-5">
      <FinanceMini
        label="סה״כ רשומות"
        value={`${eventStats.rsvp.recordsCount}`}
      />
      <FinanceMini
        label="אישרו"
        value={`${eventStats.rsvp.confirmedRecords}`}
        success={eventStats.rsvp.confirmedRecords > 0}
      />
      <FinanceMini
        label="לא מגיעים"
        value={`${eventStats.rsvp.declinedRecords}`}
        danger={eventStats.rsvp.declinedRecords > 0}
      />
      <FinanceMini
        label="ממתינים"
        value={`${eventStats.rsvp.pendingRecords}`}
      />
      <FinanceMini
        label="כמות מגיעים"
        value={`${eventStats.rsvp.confirmedGuestsAmount}`}
        success={eventStats.rsvp.confirmedGuestsAmount > 0}
      />
    </div>

    {!eventStats.rsvp.enabled && (
      <div className="mt-5">
        <EmptyBox text="אין עדיין חיבור לאישורי הגעה עבור האירוע הזה." />
      </div>
    )}

    {eventData.venueClientInvitationId ? (
      <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-5">
        <div className="mb-4">
          <h3 className="text-lg font-black text-[#2b241c]">
            ניהול רשימת המוזמנים של הלקוח
          </h3>

          <p className="mt-1 text-sm font-bold leading-6 text-[#7f705d]">
            כאן האולם נכנס לאותה רשימת מוזמנים בדיוק שהלקוח רואה. כל אישור הגעה,
            שינוי סטטוס, שיוך לשולחן ומצב לייב ייטען מאותה הזמנה.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/dashboard?eventId=${encodeURIComponent(
              eventData.id
            )}&invitationId=${encodeURIComponent(
              eventData.venueClientInvitationId
            )}&venueView=1`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
          >
            <Eye size={17} />
            פתיחת רשימת מוזמנים
          </Link>

          <Link
            href={`/dashboard?eventId=${encodeURIComponent(
              eventData.id
            )}&invitationId=${encodeURIComponent(
              eventData.venueClientInvitationId
            )}&venueView=1&live=1`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1f1b17] px-5 text-sm font-black text-white shadow-sm transition hover:bg-black"
          >
            <Sparkles size={17} />
            פתיחת מצב לייב
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoPill
            label="מזהה אירוע"
            value={eventData.id || "לא הוגדר"}
          />
          <InfoPill
            label="מזהה הזמנה"
            value={eventData.venueClientInvitationId || "לא הוגדר"}
          />
          <InfoPill
            label="רשומות לקוח"
            value={`${eventData.venueClientRecordsCount || 0}`}
          />
        </div>
      </div>
    ) : (
      <div className="mt-5 rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-5">
        <div className="text-base font-black text-[#2b241c]">
          עדיין אין הזמנת לקוח מחוברת לאישורי ההגעה
        </div>

        <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
          כדי שהאולם יוכל לראות את רשימת המוזמנים ואישורי ההגעה, הלקוח צריך
          להירשם מהקישור של האולם ולסיים בחירת חבילה. לאחר מכן יווצר
          <span className="font-black"> venueClientInvitationId </span>
          והכפתורים יופיעו כאן.
        </p>

        <button
          type="button"
          onClick={() => setActiveTab("client-invite")}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
        >
          <Link2 size={17} />
          מעבר לפתיחת לקוח
        </button>
      </div>
    )}
  </MainCard>
)}

            {activeTab === "seating" && (
  <MainCard title="הושבה" icon={<UsersRound size={19} />}>
    <div className="grid gap-4 md:grid-cols-4">
      <FinanceMini
        label="שולחנות"
        value={`${eventStats.seating.totalTables}`}
      />
      <FinanceMini
        label="הושבו"
        value={`${eventStats.seating.seatedGuests}`}
        success={eventStats.seating.seatedGuests > 0}
      />
      <FinanceMini
        label="לא הושבו"
        value={`${eventStats.seating.unseatedGuests}`}
        danger={eventStats.seating.unseatedGuests > 0}
      />
      <FinanceMini
        label="סטטוס"
        value={eventStats.seating.completed ? "הושלם" : "בתהליך"}
      />
    </div>

    {!eventStats.seating.enabled && (
      <div className="mt-5">
        <EmptyBox text="אין עדיין חיבור להושבה עבור האירוע הזה." />
      </div>
    )}

    {eventData.venueClientInvitationId ? (
      <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-5">
        <div className="mb-4">
          <h3 className="text-lg font-black text-[#2b241c]">
            ניהול הושבת הלקוח
          </h3>
          <p className="mt-1 text-sm font-bold leading-6 text-[#7f705d]">
            כאן האולם נכנס לאותה הושבה בדיוק שהלקוח רואה ועורך. כל שינוי שהלקוח עושה נשמר באותו מסמך, והאולם יכול לראות ולנהל את זה גם בלייב ביום האירוע.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/dashboard/seating?eventId=${encodeURIComponent(
              eventData.id
            )}&invitationId=${encodeURIComponent(
              eventData.venueClientInvitationId
            )}&venueView=1`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
          >
            <Eye size={17} />
            פתיחת הושבה
          </Link>

          <Link
            href={`/dashboard/seating?eventId=${encodeURIComponent(
              eventData.id
            )}&invitationId=${encodeURIComponent(
              eventData.venueClientInvitationId
            )}&venueView=1&live=1`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1f1b17] px-5 text-sm font-black text-white shadow-sm transition hover:bg-black"
          >
            <Sparkles size={17} />
            ניהול הושבה בלייב
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <InfoPill
            label="מזהה אירוע"
            value={eventData.id || "לא הוגדר"}
          />
          <InfoPill
            label="מזהה הזמנה"
            value={eventData.venueClientInvitationId || "לא הוגדר"}
          />
          <InfoPill
            label="חבילת לקוח"
            value={eventData.venueClientPackageType || "לא הוגדר"}
          />
        </div>
      </div>
    ) : (
      <div className="mt-5 rounded-[28px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-5">
        <div className="text-base font-black text-[#2b241c]">
          עדיין אין הזמנת לקוח מחוברת להושבה
        </div>
        <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
          כדי שהאולם יוכל לראות ולנהל את ההושבה, הלקוח צריך להירשם מהקישור של האולם ולסיים בחירת חבילה. לאחר מכן יווצר 
          <span className="font-black"> venueClientInvitationId </span>
          והכפתורים יופיעו כאן.
        </p>

        <button
          type="button"
          onClick={() => setActiveTab("client-invite")}
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
        >
          <Link2 size={17} />
          מעבר לפתיחת לקוח
        </button>
      </div>
    )}
  </MainCard>
)}

            {activeTab === "menu" && (
              <EventMenuTab
                eventId={eventId}
                hallId={hallId}
                assignedMenu={assignedMenu}
                templates={venueMenuTemplates}
                onChooseMenu={() => setMenuSelectOpen(true)}
                onSendToCouple={() => setSendMenuOpen(true)}
              />
            )}

            {activeTab !== "overview" &&
              activeTab !== "details" &&
              activeTab !== "client-invite" &&
              activeTab !== "rsvp" &&
              activeTab !== "seating" &&
              activeTab !== "menu" && (
                <MainCard title={tabTitle(activeTab)} icon={<Sparkles size={19} />}>
                  <div className="rounded-3xl border border-dashed border-[#d9bd83] bg-[#fffaf0] p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#b98121]">
                      <Sparkles size={26} />
                    </div>
                    <h2 className="mt-4 text-xl font-black text-[#2b241c]">
                      {tabTitle(activeTab)}
                    </h2>
                    <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7f705d]">
                      כאן ייכנס המסך המלא של הטאב הזה מתוך מערכת Event.
                    </p>
                  </div>
                </MainCard>
              )}
          </div>
        </section>
      </div>

      {actionsOpen && (
        <Modal title="פעולות נוספות" onClose={() => setActionsOpen(false)}>
          <div className="grid gap-3">
            <ActionButton icon={<FileText size={17} />} label="הפקת חוזה" />
            <ActionButton icon={<Mail size={17} />} label="שליחת עדכון ללקוח" />
            <ActionButton icon={<Bell size={17} />} label="יצירת תזכורת" />
            <ActionButton icon={<FolderOpen size={17} />} label="העלאת קובץ" />
          </div>
        </Modal>
      )}

      {editOpen && (
        <EventEditModal
          event={eventData}
          saving={savingEvent}
          onClose={() => setEditOpen(false)}
          onSave={updateEvent}
        />
      )}

      {paymentOpen && (
        <Modal title="ניהול תשלומים" onClose={() => setPaymentOpen(false)}>
          <div className="space-y-3">
            <InfoLine
              label="תקציב האירוע"
              value={formatCurrency(financial.commitment)}
            />
            <InfoLine
              label="סטטוס תשלום"
              value={eventData.paymentStatus === "paid" ? "שולם" : "הוחזר"}
              danger={eventData.paymentStatus === "refunded"}
            />
            <InfoLine
              label="יתרה משוערת"
              value={formatCurrency(financial.estimatedBalance)}
              danger={financial.estimatedBalance > 0}
            />
            <button
              type="button"
              onClick={() => {
                setPaymentOpen(false);
                setEditOpen(true);
              }}
              className="mt-2 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              עדכון תקציב
            </button>
          </div>
        </Modal>
      )}

      {noteOpen && (
        <Modal title="הערות האירוע" onClose={() => setNoteOpen(false)}>
          <textarea
            value={eventData.notes || ""}
            readOnly
            placeholder="אין הערות לאירוע הזה."
            className="min-h-[140px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
          />
          <button
            type="button"
            onClick={() => {
              setNoteOpen(false);
              setEditOpen(true);
            }}
            className="mt-3 h-11 w-full rounded-2xl bg-[#b98121] text-sm font-black text-white"
          >
            עריכת הערות
          </button>
        </Modal>
      )}

      {menuSelectOpen && (
        <Modal
          title="בחירת תפריט לאירוע"
          onClose={() => setMenuSelectOpen(false)}
          wide
        >
          <div className="mb-4 rounded-2xl border border-[#eadfce] bg-[#fff8eb] p-4 text-sm font-bold leading-7 text-[#7f705d]">
            כאן בוחרים תפריט מתוך תפריטי האולם. לאחר הבחירה ייווצר עותק לאירוע הזה בלבד.
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {venueMenuTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => chooseMenuForEvent(template)}
                className="rounded-[26px] border border-[#eadfce] bg-[#fffdf8] p-4 text-right transition hover:-translate-y-1 hover:border-[#d9bd83] hover:bg-[#fff8eb] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                    <Utensils size={23} />
                  </div>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                    פעיל
                  </span>
                </div>

                <h3 className="mt-4 text-xl font-black text-[#2b241c]">
                  {template.name}
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">
                  {template.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <InfoPill label="קטגוריות" value={`${template.categories}`} />
                  <InfoPill label="מנות" value={`${template.dishes}`} />
                </div>

                <div className="mt-4 rounded-2xl bg-[#b98121] px-4 py-3 text-center text-sm font-black text-white">
                  בחירת תפריט לאירוע
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {sendMenuOpen && (
        <Modal
          title="שליחת קישור בחירת מנות לזוג"
          onClose={() => setSendMenuOpen(false)}
        >
          <div className="space-y-3">
            <InfoLine
              label="תפריט"
              value={assignedMenu?.name || "לא נבחר תפריט"}
            />
            <InfoLine
              label="קישור לזוג"
              value={`https://www.invistimo.com/menus/${eventId}/choose`}
            />

            <textarea
              defaultValue={`שלום, מצורף קישור לבחירת מנות לאירוע שלכם: https://www.invistimo.com/menus/${eventId}/choose`}
              className="min-h-[115px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />

            <button
              type="button"
              onClick={markMenuSent}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              <Send size={17} />
              סמן כקישור שנשלח
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function EventEditModal({
  event,
  saving,
  onClose,
  onSave,
}: {
  event: EventDashboardData;
  saving: boolean;
  onClose: () => void;
  onSave: (form: EventEditForm) => void;
}) {
  const [form, setForm] = useState<EventEditForm>({
    title: event.title || "",
    eventType: event.eventType || "wedding",
    date: event.date || "",
    time: event.time || "",
    estimatedGuests:
      event.estimatedGuestCount || event.estimatedGuests
        ? String(event.estimatedGuestCount || event.estimatedGuests)
        : "",
    budgetTotal: event.budgetTotal ? String(event.budgetTotal) : "",
    venueHallId: event.venueHallId || "",
    venueHallName: event.venueHallName || "",
    notes: event.notes || "",
  });

  const updateField = <K extends keyof EventEditForm>(
    key: K,
    value: EventEditForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    if (!form.date) {
      alert("חובה להזין תאריך");
      return;
    }

    onSave(form);
  };

  return (
    <Modal title="עריכת אירוע" onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <InputEdit
            label="שם האירוע"
            value={form.title}
            onChange={(value) => updateField("title", value)}
          />

          <label>
            <span className="mb-1 block text-xs font-black text-[#8a7b68]">
              סוג אירוע
            </span>
            <select
              value={form.eventType}
              onChange={(event) =>
                updateField("eventType", event.target.value as EventType)
              }
              className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            >
              <option value="wedding">חתונה</option>
              <option value="bar-mitzvah">בר מצווה</option>
              <option value="bat-mitzvah">בת מצווה</option>
              <option value="brit">ברית</option>
              <option value="brita">בריתה</option>
              <option value="henna">חינה</option>
              <option value="other">אחר</option>
            </select>
          </label>

          <InputEdit
            label="תאריך"
            type="date"
            value={form.date}
            onChange={(value) => updateField("date", value)}
          />

          <InputEdit
            label="שעה"
            type="time"
            value={form.time}
            onChange={(value) => updateField("time", value)}
          />

          <InputEdit
            label="כמות אורחים משוערת"
            type="number"
            value={form.estimatedGuests}
            onChange={(value) => updateField("estimatedGuests", value)}
          />

          <InputEdit
            label="תקציב / מחיר אירוע"
            type="number"
            value={form.budgetTotal}
            onChange={(value) => updateField("budgetTotal", value)}
          />

          <InputEdit
            label="מזהה אולם"
            value={form.venueHallId}
            onChange={(value) => updateField("venueHallId", value)}
          />

          <InputEdit
            label="שם אולם"
            value={form.venueHallName}
            onChange={(value) => updateField("venueHallName", value)}
          />

          <label className="md:col-span-2">
            <span className="mb-1 block text-xs font-black text-[#8a7b68]">
              הערות
            </span>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-[#eadfce] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-[#eadfce] bg-white px-6 text-sm font-black text-[#6f6252]"
          >
            ביטול
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white disabled:opacity-60"
          >
            <Save size={17} />
            {saving ? "שומר..." : "שמירת שינויים"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ClientInviteTab({
  eventId,
  hallId,
  hallName,
  clientName,
  eventTitle,
  seatingTemplates,
  selectedSeatingTemplateId,
  onSelectSeatingTemplate,
  clientInvite,
  clientInviteError,
  loading,
  onCreateInvite,
}: {
  eventId: string;
  hallId: string;
  hallName: string;
  clientName: string;
  eventTitle: string;
  seatingTemplates: VenueSeatingTemplateRow[];
  selectedSeatingTemplateId: string;
  onSelectSeatingTemplate: (templateId: string) => void;
  clientInvite: ClientInviteState | null;
  clientInviteError: string;
  loading: boolean;
  onCreateInvite: () => void;
}) {
  const selectedTemplate = seatingTemplates.find(
    (template) => template.id === selectedSeatingTemplateId
  );

  const copyLink = async () => {
    if (!clientInvite?.registrationLink) return;

    try {
      await navigator.clipboard.writeText(clientInvite.registrationLink);
      alert("הקישור הועתק");
    } catch {
      alert("לא הצלחתי להעתיק אוטומטית. אפשר להעתיק ידנית מהשדה.");
    }
  };

  const copyMessage = async () => {
    if (!clientInvite?.copyText) return;

    try {
      await navigator.clipboard.writeText(clientInvite.copyText);
      alert("ההודעה הועתקה");
    } catch {
      alert("לא הצלחתי להעתיק אוטומטית. אפשר להעתיק ידנית מהשדה.");
    }
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <MainCard title="שליחת קישור הרשמה ללקוח Invistimo" icon={<Link2 size={19} />}>
        <div className="rounded-[28px] border border-[#eadfce] bg-[#fffdf8] p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoLine label="אירוע" value={eventTitle} />
            <InfoLine label="אולם" value={hallName} />
            <InfoLine label="לקוח" value={clientName} />
            <InfoLine label="מזהה אירוע" value={eventId || "לא הוגדר"} />
          </div>
        </div>

        <div className="mt-5 rounded-[28px] border border-[#eadfce] bg-white p-5">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-[#4c3724]">
              בחירת תבנית הושבה שהאולם הכין מראש
            </span>

            <select
              value={selectedSeatingTemplateId}
              onChange={(event) => onSelectSeatingTemplate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#2b241c] outline-none focus:border-[#b98121]"
            >
              <option value="">בחרי תבנית הושבה</option>
              {seatingTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.tablesCount} שולחנות
                </option>
              ))}
            </select>
          </label>

          {!hallId && (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
              לא נמצא אולם משויך לאירוע. צריך לשייך את האירוע לאולם לפני שליחת קישור ללקוח.
            </div>
          )}

          {hallId && seatingTemplates.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-[#d9bd83] bg-[#fff8eb] p-4 text-sm font-bold leading-6 text-[#7f705d]">
              עדיין אין תבניות הושבה לאולם הזה. קודם צרי תבנית בדף תבניות ההושבה של האולם, ואז חזרי לכאן ושלחי קישור ללקוח.
            </div>
          )}

          {selectedTemplate && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <InfoPill label="תבנית" value={selectedTemplate.name} />
              <InfoPill label="שולחנות" value={`${selectedTemplate.tablesCount}`} />
              <InfoPill label="אולם" value={hallName} />
            </div>
          )}

          <div className="mt-5 rounded-2xl bg-[#fff8eb] p-4 text-sm font-bold leading-7 text-[#7f705d]">
            הקישור שיישלח ללקוח כולל את התבנית שבחרת כאן. לאחר הרשמה הלקוח יבחר חבילה:
            הושבה בלבד ללא תשלום, או חבילות בתשלום דרך Stripe.
          </div>

          {clientInviteError && (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-black text-rose-700">
              {clientInviteError}
            </div>
          )}

          <button
            type="button"
            onClick={onCreateInvite}
            disabled={loading || !hallId || !selectedSeatingTemplateId}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={17} />
            {loading ? "יוצר קישור..." : "צור קישור הרשמה ללקוח"}
          </button>
        </div>

        {clientInvite?.registrationLink && (
          <div className="mt-5 rounded-[28px] border border-emerald-100 bg-emerald-50 p-5">
            <div className="text-sm font-black text-emerald-700">
              קישור הרשמה נוצר בהצלחה
            </div>

            <div className="mt-3 break-all rounded-2xl border border-emerald-100 bg-white p-4 text-sm font-black leading-6 text-[#2b241c]">
              {clientInvite.registrationLink}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={copyLink}
                className="h-11 rounded-2xl border border-emerald-200 bg-white text-sm font-black text-emerald-700"
              >
                העתקת קישור
              </button>

              <button
                type="button"
                onClick={copyMessage}
                className="h-11 rounded-2xl bg-emerald-700 text-sm font-black text-white"
              >
                העתקת הודעה מלאה
              </button>
            </div>
          </div>
        )}
      </MainCard>

      <MainCard title="מה הלקוח יקבל?" icon={<Sparkles size={19} />}>
        <div className="space-y-3">
          <StatusLine label="הרשמה ל-User רגיל של Invistimo" done />
          <StatusLine label="בחירת חבילה מיוחדת ללקוחות אולם" done />
          <StatusLine label="פתיחה עם תבנית ההושבה שבחר האולם" done={Boolean(selectedTemplate)} />
          <StatusLine label="הושבה בלבד ללא תשלום נוסף" done />
          <StatusLine label="חבילות בתשלום עוברות ל-Stripe" done />
        </div>

        <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4 text-sm font-bold leading-7 text-[#7f705d]">
          אחרי שהלקוח יסיים הרשמה ובחירת חבילה, הוא ייכנס לדשבורד שלו. האולם יוכל לראות את ההתקדמות דרך האירוע המשויך.
        </div>
      </MainCard>
    </section>
  );
}

function EventMenuTab({
  eventId,
  hallId,
  assignedMenu,
  templates,
  onChooseMenu,
  onSendToCouple,
}: {
  eventId: string;
  hallId: string;
  assignedMenu: AssignedMenu | null;
  templates: VenueMenuTemplate[];
  onChooseMenu: () => void;
  onSendToCouple: () => void;
}) {
  if (!assignedMenu) {
    return (
      <MainCard title="תפריט האירוע" icon={<Utensils size={19} />}>
        <div className="rounded-[30px] border border-dashed border-[#d9bd83] bg-[#fff8eb] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-white text-[#b98121]">
            <Utensils size={32} />
          </div>

          <h2 className="mt-4 text-2xl font-black text-[#2b241c]">
            עדיין לא נבחר תפריט לאירוע
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#7f705d]">
            קודם האולם בונה תפריטים קבועים בניהול אולם. כאן בוחרים אחד מהם לאירוע
            הספציפי, נוצר עותק לאירוע, ואז שולחים קישור לבחירת מנות.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onChooseMenu}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
            >
              <Plus size={17} />
              בחר תפריט מתוך תפריטי האולם
            </button>

            <Link
              href={
                hallId
                  ? `/venues/dashboard/halls/${hallId}/menus`
                  : "/venues/dashboard"
              }
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-white px-6 text-sm font-black text-[#9f6f1a] transition hover:bg-[#fff8eb]"
            >
              <Utensils size={17} />
              ניהול תפריטי אולם
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4"
            >
              <div className="text-lg font-black text-[#2b241c]">
                {template.name}
              </div>
              <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">
                {template.description}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <InfoPill label="קטגוריות" value={`${template.categories}`} />
                <InfoPill label="מנות" value={`${template.dishes}`} />
              </div>
            </div>
          ))}
        </div>
      </MainCard>
    );
  }

  return (
    <>
      <section className="grid gap-5 xl:grid-cols-3">
        <MainCard title="תפריט משויך לאירוע" icon={<Utensils size={19} />}>
          <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4">
            <div className="text-xs font-black text-[#b98121]">
              עותק תפריט לאירוע
            </div>
            <h2 className="mt-1 text-2xl font-black text-[#2b241c]">
              {assignedMenu.name}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#7f705d]">
              זהו עותק של תפריט האולם לאירוע הזה בלבד.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <InfoPill
                label="נשלח"
                value={assignedMenu.sentToCouple ? "כן" : "לא"}
              />
              <InfoPill
                label="בחירה"
                value={assignedMenu.coupleSelected ? "הושלמה" : "ממתין"}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href={`/venues/dashboard/events/${eventId}/menus`}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              <Edit3 size={16} />
              עריכת תפריט האירוע
            </Link>

            <button
              type="button"
              onClick={onSendToCouple}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] text-sm font-black text-[#9f6f1a]"
            >
              <Send size={16} />
              שליחת קישור לבחירת מנות
            </button>
          </div>
        </MainCard>

        <MainCard title="קישור ציבורי" icon={<Link2 size={19} />}>
          <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
            <div className="text-xs font-black text-[#8a7b68]">
              קישור בחירת מנות
            </div>
            <div className="mt-2 break-all text-sm font-black leading-6 text-[#2b241c]">
              {`https://www.invistimo.com/menus/${eventId}/choose`}
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Link
              href={`/menus/${eventId}/choose`}
              target="_blank"
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252]"
            >
              <Eye size={16} />
              פתיחת תצוגה
            </Link>

            <button
              type="button"
              onClick={onSendToCouple}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              <Send size={16} />
              שליחה
            </button>
          </div>
        </MainCard>

        <MainCard title="סטטוס תפריט" icon={<CheckCircle2 size={19} />}>
          <div className="space-y-3">
            <StatusLine label="תפריט נבחר" done />
            <StatusLine
              label="קישור נשלח"
              done={assignedMenu.sentToCouple}
            />
            <StatusLine
              label="בחירת מנות הושלמה"
              done={assignedMenu.coupleSelected}
            />
            <StatusLine label="האולם אישר תפריט" done={assignedMenu.approved} />
          </div>
        </MainCard>
      </section>
    </>
  );
}

function StatusLine({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-3">
      <span className="text-sm font-black text-[#2b241c]">{label}</span>
      <span
        className={[
          "rounded-full px-3 py-1 text-xs font-black",
          done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
        ].join(" ")}
      >
        {done ? "בוצע" : "ממתין"}
      </span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-white px-3 py-2">
      <div className="text-[11px] font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#2b241c]">{value}</div>
    </div>
  );
}

function tabTitle(tab: string) {
  if (tab === "details") return "פרטי אירוע";
  if (tab === "client") return "לקוח";
  if (tab === "client-invite") return "פתיחת לקוח Invistimo";
  if (tab === "payments") return "תשלומים";
  if (tab === "menu") return "תפריט";
  if (tab === "seating") return "הושבה";
  if (tab === "rsvp") return "אישורי הגעה";
  if (tab === "staff") return "צוות וספקים";
  if (tab === "tasks") return "משימות";
  if (tab === "files") return "קבצים";
  return "סקירה כללית";
}

function HeroMetric({
  title,
  value,
  subtitle,
  icon,
  success,
  danger,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[26px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
      </div>

      <div className="mt-5 text-sm font-black text-[#8a7b68]">{title}</div>
      <div
        className={[
          "mt-1 text-2xl font-black",
          success ? "text-emerald-700" : danger ? "text-rose-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
      <div className="mt-1 text-xs font-bold text-[#9b8a73]">{subtitle}</div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "rose" | "gray" | "gold";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "rose"
          ? "bg-rose-50 text-rose-700"
          : tone === "gold"
            ? "bg-[#fff4dc] text-[#b98121]"
            : "bg-slate-100 text-slate-600";

  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-black ${toneClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function SideCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-base font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MainCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-lg font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function InfoLine({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <span
        className={[
          "text-sm font-black",
          danger ? "text-rose-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function FinanceMini({
  label,
  value,
  success,
  danger,
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={[
          "mt-2 text-lg font-black",
          success ? "text-emerald-700" : danger ? "text-rose-700" : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a7b68]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
        <div className="h-full rounded-full bg-[#b98121]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PaymentItem({ payment }: { payment: PaymentRow }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[#2b241c]">{payment.title}</div>
          <div className="mt-1 text-xs font-bold text-[#8a7b68]">
            {payment.dueDate} · {payment.note}
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${paymentStatusClass(
            payment.status
          )}`}
        >
          {paymentStatusLabel(payment.status)}
        </span>
      </div>
      <div className="mt-2 text-lg font-black text-[#2b241c]">
        {formatCurrency(payment.amount)}
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: TaskRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div>
        <div className="text-sm font-black text-[#2b241c]">{task.title}</div>
        <div className="mt-1 text-xs font-bold text-[#8a7b68]">{task.dueDate}</div>
      </div>
      <span
        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${taskStatusClass(
          task.status
        )}`}
      >
        {taskStatusLabel(task.status)}
      </span>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityRow }) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="text-sm font-black text-[#2b241c]">{activity.title}</div>
      <div className="mt-1 text-xs font-bold text-[#8a7b68]">{activity.date}</div>
      <div className="mt-2 text-xs font-bold leading-5 text-[#7f705d]">
        {activity.description}
      </div>
    </div>
  );
}

function FileItem({ file }: { file: FileRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#b98121]">
          <FileText size={18} />
        </div>
        <div>
          <div className="text-sm font-black text-[#2b241c]">{file.title}</div>
          <div className="mt-1 text-xs font-bold text-[#8a7b68]">
            {file.date} · {file.size}
          </div>
        </div>
      </div>
      <button type="button" className="text-sm font-black text-[#b98121]">
        פתיחה
      </button>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-12 items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
    >
      {icon}
      {label}
    </button>
  );
}

function InputEdit({
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9bd83] bg-[#fffaf0] p-4 text-center text-sm font-bold leading-6 text-[#7f705d]">
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