"use client";

import React, { useMemo, useState } from "react";
import SoftphoneStatusPanel from "@/app/components/staff/SoftphoneStatusPanel";

type UserRole = "client" | "employee" | "admin" | "producer";
type UserStatus = "active" | "pending" | "blocked";

type AppUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  lastActivity: string;
  avatar?: string;
};

type CareStatus = "ok" | "check" | "urgent";
type EventProgress =
  | "new"
  | "in_progress"
  | "waiting_client"
  | "ready"
  | "completed";

type ManagedEvent = {
  id: string;
  title: string;
  clientName: string;
  clientPhone: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestsCount: number;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  progress: EventProgress;
  careStatus: CareStatus;
  unreadMessages: number;
  lastMessage: string;
  lastMessageAt: string;
  notes: string;
};

type FollowUpTask = {
  id: string;
  title: string;
  clientName: string;
  eventName: string;
  priority: CareStatus;
  dueText: string;
};

const currentEmployeeId = "emp_1";

const usersMock: AppUser[] = [
  {
    id: "u_1",
    name: "נועה לוי",
    email: "noa@example.com",
    phone: "050-1111111",
    role: "client",
    status: "active",
    joinedAt: "01/06/2026",
    lastActivity: "לפני 12 דקות",
  },
  {
    id: "u_2",
    name: "דניאל כהן",
    email: "daniel@example.com",
    phone: "052-2222222",
    role: "client",
    status: "pending",
    joinedAt: "30/05/2026",
    lastActivity: "לפני שעה",
  },
  {
    id: "u_3",
    name: "מאיה עובדיה",
    email: "maya@invistimo.com",
    phone: "054-3333333",
    role: "employee",
    status: "active",
    joinedAt: "20/05/2026",
    lastActivity: "פעילה עכשיו",
  },
  {
    id: "u_4",
    name: "אורן מפיק אירועים",
    email: "oren@example.com",
    phone: "053-4444444",
    role: "producer",
    status: "active",
    joinedAt: "18/05/2026",
    lastActivity: "אתמול",
  },
  {
    id: "u_5",
    name: "רונית שפירא",
    email: "ronit@example.com",
    phone: "054-4567890",
    role: "client",
    status: "active",
    joinedAt: "12/05/2026",
    lastActivity: "לפני 4 שעות",
  },
];

const eventsMock: ManagedEvent[] = [
  {
    id: "ev_1",
    title: "חתונה - נועה ודניאל",
    clientName: "נועה לוי",
    clientPhone: "050-1111111",
    eventType: "חתונה",
    eventDate: "24/08/2026",
    location: "אולם קיסריה",
    guestsCount: 380,
    assignedEmployeeId: "emp_1",
    assignedEmployeeName: "הדר",
    progress: "in_progress",
    careStatus: "check",
    unreadMessages: 4,
    lastMessage: "הלקוחה שאלה אם אפשר לעדכן מספר שולחן למשפחה.",
    lastMessageAt: "לפני 9 דקות",
    notes: "לוודא שהלקוחה מסתדרת עם אישורי הגעה וסידורי הושבה.",
  },
  {
    id: "ev_2",
    title: "בר מצווה - משפחת אדרי",
    clientName: "שלומי אדרי",
    clientPhone: "052-5555555",
    eventType: "בר מצווה",
    eventDate: "12/09/2026",
    location: "אולמי בראשית",
    guestsCount: 220,
    assignedEmployeeId: "emp_1",
    assignedEmployeeName: "הדר",
    progress: "waiting_client",
    careStatus: "urgent",
    unreadMessages: 8,
    lastMessage: "הלקוח לא מצליח לשלוח הודעת וואטסאפ לאורחים.",
    lastMessageAt: "לפני 3 דקות",
    notes: "דחוף לבדוק תבנית וואטסאפ והרשאות שליחה.",
  },
  {
    id: "ev_3",
    title: "חינה - משפחת ביטון",
    clientName: "מור ביטון",
    clientPhone: "054-7777777",
    eventType: "חינה",
    eventDate: "02/10/2026",
    location: "בית פרטי",
    guestsCount: 140,
    assignedEmployeeId: "emp_1",
    assignedEmployeeName: "הדר",
    progress: "ready",
    careStatus: "ok",
    unreadMessages: 0,
    lastMessage: "הכול מוכן, הלקוחה אישרה את רשימת האורחים.",
    lastMessageAt: "לפני שעתיים",
    notes: "רק לעקוב יום לפני האירוע.",
  },
  {
    id: "ev_4",
    title: "אירוע חברה - א.ב. ניסים",
    clientName: "אבי ניסים",
    clientPhone: "052-9876543",
    eventType: "אירוע חברה",
    eventDate: "18/11/2026",
    location: "גני תל אביב",
    guestsCount: 520,
    assignedEmployeeId: "emp_1",
    assignedEmployeeName: "הדר",
    progress: "new",
    careStatus: "check",
    unreadMessages: 2,
    lastMessage: "הלקוח ביקש להבין איך מעלים קובץ אקסל.",
    lastMessageAt: "לפני 28 דקות",
    notes: "להיכנס ללקוח ולבדוק שהייבוא תקין.",
  },
];

