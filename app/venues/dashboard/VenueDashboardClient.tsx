"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Clock3,
  CreditCard,
  DollarSign,
  DoorOpen,
  FileText,
  LayoutDashboard,
  Mail,
  MapPin,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  PieChart,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UsersRound,
  Utensils,
  Wrench,
  X,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */

type HallStatus = "active" | "maintenance" | "closed";

type Hall = {
  id: string;
  name: string;
  subtitle: string;
  capacity: number;
  monthlyEvents: number;
  upcomingEvents: number;
  occupancyRate: number;
  monthlyRevenue: number;
  nextEventAt: string;
  status: HallStatus;
  image: string;
};

type TodayEvent = {
  id: string;
  hallId: string;
  hallName: string;
  eventName: string;
  time: string;
  status: "confirmed" | "preparing" | "live" | "done";
};

type Task = {
  id: string;
  title: string;
  area: string;
  due: string;
  priority: "low" | "medium" | "high";
  done: boolean;
};

type Lead = {
  id: string;
  name: string;
  source: string;
  requestedDate: string;
  budget: string;
  status: "new" | "followup" | "proposal";
};

type FinanceMonth = {
  label: string;
  revenue: number;
};

/* ======================================================
   MOCK DATA
   בהמשך מחליפים לקריאה מהשרת
====================================================== */

const halls: Hall[] = [
  {
    id: "main-gold-hall",
    name: "אולם הזהב",
    subtitle: "האולם המרכזי",
    capacity: 420,
    monthlyEvents: 18,
    upcomingEvents: 11,
    occupancyRate: 84,
    monthlyRevenue: 486000,
    nextEventAt: "היום 19:30",
    status: "active",
    image:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "garden-hall",
    name: "גן אירועים",
    subtitle: "מתחם חוץ וקבלת פנים",
    capacity: 320,
    monthlyEvents: 12,
    upcomingEvents: 9,
    occupancyRate: 72,
    monthlyRevenue: 318000,
    nextEventAt: "מחר 20:00",
    status: "active",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sky-hall",
    name: "SKY Hall",
    subtitle: "אולם בוטיק",
    capacity: 180,
    monthlyEvents: 9,
    upcomingEvents: 6,
    occupancyRate: 61,
    monthlyRevenue: 196000,
    nextEventAt: "24.05 20:30",
    status: "maintenance",
    image:
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
  },
];

const todayEvents: TodayEvent[] = [
  {
    id: "e1",
    hallId: "main-gold-hall",
    hallName: "אולם הזהב",
    eventName: "אירוע ערב",
    time: "19:30",
    status: "preparing",
  },
  {
    id: "e2",
    hallId: "garden-hall",
    hallName: "גן אירועים",
    eventName: "אירוע חברה",
    time: "20:00",
    status: "confirmed",
  },
  {
    id: "e3",
    hallId: "sky-hall",
    hallName: "SKY Hall",
    eventName: "כנס עסקי",
    time: "20:30",
    status: "confirmed",
  },
];

const tasks: Task[] = [
  {
    id: "t1",
    title: "בדיקת תאורה וסאונד באולם הזהב",
    area: "תפעול",
    due: "היום 16:00",
    priority: "high",
    done: false,
  },
  {
    id: "t2",
    title: "אישור סידור שולחנות מול צוות האולם",
    area: "ניהול אולם",
    due: "היום 18:00",
    priority: "medium",
    done: false,
  },
  {
    id: "t3",
    title: "בדיקת מלאי בר ומשקאות",
    area: "מחסן",
    due: "מחר",
    priority: "medium",
    done: true,
  },
  {
    id: "t4",
    title: "טיפול בתקלה במקרן SKY Hall",
    area: "תחזוקה",
    due: "עד 12:00",
    priority: "high",
    done: false,
  },
];

const leads: Lead[] = [
  {
    id: "l1",
    name: "אירוע חברה 180 איש",
    source: "אתר",
    requestedDate: "18.06.26",
    budget: "₪75,000",
    status: "new",
  },
  {
    id: "l2",
    name: "בר מצווה 220 איש",
    source: "טלפון",
    requestedDate: "02.07.26",
    budget: "₪62,000",
    status: "followup",
  },
  {
    id: "l3",
    name: "חתונה 400 איש",
    source: "אינסטגרם",
    requestedDate: "15.08.26",
    budget: "₪145,000",
    status: "proposal",
  },
];

