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

type PaymentStatus = "paid" | "partial" | "unpaid";

type VenueEventStatus =
  | "lead"
  | "proposal"
  | "closed"
  | "confirmed"
  | "preparing"
  | "live"
  | "done"
  | "cancelled";

type VenueEvent = {
  id: string;
  _id?: string;

  ownerId?: string;
  hallId: string;
  hallName?: string;

  title: string;
  eventType: string;

  clientName: string;
  clientPhone?: string;
  clientEmail?: string;

  date: string;
  startTime: string;
  endTime: string;

  guests: number;
  status: VenueEventStatus;

  budget?: number;
  paidAmount?: number;

  notes?: string;
  color?: string;

  createdAt?: string;
  updatedAt?: string;
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
  status: PaymentStatus;
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

type EventEditForm = {
  title: string;
  eventType: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: string;
  status: VenueEventStatus;
  budget: string;
  paidAmount: string;
  notes: string;
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

function statusLabel(status?: VenueEventStatus) {
  if (status === "lead") return "ליד";
  if (status === "proposal") return "בהצעה";
  if (status === "closed") return "סגור";
  if (status === "confirmed") return "מאושר";
  if (status === "preparing") return "בהכנות";
  if (status === "live") return "פעיל עכשיו";
  if (status === "done") return "הסתיים";
  if (status === "cancelled") return "בוטל";
  return "מאושר";
}

function statusTone(status?: VenueEventStatus): "green" | "amber" | "rose" | "gray" | "gold" {
  if (status === "cancelled") return "rose";
  if (status === "lead" || status === "proposal") return "amber";
  if (status === "closed") return "gold";
  if (status === "done") return "gray";
  return "green";
}

function paymentStatusLabel(status: PaymentStatus) {
  if (status === "paid") return "שולם";
  if (status === "partial") return "חלקי";
  return "פתוח";
}

function paymentStatusClass(status: PaymentStatus) {
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

  const [eventData, setEventData] = useState<VenueEvent | null>(null);
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

  const hallId = eventData?.hallId || "";
  const hallName = hallData?.name || eventData?.hallName || "אולם";
  const clientName = eventData?.clientName || "לא הוגדר";
  const eventTitle = eventData?.title || "אירוע ללא שם";

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
    } catch (error) {
      console.error("GET event details failed:", error);
      setServerError(
        error instanceof Error ? error.message : "טעינת פרטי האירוע נכשלה"
      );
      setEventData(null);
      setHallData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const financial = useMemo(() => {
    const commitment = toNumber(eventData?.budget, 0);
    const totalPaid = toNumber(eventData?.paidAmount, 0);
    const deposit = totalPaid;
    const estimatedBalance = Math.max(0, commitment - totalPaid);
    const nextPayment = estimatedBalance;
    const expectedAfterEvent = estimatedBalance;
    const paidPercentage =
      commitment > 0 ? Math.round((totalPaid / commitment) * 100) : 0;

    return {
      commitment,
      deposit,
      totalPaid,
      estimatedBalance,
      nextPayment,
      expectedAfterEvent,
      paidPercentage,
    };
  }, [eventData]);

  const payments = useMemo<PaymentRow[]>(() => {
    if (!eventData) return [];

    const rows: PaymentRow[] = [];

    if (financial.totalPaid > 0) {
      rows.push({
        id: "paid",
        title: "שולם עד כה",
        amount: financial.totalPaid,
        dueDate: formatDate(eventData.date),
        status: financial.estimatedBalance > 0 ? "partial" : "paid",
        note: "עודכן מפרטי האירוע",
      });
    }

    if (financial.estimatedBalance > 0) {
      rows.push({
        id: "balance",
        title: "יתרה לתשלום",
        amount: financial.estimatedBalance,
        dueDate: "טרם נקבע",
        status: "unpaid",
        note: "לפי מחיר האירוע פחות שולם עד כה",
      });
    }

    return rows;
  }, [eventData, financial]);

  const tasks = useMemo<TaskRow[]>(() => {
    return [];
  }, []);

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
        description: "האירוע נשמר ביומן האולם.",
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
  }, [eventData]);

  const progress = useMemo(() => {
    const hasPayment = financial.commitment > 0;
    const hasPaid = financial.totalPaid > 0;

    return {
      payments: hasPayment ? Math.min(100, financial.paidPercentage) : 0,
      seating: 0,
      menu: assignedMenu ? 65 : 0,
      production: eventData?.status === "done" ? 100 : eventData?.status === "live" ? 85 : 35,
      total: Math.round(
        ((hasPayment ? Math.min(100, financial.paidPercentage) : 0) +
          (assignedMenu ? 65 : 0) +
          (eventData?.status === "done" ? 100 : eventData?.status === "live" ? 85 : 35)) /
          3
      ),
    };
  }, [assignedMenu, eventData, financial]);

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
          clientName: form.clientName,
          clientPhone: form.clientPhone,
          clientEmail: form.clientEmail,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          guests: toNumber(form.guests, 0),
          status: form.status,
          budget: toNumber(form.budget, 0),
          paidAmount: toNumber(form.paidAmount, 0),
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

      setEditOpen(false);
    } catch (error) {
      console.error("PATCH event details failed:", error);
      setServerError(error instanceof Error ? error.message : "עדכון האירוע נכשל");
    } finally {
      setSavingEvent(false);
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
                      {statusLabel(eventData.status)}
                    </span>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      לא הושלמה הושבה
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-bold text-[#7f705d]">
                    <span>{formatDate(eventData.date)}</span>
                    <span>•</span>
                    <span>
                      {eventData.startTime || "לא הוגדר"} -{" "}
                      {eventData.endTime || "לא הוגדר"}
                    </span>
                    <span>•</span>
                    <span>{hallName}</span>
                    <span>•</span>
                    <span>{eventData.guests || 0} אורחים</span>
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
            title="התחייבות"
            value={formatCurrency(financial.commitment)}
            subtitle="סך מחיר האירוע"
            icon={<CircleDollarSign size={22} />}
          />

          <HeroMetric
            title="שולם עד כה"
            value={formatCurrency(financial.totalPaid)}
            subtitle={
              financial.totalPaid > 0
                ? "לפי הנתון שנשמר באירוע"
                : "לא עודכן תשלום"
            }
            icon={<WalletCards size={22} />}
            success={financial.totalPaid > 0}
          />

          <HeroMetric
            title="אחוז תשלום"
            value={`${financial.paidPercentage}%`}
            subtitle="מתוך ההתחייבות"
            icon={<CreditCard size={22} />}
          />

          <HeroMetric
            title="יתרת תשלום משוערת"
            value={formatCurrency(financial.estimatedBalance)}
            subtitle="לפי מחיר פחות שולם"
            icon={<Receipt size={22} />}
            danger={financial.estimatedBalance > 0}
          />

          <HeroMetric
            title="תשלום הבא"
            value={formatCurrency(financial.nextPayment)}
            subtitle="טרם נקבע מועד תשלום"
            icon={<CalendarDays size={22} />}
          />
        </section>

        <section className="mt-5 rounded-[30px] border border-[#eadfce] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-6">
            <StatusTile
              label="סטטוס אירוע"
              value={statusLabel(eventData.status)}
              tone={statusTone(eventData.status)}
            />
            <StatusTile label="סטטוס הושבה" value="לא הושלמה" tone="amber" />
            <StatusTile
              label="סטטוס תפריט"
              value={assignedMenu ? "תפריט נבחר" : "חסר תפריט"}
              tone={assignedMenu ? "green" : "rose"}
            />
            <StatusTile
              label="סטטוס תשלום"
              value={financial.estimatedBalance > 0 ? "פתוח" : "שולם"}
              tone={financial.estimatedBalance > 0 ? "amber" : "green"}
            />
            <StatusTile label="אישורי הגעה" value="לא הופעל" tone="gray" />
            <StatusTile label="מנהל אירוע" value="לא הוגדר" tone="gold" />
          </div>
        </section>

        <nav className="mt-5 overflow-x-auto rounded-[26px] border border-[#eadfce] bg-white shadow-sm">
          <div className="flex min-w-[1150px]">
            {[
              { id: "overview", label: "סקירה כללית", icon: Sparkles },
              { id: "details", label: "פרטי אירוע", icon: CalendarDays },
              { id: "client", label: "לקוח וחוזה", icon: UsersRound },
              { id: "payments", label: "תשלומים", icon: CreditCard },
              { id: "menu", label: "תפריט", icon: Utensils },
              { id: "seating", label: "הושבה", icon: UsersRound },
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
                    label: "פרטי אירוע",
                    date: eventData.title ? "הוזנו" : "חסר",
                    done: Boolean(eventData.title),
                  },
                  {
                    label: "פרטי לקוח",
                    date: eventData.clientName ? eventData.clientName : "חסר",
                    done: Boolean(eventData.clientName),
                  },
                  {
                    label: "מחיר אירוע",
                    date:
                      financial.commitment > 0
                        ? formatCurrency(financial.commitment)
                        : "טרם הוזן",
                    done: financial.commitment > 0,
                  },
                  {
                    label: "בחירת תפריט",
                    date: assignedMenu ? assignedMenu.name : "טרם נבחר",
                    done: Boolean(assignedMenu),
                  },
                  { label: "סגירת הושבה", date: "טרם בוצע", done: false },
                  { label: "הפקת אירוע", date: "יום האירוע", done: false },
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
                <InfoLine label="שם לקוח" value={clientName} />
                <InfoLine
                  label="טלפון"
                  value={eventData.clientPhone || "לא הוגדר"}
                />
                <InfoLine
                  label="אימייל"
                  value={eventData.clientEmail || "לא הוגדר"}
                />
                <InfoLine label="מקור" value="יומן אולם" />
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
                  label="התחייבות"
                  value={formatCurrency(financial.commitment)}
                />
                <InfoLine
                  label="שולם"
                  value={formatCurrency(financial.totalPaid)}
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
                ניהול תשלומים
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
                        value={eventData.eventType || "לא הוגדר"}
                      />
                      <InfoLine label="אולם" value={hallName} />
                      <InfoLine label="תאריך" value={formatDate(eventData.date)} />
                      <InfoLine
                        label="שעה"
                        value={`${eventData.startTime || "לא הוגדר"} - ${
                          eventData.endTime || "לא הוגדר"
                        }`}
                      />
                      <InfoLine
                        label="כמות אורחים"
                        value={`${eventData.guests || 0}`}
                      />
                      <InfoLine label="מנהל אירוע" value="לא הוגדר" />
                    </div>
                  </MainCard>

                  <MainCard title="סיכום פיננסי מורחב" icon={<Receipt size={19} />}>
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceMini
                        label="התחייבות"
                        value={formatCurrency(financial.commitment)}
                      />
                      <FinanceMini
                        label="שולם עד כה"
                        value={formatCurrency(financial.totalPaid)}
                        success={financial.totalPaid > 0}
                      />
                      <FinanceMini
                        label="יתרה משוערת"
                        value={formatCurrency(financial.estimatedBalance)}
                        danger={financial.estimatedBalance > 0}
                      />
                      <FinanceMini
                        label="תשלום הבא"
                        value={formatCurrency(financial.nextPayment)}
                      />
                      <FinanceMini
                        label="לאחר אירוע"
                        value={formatCurrency(financial.expectedAfterEvent)}
                        danger={financial.expectedAfterEvent > 0}
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
                      הוספת הערה
                    </button>
                  </MainCard>
                </section>

                <section className="grid gap-5 xl:grid-cols-3">
                  <MainCard title="תשלומים אחרונים" icon={<CreditCard size={19} />}>
                    <div className="space-y-3">
                      {payments.length ? (
                        payments.map((payment) => (
                          <PaymentItem key={payment.id} payment={payment} />
                        ))
                      ) : (
                        <EmptyBox text="עדיין לא עודכנו תשלומים לאירוע הזה." />
                      )}
                    </div>
                  </MainCard>

                  <MainCard title="משימות פתוחות" icon={<CheckCircle2 size={19} />}>
                    <div className="space-y-3">
                      {tasks.length ? (
                        tasks.map((task) => <TaskItem key={task.id} task={task} />)
                      ) : (
                        <EmptyBox text="עדיין אין משימות פתוחות לאירוע הזה." />
                      )}
                    </div>
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
                          הערה מתוך פרטי האירוע
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
                      הוספת הערה חדשה
                    </button>
                  </MainCard>
                </section>
              </>
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

            {activeTab !== "overview" && activeTab !== "menu" && (
              <MainCard title={tabTitle(activeTab)} icon={<Sparkles size={19} />}>
                <div className="rounded-3xl border border-dashed border-[#d9bd83] bg-[#fffaf0] p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#b98121]">
                    <Sparkles size={26} />
                  </div>
                  <h2 className="mt-4 text-xl font-black text-[#2b241c]">
                    {tabTitle(activeTab)}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7f705d]">
                    כאן ייכנס המסך המלא של הטאב הזה: טבלאות, עריכה, פעולות,
                    קבצים, תשלומים או חיבור לאישורי הגעה והושבה לפי החבילה.
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
              label="התחייבות"
              value={formatCurrency(financial.commitment)}
            />
            <InfoLine
              label="שולם עד כה"
              value={formatCurrency(financial.totalPaid)}
            />
            <InfoLine
              label="יתרת תשלום משוערת"
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
              עדכון סכומים
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
            כאן בוחרים תפריט מתוך תפריטי האולם. לאחר הבחירה ייווצר עותק לאירוע הזה בלבד,
            כדי ששינויים עתידיים בתפריטי האולם לא ישנו אירועים שכבר נסגרו.
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
              defaultValue={`שלום ${clientName}, מצורף קישור לבחירת מנות לאירוע שלכם: https://www.invistimo.com/menus/${eventId}/choose`}
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
  event: VenueEvent;
  saving: boolean;
  onClose: () => void;
  onSave: (form: EventEditForm) => void;
}) {
  const [form, setForm] = useState<EventEditForm>({
    title: event.title || "",
    eventType: event.eventType || "",
    clientName: event.clientName || "",
    clientPhone: event.clientPhone || "",
    clientEmail: event.clientEmail || "",
    date: event.date || "",
    startTime: event.startTime || "",
    endTime: event.endTime || "",
    guests: event.guests ? String(event.guests) : "",
    status: event.status || "confirmed",
    budget: event.budget ? String(event.budget) : "",
    paidAmount: event.paidAmount ? String(event.paidAmount) : "",
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

    if (!form.startTime) {
      alert("חובה להזין שעת התחלה");
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
          <InputEdit
            label="סוג אירוע"
            value={form.eventType}
            onChange={(value) => updateField("eventType", value)}
          />
          <InputEdit
            label="שם לקוח"
            value={form.clientName}
            onChange={(value) => updateField("clientName", value)}
          />
          <InputEdit
            label="טלפון לקוח"
            value={form.clientPhone}
            onChange={(value) => updateField("clientPhone", value)}
          />
          <InputEdit
            label="אימייל לקוח"
            value={form.clientEmail}
            onChange={(value) => updateField("clientEmail", value)}
          />
          <InputEdit
            label="תאריך"
            type="date"
            value={form.date}
            onChange={(value) => updateField("date", value)}
          />
          <InputEdit
            label="שעת התחלה"
            type="time"
            value={form.startTime}
            onChange={(value) => updateField("startTime", value)}
          />
          <InputEdit
            label="שעת סיום"
            type="time"
            value={form.endTime}
            onChange={(value) => updateField("endTime", value)}
          />
          <InputEdit
            label="כמות אורחים"
            type="number"
            value={form.guests}
            onChange={(value) => updateField("guests", value)}
          />
          <InputEdit
            label="תקציב / מחיר אירוע"
            type="number"
            value={form.budget}
            onChange={(value) => updateField("budget", value)}
          />
          <InputEdit
            label="שולם עד כה"
            type="number"
            value={form.paidAmount}
            onChange={(value) => updateField("paidAmount", value)}
          />

          <label>
            <span className="mb-1 block text-xs font-black text-[#8a7b68]">
              סטטוס
            </span>
            <select
              value={form.status}
              onChange={(event) =>
                updateField("status", event.target.value as VenueEventStatus)
              }
              className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-bold text-[#2b241c] outline-none focus:border-[#b98121]"
            >
              <option value="lead">ליד</option>
              <option value="proposal">בהצעה</option>
              <option value="closed">סגור</option>
              <option value="confirmed">מאושר</option>
              <option value="preparing">בהכנות</option>
              <option value="live">פעיל עכשיו</option>
              <option value="done">הסתיים</option>
              <option value="cancelled">בוטל</option>
            </select>
          </label>

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
            הספציפי, נוצר עותק לאירוע, ואז שולחים לזוג קישור לבחירת מנות.
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
              זהו עותק של תפריט האולם לאירוע הזה בלבד. אפשר לערוך אותו בלי לשנות את
              תפריט המקור של האולם.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <InfoPill
                label="נשלח לזוג"
                value={assignedMenu.sentToCouple ? "כן" : "לא"}
              />
              <InfoPill
                label="בחירת זוג"
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

        <MainCard title="קישור ציבורי לזוג" icon={<Link2 size={19} />}>
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
              פתיחת תצוגת זוג
            </Link>

            <button
              type="button"
              onClick={onSendToCouple}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#b98121] text-sm font-black text-white"
            >
              <Send size={16} />
              שליחה לזוג
            </button>
          </div>
        </MainCard>

        <MainCard title="סטטוס תפריט" icon={<CheckCircle2 size={19} />}>
          <div className="space-y-3">
            <StatusLine label="תפריט נבחר" done />
            <StatusLine
              label="קישור נשלח לזוג"
              done={assignedMenu.sentToCouple}
            />
            <StatusLine
              label="הזוג בחר מנות"
              done={assignedMenu.coupleSelected}
            />
            <StatusLine label="האולם אישר תפריט" done={assignedMenu.approved} />
          </div>
        </MainCard>
      </section>

      <MainCard title="איך הזרימה עובדת" icon={<Sparkles size={19} />}>
        <div className="grid gap-4 md:grid-cols-4">
          <FlowStep
            number="1"
            title="תפריטי אולם"
            text="האולם בונה תפריטים קבועים בניהול אולם."
          />
          <FlowStep
            number="2"
            title="בחירת תפריט"
            text="באירוע בוחרים תפריט אחד מתוך תפריטי האולם."
          />
          <FlowStep
            number="3"
            title="שליחה לזוג"
            text="שולחים לזוג קישור בחירת מנות מתוך תפריט האירוע."
          />
          <FlowStep
            number="4"
            title="עדכון האירוע"
            text="בחירת הזוג מתעדכנת בתפריט האירוע הספציפי."
          />
        </div>
      </MainCard>
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

function FlowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#b98121] text-sm font-black text-white">
        {number}
      </div>
      <div className="mt-4 text-base font-black text-[#2b241c]">{title}</div>
      <p className="mt-2 text-sm font-bold leading-6 text-[#7f705d]">{text}</p>
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
  if (tab === "client") return "לקוח וחוזה";
  if (tab === "payments") return "תשלומים";
  if (tab === "menu") return "תפריט";
  if (tab === "seating") return "הושבה";
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