const followUpTasksMock: FollowUpTask[] = [
  {
    id: "t_1",
    title: "לבדוק למה הודעות וואטסאפ לא נשלחות",
    clientName: "שלומי אדרי",
    eventName: "בר מצווה - משפחת אדרי",
    priority: "urgent",
    dueText: "עכשיו",
  },
  {
    id: "t_2",
    title: "לוודא שהלקוחה הסתדרה עם סידורי ההושבה",
    clientName: "נועה לוי",
    eventName: "חתונה - נועה ודניאל",
    priority: "check",
    dueText: "היום",
  },
  {
    id: "t_3",
    title: "להיכנס לחשבון הלקוח ולבדוק ייבוא אורחים",
    clientName: "אבי ניסים",
    eventName: "אירוע חברה - א.ב. ניסים",
    priority: "check",
    dueText: "עד 16:00",
  },
];

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name:
    | "search"
    | "users"
    | "calendar"
    | "message"
    | "warning"
    | "check"
    | "phone"
    | "arrow"
    | "spark"
    | "clock"
    | "user"
    | "activity"
    | "open"
    | "shield";
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M17 21a5 5 0 0 0-10 0" />
        <circle cx="12" cy="7" r="4" />
        <path d="M22 21a4 4 0 0 0-3-3.87" />
        <path d="M2 21a4 4 0 0 1 3-3.87" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="4" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...common}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    );
  }

  if (name === "warning") {
    return (
      <svg {...common}>
        <path d="m12 3 10 18H2L12 3z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 3.1 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L9 10.7a16 16 0 0 0 4.3 4.3l1.25-1.25a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2L12 3z" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "activity") {
    return (
      <svg {...common}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    );
  }

  if (name === "open") {
    return (
      <svg {...common}>
        <path d="M14 3h7v7" />
        <path d="M10 14 21 3" />
        <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function roleLabel(role: UserRole) {
  switch (role) {
    case "client":
      return "לקוח";
    case "employee":
      return "עובד";
    case "admin":
      return "אדמין";
    case "producer":
      return "מפיק";
    default:
      return role;
  }
}

function statusLabel(status: UserStatus) {
  switch (status) {
    case "active":
      return "פעיל";
    case "pending":
      return "ממתין";
    case "blocked":
      return "חסום";
    default:
      return status;
  }
}

function progressLabel(progress: EventProgress) {
  switch (progress) {
    case "new":
      return "חדש";
    case "in_progress":
      return "בטיפול";
    case "waiting_client":
      return "ממתין ללקוח";
    case "ready":
      return "מוכן";
    case "completed":
      return "הושלם";
    default:
      return progress;
  }
}

function careStatusLabel(status: CareStatus) {
  switch (status) {
    case "ok":
      return "הכול תקין";
    case "check":
      return "דורש בדיקה";
    case "urgent":
      return "דחוף";
    default:
      return status;
  }
}

function careStatusClass(status: CareStatus) {
  switch (status) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "check":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "urgent":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function userStatusClass(status: UserStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "blocked":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone = "dark",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  tone?: "dark" | "purple" | "green" | "amber";
}) {
  const toneClass =
    tone === "purple"
      ? "from-violet-600 to-fuchsia-600"
      : tone === "green"
      ? "from-emerald-500 to-teal-600"
      : tone === "amber"
      ? "from-amber-400 to-orange-500"
      : "from-slate-950 to-slate-800";

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className={`absolute -left-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${toneClass} opacity-10 blur-2xl transition group-hover:opacity-20`} />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-400">{subtitle}</p>
        </div>

        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass} text-white shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-[360px]">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:shadow-sm"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
        <Icon name="search" className="h-5 w-5" />
      </span>
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-500 shadow-sm">
        <Icon name="search" className="h-6 w-6" />
      </div>
      <p className="mt-4 text-lg font-black text-slate-800">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-500">{subtitle}</p>
    </div>
  );
}

export default function EmployeeDashboardPage() {
  const [userSearch, setUserSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  const myEvents = useMemo(() => {
    return eventsMock.filter(
      (event) => event.assignedEmployeeId === currentEmployeeId
    );
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();

    if (!q) return usersMock;

    return usersMock.filter((user) => {
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phone.toLowerCase().includes(q) ||
        roleLabel(user.role).toLowerCase().includes(q) ||
        statusLabel(user.status).toLowerCase().includes(q)
      );
    });
  }, [userSearch]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();

    if (!q) return myEvents;

    return myEvents.filter((event) => {
      return (
        event.title.toLowerCase().includes(q) ||
        event.clientName.toLowerCase().includes(q) ||
        event.clientPhone.toLowerCase().includes(q) ||
        event.eventType.toLowerCase().includes(q) ||
        event.location.toLowerCase().includes(q) ||
        careStatusLabel(event.careStatus).toLowerCase().includes(q)
      );
    });
  }, [eventSearch, myEvents]);

  const urgentEvents = myEvents.filter((event) => event.careStatus === "urgent");
  const eventsNeedCheck = myEvents.filter(
    (event) => event.careStatus === "urgent" || event.careStatus === "check"
  );
  const unreadMessages = myEvents.reduce(
    (sum, event) => sum + event.unreadMessages,
    0
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#F5F7FB] text-slate-950 lg:pl-[380px]">
      <SoftphoneStatusPanel />

      <main className="min-h-screen">
        <section className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[36px] bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(139,92,246,0.35),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(16,185,129,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_35%)]" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white">
                  <Icon name="shield" className="h-4 w-4" />
                  דשבורד עובדים
                </span>

                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                  היי הדר, בוקר טוב 👋
                </h1>

                <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-300">
                  כאן העובד רואה את הלקוחות, האירועים שבטיפול האישי שלו, השיחות שדורשות בדיקה,
                  ונכנס לחשבון הלקוח כדי לבצע פעולות לפי הצורך.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black text-slate-300">משתמשים</p>
                  <p className="mt-2 text-3xl font-black">{usersMock.length}</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black text-slate-300">אירועים שלי</p>
                  <p className="mt-2 text-3xl font-black">{myEvents.length}</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black text-slate-300">דורש בדיקה</p>
                  <p className="mt-2 text-3xl font-black">{eventsNeedCheck.length}</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black text-slate-300">הודעות פתוחות</p>
                  <p className="mt-2 text-3xl font-black">{unreadMessages}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="אירועים בטיפול אישי"
              value={myEvents.length}
              subtitle="אירועים שהוקצו לעובד"
              icon={<Icon name="calendar" className="h-6 w-6" />}
              tone="purple"
            />

            <StatCard
              title="לקוחות שצריך לבדוק"
              value={eventsNeedCheck.length}
              subtitle="דורש מעקב אנושי"
              icon={<Icon name="warning" className="h-6 w-6" />}
              tone="amber"
            />

            <StatCard
              title="הודעות לא נקראו"
              value={unreadMessages}
              subtitle="מתוך אירועים בטיפול"
              icon={<Icon name="message" className="h-6 w-6" />}
              tone="dark"
            />

            <StatCard
              title="משתמשים פעילים"
              value={usersMock.filter((user) => user.status === "active").length}
              subtitle="במערכת כרגע"
              icon={<Icon name="users" className="h-6 w-6" />}
              tone="green"
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                title="אירועים בטיפול שלי"
                subtitle="אירועים שהעובד אחראי לבדוק אישית, כולל כניסה ללקוח וביצוע פעולות."
                action={
                  <SearchBox
                    value={eventSearch}
                    onChange={setEventSearch}
                    placeholder="חיפוש אירוע, לקוח, טלפון, מיקום..."
                  />
                }
              />

              <div className="mt-5 space-y-3">
                {filteredEvents.map((event) => (
                  <article
                    key={event.id}
                    className="group rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${careStatusClass(
                              event.careStatus
                            )}`}
                          >
                            {careStatusLabel(event.careStatus)}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {progressLabel(event.progress)}
                          </span>

                          {event.unreadMessages > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                              <Icon name="message" className="h-3.5 w-3.5" />
                              {event.unreadMessages} הודעות
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                            {initials(event.clientName)}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-xl font-black text-slate-950">
                              {event.title}
                            </h3>

                            <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                              <span>לקוח: <b className="text-slate-950">{event.clientName}</b></span>
                              <span dir="ltr" className="text-right sm:text-left">{event.clientPhone}</span>
                              <span>תאריך: <b className="text-slate-950">{event.eventDate}</b></span>
                              <span>מיקום: <b className="text-slate-950">{event.location}</b></span>
                              <span>סוג: <b className="text-slate-950">{event.eventType}</b></span>
                              <span>מוזמנים: <b className="text-slate-950">{event.guestsCount}</b></span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-3xl bg-slate-50 p-4">
                            <p className="flex items-center gap-2 text-xs font-black text-slate-400">
                              <Icon name="message" className="h-4 w-4" />
                              הודעה אחרונה
                            </p>
                            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                              {event.lastMessage}
                            </p>
                            <p className="mt-2 text-xs font-black text-slate-400">
                              {event.lastMessageAt}
                            </p>
                          </div>

                          <div className="rounded-3xl border border-dashed border-slate-200 p-4">
                            <p className="flex items-center gap-2 text-xs font-black text-slate-400">
                              <Icon name="activity" className="h-4 w-4" />
                              הערת טיפול
                            </p>
                            <p className="mt-2 text-sm font-bold leading-6 text-slate-700">
                              {event.notes}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-[172px] lg:grid-cols-1">
                        <button className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-black">
                          כניסה ללקוח
                        </button>

                        <button className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                          פתח שיחה
                        </button>

                        <button className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">
                          פעולות
                        </button>

                        <button className="h-11 rounded-2xl bg-emerald-50 px-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100">
                          סמן כטופל
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {filteredEvents.length === 0 && (
                  <EmptyState
                    title="לא נמצאו אירועים"
                    subtitle="נסי לחפש לפי שם לקוח, טלפון, סוג אירוע, מיקום או סטטוס."
                  />
                )}
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeader
                  title="משימות מעקב"
                  subtitle="מה שהעובד צריך לוודא שהלקוח מסתדר איתו."
                />

                <div className="mt-5 space-y-3">
                  {followUpTasksMock.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${careStatusClass(
                            task.priority
                          )}`}
                        >
                          {careStatusLabel(task.priority)}
                        </span>

                        <div className="min-w-0 text-right">
                          <h3 className="text-base font-black text-slate-950">
                            {task.title}
                          </h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {task.clientName} · {task.eventName}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs font-black text-slate-400">
                          <Icon name="clock" className="h-4 w-4" />
                          {task.dueText}
                        </span>

                        <button className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-black">
                          טיפול
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeader
                  title="לקוחות שדורשים בדיקה"
                  subtitle="לקוח עם הודעות פתוחות או תקלה בתהליך."
                />

                <div className="mt-5 space-y-3">
                  {eventsNeedCheck.map((event) => (
                    <button
                      key={event.id}
                      className="flex w-full items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-3 text-right transition hover:bg-white hover:shadow-md"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950 shadow-sm">
                        {initials(event.clientName)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${careStatusClass(
                              event.careStatus
                            )}`}
                          >
                            {careStatusLabel(event.careStatus)}
                          </span>
                          <p className="truncate text-sm font-black text-slate-950">
                            {event.clientName}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs font-bold text-slate-500">
                          {event.lastMessage}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <section className="mt-6 rounded-[34px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
              title="כל המשתמשים"
              subtitle="חיפוש מהיר לפי שם, מייל, טלפון, סוג משתמש או סטטוס."
              action={
                <SearchBox
                  value={userSearch}
                  onChange={setUserSearch}
                  placeholder="חיפוש משתמש..."
                />
              }
            />

            <div className="mt-5 hidden overflow-hidden rounded-[28px] border border-slate-200 lg:block">
              <table className="w-full border-collapse bg-white text-right">
                <thead className="bg-slate-50">
                  <tr className="text-sm text-slate-500">
                    <th className="px-5 py-4 font-black">משתמש</th>
                    <th className="px-5 py-4 font-black">מייל</th>
                    <th className="px-5 py-4 font-black">טלפון</th>
                    <th className="px-5 py-4 font-black">סוג</th>
                    <th className="px-5 py-4 font-black">סטטוס</th>
                    <th className="px-5 py-4 font-black">הצטרף</th>
                    <th className="px-5 py-4 font-black">פעילות אחרונה</th>
                    <th className="px-5 py-4 font-black">פעולות</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                            {initials(user.name)}
                          </div>
                          <span className="font-black text-slate-950">
                            {user.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {user.email}
                      </td>

                      <td dir="ltr" className="px-5 py-4 text-right text-sm font-semibold text-slate-600">
                        {user.phone}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {roleLabel(user.role)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${userStatusClass(
                            user.status
                          )}`}
                        >
                          {statusLabel(user.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {user.joinedAt}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {user.lastActivity}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-black">
                            כניסה
                          </button>
                          <button className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100">
                            שיחה
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-3 lg:hidden">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${userStatusClass(
                        user.status
                      )}`}
                    >
                      {statusLabel(user.status)}
                    </span>

                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{user.name}</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {user.email}
                        </p>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                        {initials(user.name)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
                    <p>טלפון: <span dir="ltr">{user.phone}</span></p>
                    <p>סוג משתמש: {roleLabel(user.role)}</p>
                    <p>פעילות אחרונה: {user.lastActivity}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button className="h-11 rounded-2xl bg-slate-950 text-sm font-black text-white">
                      כניסה
                    </button>
                    <button className="h-11 rounded-2xl border border-slate-200 text-sm font-black text-slate-700">
                      שיחה
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="mt-5">
                <EmptyState
                  title="לא נמצאו משתמשים"
                  subtitle="נסי לחפש לפי שם, מייל, טלפון, סוג משתמש או סטטוס."
                />
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