const financeData: FinanceMonth[] = [
  { label: "ינו׳", revenue: 740000 },
  { label: "פבר׳", revenue: 680000 },
  { label: "מרץ", revenue: 810000 },
  { label: "אפר׳", revenue: 920000 },
  { label: "מאי", revenue: 1248000 },
  { label: "יוני", revenue: 980000 },
];

/* ======================================================
   HELPERS
====================================================== */

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusLabel(status: HallStatus) {
  if (status === "active") return "פעיל";
  if (status === "maintenance") return "תחזוקה";
  return "סגור";
}

function statusClass(status: HallStatus) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (status === "maintenance") {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }

  return "bg-rose-50 text-rose-700 border-rose-100";
}

function todayEventStatusLabel(status: TodayEvent["status"]) {
  if (status === "live") return "פעיל עכשיו";
  if (status === "preparing") return "בהכנות";
  if (status === "confirmed") return "מאושר";
  return "הסתיים";
}

function todayEventStatusClass(status: TodayEvent["status"]) {
  if (status === "live") return "bg-emerald-100 text-emerald-700";
  if (status === "preparing") return "bg-amber-100 text-amber-700";
  if (status === "confirmed") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

function leadStatusLabel(status: Lead["status"]) {
  if (status === "new") return "חדש";
  if (status === "followup") return "מעקב";
  return "הצעה נשלחה";
}

function leadStatusClass(status: Lead["status"]) {
  if (status === "new") return "bg-emerald-50 text-emerald-700";
  if (status === "followup") return "bg-amber-50 text-amber-700";
  return "bg-violet-50 text-violet-700";
}

/* ======================================================
   COMPONENT
====================================================== */

export default function VenueDashboardClient() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState("18.05.26 - 24.05.26");

  const stats = useMemo(() => {
    const totalCapacity = halls.reduce((sum, hall) => sum + hall.capacity, 0);
    const monthlyEvents = halls.reduce((sum, hall) => sum + hall.monthlyEvents, 0);
    const upcomingEvents = halls.reduce((sum, hall) => sum + hall.upcomingEvents, 0);
    const monthlyRevenue = halls.reduce((sum, hall) => sum + hall.monthlyRevenue, 0);
    const averageOccupancy = Math.round(
      halls.reduce((sum, hall) => sum + hall.occupancyRate, 0) / halls.length
    );

    return {
      totalHalls: halls.length,
      totalCapacity,
      monthlyEvents,
      upcomingEvents,
      monthlyRevenue,
      averageOccupancy,
    };
  }, []);

  const maxRevenue = Math.max(...financeData.map((item) => item.revenue));

  const goToHall = (hallId: string) => {
    router.push(`/venues/dashboard/halls/${hallId}`);
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#f8f6f2] text-[#1f2933]"
    >
      <div className="flex min-h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="סגירת תפריט"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={[
            "fixed right-0 top-0 z-50 h-full w-[290px] border-l border-[#eadfce] bg-white/95 px-5 py-5 shadow-2xl shadow-black/5 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:translate-x-0 lg:shadow-none",
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black tracking-[0.35em] text-[#c99a3d]">
                INVISTIMO
              </div>
              <div className="mt-1 text-xl font-black text-[#2b241c]">
                Venues
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#eadfce] text-[#6f6252] lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <button
            type="button"
            className="mt-7 flex w-full items-center gap-3 rounded-3xl border border-[#eadfce] bg-[#fbfaf7] p-3 text-right transition hover:bg-[#f4ead9]"
          >
            <div className="h-11 w-11 overflow-hidden rounded-2xl bg-[#ead8b8]">
              <img
                src={halls[0].image}
                alt="מתחם"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-[#2b241c]">
                מתחם בני הזהב
              </div>
              <div className="truncate text-xs font-bold text-[#8a7b68]">
                {stats.totalHalls} אולמות פעילים
              </div>
            </div>

            <ChevronDown size={16} className="text-[#9b8a73]" />
          </button>

          <nav className="mt-7 space-y-1">
            {[
              { label: "דשבורד ראשי", icon: LayoutDashboard, active: true },
              { label: "אולמות במתחם", icon: Building2 },
              { label: "יומן אירועים", icon: CalendarDays },
              { label: "לידים ומכירות", icon: UsersRound },
              { label: "הצעות מחיר", icon: FileText },
              { label: "תשלומים וחשבונות", icon: CreditCard },
              { label: "תחזוקה ותפעול", icon: Wrench },
              { label: "צוות ועובדים", icon: ShieldCheck },
              { label: "הודעות", icon: MessageSquareText, badge: "12" },
              { label: "הגדרות מתחם", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  className={[
                    "group flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-extrabold transition",
                    item.active
                      ? "bg-[#f4ead9] text-[#b98121]"
                      : "text-[#736657] hover:bg-[#fbf5ea] hover:text-[#b98121]",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-right">{item.label}</span>

                  {item.badge && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#efe1c5] px-2 text-xs font-black text-[#b98121]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-7 rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#fffaf0] to-[#f6ead2] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#c58b2c] shadow-sm">
              <Sparkles size={19} />
            </div>

            <div className="mt-3 text-sm font-black text-[#2b241c]">
              ניהול מתחם חכם
            </div>

            <p className="mt-1 text-xs font-bold leading-5 text-[#7f705d]">
              ריכוז אולמות, הכנסות, לידים, תפעול ויומן אירועים במקום אחד.
            </p>
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0 flex-1">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-[#eadfce]/80 bg-[#f8f6f2]/85 px-4 py-4 backdrop-blur-xl md:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#5f5347] lg:hidden"
                >
                  <Menu size={20} />
                </button>

                <div>
                  <div className="text-2xl font-black text-[#2b241c] md:text-3xl">
                    שלום רוני 👋
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#8a7b68]">
                    ברוך הבא לניהול מתחם בני הזהב
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <button
                  type="button"
                  className="flex h-12 items-center justify-between gap-3 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#5f5347] shadow-sm"
                >
                  <CalendarDays size={17} className="text-[#b98121]" />
                  <span>{selectedRange}</span>
                  <ChevronDown size={16} className="text-[#9b8a73]" />
                </button>

                <div className="flex h-12 min-w-[260px] items-center gap-3 rounded-2xl border border-[#eadfce] bg-white px-4 shadow-sm">
                  <Search size={18} className="text-[#a2937f]" />
                  <input
                    placeholder="חיפוש אולם, אירוע, ליד או משימה..."
                    className="w-full bg-transparent text-sm font-bold text-[#3b332b] outline-none placeholder:text-[#ad9f8b]"
                  />
                </div>

                <button
                  type="button"
                  className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#5f5347] shadow-sm"
                >
                  <Bell size={19} />
                  <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                    3
                  </span>
                </button>

                <button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#eadfce] bg-white text-[#5f5347] shadow-sm"
                >
                  <Mail size={19} />
                </button>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 md:px-7">
            {/* Stats */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="אולמות במתחם"
                value={String(stats.totalHalls)}
                subtitle="פעילים במערכת"
                icon={<Building2 size={22} />}
                trend="+1 החודש"
              />

              <StatCard
                title="אירועים החודש"
                value={String(stats.monthlyEvents)}
                subtitle="בכל האולמות"
                icon={<CalendarDays size={22} />}
                trend="+14%"
              />

              <StatCard
                title="אירועים עתידיים"
                value={String(stats.upcomingEvents)}
                subtitle="מתוכננים קדימה"
                icon={<Clock3 size={22} />}
                trend="+8%"
              />

              <StatCard
                title="הכנסות חודשיות"
                value={formatCurrency(stats.monthlyRevenue)}
                subtitle="מקדמות ותשלומים"
                icon={<DollarSign size={22} />}
                trend="+16%"
              />

              <StatCard
                title="תפוסה ממוצעת"
                value={`${stats.averageOccupancy}%`}
                subtitle="לפי אולמות פעילים"
                icon={<PieChart size={22} />}
                trend="+6%"
              />
            </section>

            {/* Halls overview + Today */}
            <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#2b241c]">
                      אולמות במתחם
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                      סקירה כללית של כל אולם, תפוסה, הכנסות ואירועים קרובים.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
                    >
                      <MapPin size={16} />
                      תצוגת מתחם
                    </button>

                    <button
                      type="button"
                      className="flex h-10 items-center gap-2 rounded-2xl bg-[#7c3aed] px-4 text-sm font-black text-white shadow-sm shadow-violet-200 transition hover:bg-[#6d28d9]"
                    >
                      <Plus size={16} />
                      אולם חדש
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {halls.map((hall) => (
                    <button
                      key={hall.id}
                      type="button"
                      onClick={() => goToHall(hall.id)}
                      className="group overflow-hidden rounded-[26px] border border-[#eadfce] bg-[#fffdf8] text-right shadow-sm transition hover:-translate-y-1 hover:border-[#d5b36d] hover:shadow-xl hover:shadow-[#b98121]/10"
                    >
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={hall.image}
                          alt={hall.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                        <div className="absolute right-3 top-3">
                          <span
                            className={[
                              "rounded-full border px-3 py-1 text-xs font-black",
                              statusClass(hall.status),
                            ].join(" ")}
                          >
                            {statusLabel(hall.status)}
                          </span>
                        </div>

                        <div className="absolute bottom-3 right-3 text-white">
                          <div className="text-lg font-black">{hall.name}</div>
                          <div className="mt-0.5 text-xs font-bold text-white/80">
                            {hall.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <MiniInfo
                            label="קיבולת"
                            value={`${hall.capacity}`}
                          />
                          <MiniInfo
                            label="אירועים החודש"
                            value={`${hall.monthlyEvents}`}
                          />
                          <MiniInfo
                            label="אירועים עתידיים"
                            value={`${hall.upcomingEvents}`}
                          />
                          <MiniInfo
                            label="הכנסות"
                            value={formatCurrency(hall.monthlyRevenue)}
                          />
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-black text-[#8a7b68]">
                              תפוסה חודשית
                            </span>
                            <span className="text-sm font-black text-[#2b241c]">
                              {hall.occupancyRate}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[#eee6d9]">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${hall.occupancyRate}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-[#eadfce] pt-3">
                          <div>
                            <div className="text-xs font-bold text-[#9b8a73]">
                              אירוע הבא
                            </div>
                            <div className="mt-0.5 text-sm font-black text-[#2b241c]">
                              {hall.nextEventAt}
                            </div>
                          </div>

                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121] transition group-hover:bg-[#b98121] group-hover:text-white">
                            <ChevronLeft size={18} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#2b241c]">
                      אירועים היום
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                      לפי אולמות במתחם
                    </p>
                  </div>

                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600">
                    LIVE
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {todayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => goToHall(event.hallId)}
                      className="flex w-full items-center gap-3 rounded-3xl border border-[#eadfce] bg-[#fffdf8] p-3 text-right transition hover:border-[#d5b36d] hover:bg-[#fff8ec]"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                        <DoorOpen size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-[#2b241c]">
                          {event.hallName}
                        </div>
                        <div className="truncate text-xs font-bold text-[#8a7b68]">
                          {event.eventName}
                        </div>
                      </div>

                      <div className="text-left">
                        <div className="text-sm font-black text-[#2b241c]">
                          {event.time}
                        </div>
                        <span
                          className={[
                            "mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black",
                            todayEventStatusClass(event.status),
                          ].join(" ")}
                        >
                          {todayEventStatusLabel(event.status)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
                >
                  הצג את כל האירועים
                  <ChevronLeft size={16} />
                </button>
              </div>
            </section>

            {/* Middle widgets */}
            <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr_350px]">
              {/* Leads */}
              <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#2b241c]">
                      לידים חדשים
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                      פניות למתחם
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fbf5ea] text-[#b98121]"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-3xl border border-[#eadfce] bg-[#fffdf8] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-[#2b241c]">
                            {lead.name}
                          </div>
                          <div className="mt-1 text-xs font-bold text-[#8a7b68]">
                            מקור: {lead.source}
                          </div>
                        </div>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-black",
                            leadStatusClass(lead.status),
                          ].join(" ")}
                        >
                          {leadStatusLabel(lead.status)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#7f705d]">
                        <div className="rounded-2xl bg-white px-3 py-2">
                          תאריך: {lead.requestedDate}
                        </div>
                        <div className="rounded-2xl bg-white px-3 py-2">
                          תקציב: {lead.budget}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue chart */}
              <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#2b241c]">
                      הכנסות המתחם
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                      סקירת הכנסות לפי חודשים מכל האולמות
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">
                    <TrendingUp size={17} />
                    עלייה של 16%
                  </div>
                </div>

                <div className="mt-6 flex h-64 items-end gap-3 rounded-[24px] bg-[#fbfaf7] p-4">
                  {financeData.map((item) => {
                    const height = Math.max(
                      18,
                      Math.round((item.revenue / maxRevenue) * 100)
                    );

                    return (
                      <div
                        key={item.label}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                      >
                        <div
                          className="w-full rounded-t-2xl bg-gradient-to-t from-[#7c3aed] to-[#c4a46a] transition hover:opacity-90"
                          style={{ height: `${height}%` }}
                          title={`${item.label}: ${formatCurrency(item.revenue)}`}
                        />
                        <div className="text-xs font-black text-[#8a7b68]">
                          {item.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <SummaryBox
                    label="סה״כ החודש"
                    value={formatCurrency(stats.monthlyRevenue)}
                    icon={<DollarSign size={18} />}
                  />
                  <SummaryBox
                    label="אירועים שולמו"
                    value="31"
                    icon={<CreditCard size={18} />}
                  />
                  <SummaryBox
                    label="יתרה לגבייה"
                    value={formatCurrency(186000)}
                    icon={<FileText size={18} />}
                  />
                </div>
              </div>

              {/* Tasks */}
              <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#2b241c]">
                      משימות תפעול
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                      ניהול יומי של המתחם
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-2xl bg-[#7c3aed] px-3 text-xs font-black text-white"
                  >
                    <Plus size={15} />
                    משימה
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex cursor-pointer items-start gap-3 rounded-3xl border border-[#eadfce] bg-[#fffdf8] p-3 transition hover:bg-[#fff8ec]"
                    >
                      <input
                        type="checkbox"
                        defaultChecked={task.done}
                        className="mt-1 h-4 w-4 rounded border-[#d8c7aa] text-[#7c3aed]"
                      />

                      <div className="min-w-0 flex-1">
                        <div
                          className={[
                            "text-sm font-black",
                            task.done
                              ? "text-[#9b8a73] line-through"
                              : "text-[#2b241c]",
                          ].join(" ")}
                        >
                          {task.title}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-[#8a7b68]">
                          <span>{task.area}</span>
                          <span>•</span>
                          <span>{task.due}</span>
                        </div>
                      </div>

                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-black",
                          task.priority === "high"
                            ? "bg-rose-50 text-rose-600"
                            : task.priority === "medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {task.priority === "high"
                          ? "דחוף"
                          : task.priority === "medium"
                            ? "בינוני"
                            : "נמוך"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {/* Bottom area */}
            <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_430px]">
              {/* Weekly calendar */}
              <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#2b241c]">
                      יומן אולמות שבועי
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                      מבט מהיר על תפוסת האולמות השבוע
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-2xl border border-[#eadfce] bg-white px-4 py-2 text-sm font-black text-[#6f6252]"
                    >
                      שבוע
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl bg-[#f4ead9] px-4 py-2 text-sm font-black text-[#b98121]"
                    >
                      חודש
                    </button>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <div className="min-w-[780px] rounded-[24px] border border-[#eadfce] bg-[#fbfaf7] p-3">
                    <div className="grid grid-cols-7 gap-2">
                      {["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"].map(
                        (day, index) => (
                          <div
                            key={day}
                            className="rounded-2xl bg-white p-3 text-center"
                          >
                            <div className="text-xs font-black text-[#9b8a73]">
                              {day}
                            </div>
                            <div className="mt-1 text-sm font-black text-[#2b241c]">
                              {18 + index}/05
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-7 gap-2">
                      {[
                        {
                          title: "אולם הזהב",
                          subtitle: "19:30",
                          tone: "bg-violet-100 text-violet-700",
                        },
                        {
                          title: "גן אירועים",
                          subtitle: "20:00",
                          tone: "bg-amber-100 text-amber-700",
                        },
                        {
                          title: "SKY Hall",
                          subtitle: "20:30",
                          tone: "bg-emerald-100 text-emerald-700",
                        },
                        {
                          title: "פנוי",
                          subtitle: "אין אירוע",
                          tone: "bg-white text-[#9b8a73]",
                        },
                        {
                          title: "אולם הזהב",
                          subtitle: "20:00",
                          tone: "bg-rose-100 text-rose-700",
                        },
                        {
                          title: "גן אירועים",
                          subtitle: "12:30",
                          tone: "bg-violet-100 text-violet-700",
                        },
                        {
                          title: "SKY Hall",
                          subtitle: "תחזוקה",
                          tone: "bg-slate-100 text-slate-600",
                        },
                      ].map((item, index) => (
                        <div
                          key={`${item.title}-${index}`}
                          className={[
                            "min-h-[118px] rounded-2xl p-3 text-center text-sm font-black",
                            item.tone,
                          ].join(" ")}
                        >
                          <div>{item.title}</div>
                          <div className="mt-2 text-xs font-bold opacity-75">
                            {item.subtitle}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-[#2b241c]">
                      התראות חכמות
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                      דברים שדורשים תשומת לב
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff5df] text-[#b98121]">
                    <Bell size={18} />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <AlertRow
                    icon={<Wrench size={18} />}
                    title="SKY Hall מסומן בתחזוקה"
                    description="מומלץ לוודא שהתקלה נסגרת לפני האירוע הבא."
                    tone="amber"
                  />

                  <AlertRow
                    icon={<CreditCard size={18} />}
                    title="יתרה לגבייה מ־4 אירועים"
                    description="קיימים תשלומים פתוחים שטרם הושלמו."
                    tone="rose"
                  />

                  <AlertRow
                    icon={<UsersRound size={18} />}
                    title="3 לידים ממתינים למעקב"
                    description="פניות חדשות שלא קיבלו הצעת מחיר."
                    tone="violet"
                  />

                  <AlertRow
                    icon={<Utensils size={18} />}
                    title="בדיקת מלאי לפני סוף שבוע"
                    description="עומס אירועים גבוה ביום חמישי ושישי."
                    tone="emerald"
                  />
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ======================================================
   SMALL COMPONENTS
====================================================== */

function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  trend: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>

        <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
          {trend}
        </div>
      </div>

      <div className="mt-4 text-sm font-black text-[#6f6252]">
        {title}
      </div>

      <div className="mt-1 text-2xl font-black text-[#2b241c]">
        {value}
      </div>

      <div className="mt-1 text-xs font-bold text-[#9b8a73]">
        {subtitle}
      </div>
    </div>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-3 py-2">
      <div className="text-[11px] font-black text-[#9b8a73]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-black text-[#2b241c]">
        {value}
      </div>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="flex items-center gap-2 text-[#b98121]">
        {icon}
        <span className="text-xs font-black text-[#8a7b68]">
          {label}
        </span>
      </div>

      <div className="mt-2 text-lg font-black text-[#2b241c]">
        {value}
      </div>
    </div>
  );
}

function AlertRow({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "amber" | "rose" | "violet" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700"
        : tone === "violet"
          ? "bg-violet-50 text-violet-700"
          : "bg-emerald-50 text-emerald-700";

  return (
    <div className="flex gap-3 rounded-3xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          toneClass,
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-[#2b241c]">
          {title}
        </div>
        <div className="mt-1 text-xs font-bold leading-5 text-[#8a7b68]">
          {description}
        </div>
      </div>
    </div>
  );
}