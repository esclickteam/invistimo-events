"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Grid3X3,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Search,
  Settings2,
  Sparkles,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */

type CalendarView = "day" | "week" | "month";

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
  status?: "active" | "maintenance" | "closed";
  image?: string;
};

type NewEventForm = {
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

const hours = Array.from({ length: 18 }, (_, index) => index + 7);

const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

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

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toYmd(date: Date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateString: string) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${day}/${month}`;
}

function getStartOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildWeekDays(currentDate: Date) {
  const start = getStartOfWeek(currentDate);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      label: dayNames[index],
      date: toYmd(date),
      dateLabel: formatDateLabel(toYmd(date)),
      dayIndex: index,
    };
  });
}

function getHebrewMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getWeekRangeLabel(currentDate: Date) {
  const days = buildWeekDays(currentDate);
  const first = days[0]?.dateLabel || "";
  const last = days[6]?.dateLabel || "";
  const monthTitle = getHebrewMonthTitle(currentDate);
  return `${first} - ${last} ${monthTitle}`;
}

function getEventHour(time: string, fallback: number) {
  if (!time) return fallback;

  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw || 0);

  if (!Number.isFinite(hour)) return fallback;

  return hour + minute / 60;
}

function statusLabel(status: VenueEventStatus) {
  if (status === "lead") return "ליד";
  if (status === "proposal") return "בהצעה";
  if (status === "closed") return "סגור";
  if (status === "confirmed") return "מאושר";
  if (status === "preparing") return "בהכנות";
  if (status === "live") return "פעיל עכשיו";
  if (status === "done") return "הסתיים";
  return "בוטל";
}

function itemColorClass(status: VenueEventStatus) {
  if (status === "closed") return "border-[#d6a33a] bg-[#fff4dc] text-[#7b4e09]";
  if (status === "confirmed") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (status === "preparing") return "border-sky-300 bg-sky-50 text-sky-800";
  if (status === "proposal") return "border-rose-300 bg-rose-50 text-rose-800";
  if (status === "lead") return "border-violet-300 bg-violet-50 text-violet-800";
  if (status === "live") return "border-emerald-400 bg-emerald-100 text-emerald-900";
  if (status === "done") return "border-slate-300 bg-slate-50 text-slate-700";
  return "border-rose-300 bg-rose-50 text-rose-800";
}

function getTodayYmd() {
  return toYmd(new Date());
}

/* ======================================================
   PAGE
====================================================== */

export default function HallCalendarPage() {
  const params = useParams<{ hallId: string }>();
  const router = useRouter();

  const hallId = params?.hallId || "";

  const [view, setView] = useState<CalendarView>("week");
  const [showMeetings, setShowMeetings] = useState(true);
  const [showTasks, setShowTasks] = useState(false);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [hall, setHall] = useState<VenueHall | null>(null);
  const [events, setEvents] = useState<VenueEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const weekDays = useMemo(() => buildWeekDays(currentDate), [currentDate]);
  const weekFrom = weekDays[0]?.date;
  const weekTo = weekDays[6]?.date;

  const fetchCalendar = async () => {
    if (!hallId) return;

    setLoading(true);
    setServerError("");

    try {
      const query = new URLSearchParams();

      if (weekFrom) query.set("from", weekFrom);
      if (weekTo) query.set("to", weekTo);

      const res = await fetch(
        `/api/venues/dashboard/halls/${hallId}/calendar?${query.toString()}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "טעינת היומן נכשלה");
      }

      setHall(data.hall || null);
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (error) {
      console.error("GET hall calendar failed:", error);
      setServerError(error instanceof Error ? error.message : "טעינת היומן נכשלה");
      setHall(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hallId, weekFrom, weekTo]);

  const stats = useMemo(() => {
    return {
      events: events.length,
      closed: events.filter((item) => item.status === "closed").length,
      inProduction: events.filter((item) =>
        ["preparing", "confirmed", "live"].includes(item.status)
      ).length,
      revenue: events.reduce((sum, item) => sum + toNumber(item.budget, 0), 0),
      guests: events.reduce((sum, item) => sum + toNumber(item.guests, 0), 0),
    };
  }, [events]);

  const visibleItems = useMemo(() => {
    return events.filter((item) => {
      if (!showMeetings && item.eventType === "פגישה") return false;
      return true;
    });
  }, [events, showMeetings]);

  const todayEvents = useMemo(() => {
    const today = getTodayYmd();

    return events
      .filter((event) => event.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events]);

  const goToEvent = (item: VenueEvent) => {
    router.push(`/venues/dashboard/events/${item.id}`);
  };

  const goPrevious = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const goNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const createEvent = async (form: NewEventForm) => {
    setCreating(true);
    setServerError("");

    try {
      const res = await fetch(`/api/venues/dashboard/halls/${hallId}/calendar`, {
        method: "POST",
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
        throw new Error(data?.message || "יצירת אירוע נכשלה");
      }

      if (data.event) {
        setEvents((prev) => [...prev, data.event]);
      }

      setCreateOpen(false);
    } catch (error) {
      console.error("POST hall calendar failed:", error);
      setServerError(error instanceof Error ? error.message : "יצירת אירוע נכשלה");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1800px] px-4 py-5 md:px-7">
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/venues/dashboard/halls/${hallId}`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
            >
              <ArrowRight size={17} />
              חזרה לניהול אולם
            </Link>

            <Link
              href={`/venues/dashboard/halls/${hallId}/crm`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
            >
              <UsersRound size={17} />
              ניהול לקוחות CRM
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
          >
            <Plus size={17} />
            אירוע חדש
          </button>
        </div>

        <section className="rounded-[34px] border border-[#eadfce] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#f4ead9] text-[#b98121]">
                  <CalendarDays size={28} />
                </div>

                <div>
                  <h1 className="text-3xl font-black md:text-4xl">
                    יומן אירועים - {hall?.name || "אולם"}
                  </h1>
                  <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                    יומן אמיתי מחובר לשרת. אירועים שתוסיפי כאן יישמרו במונגו ויישארו אחרי רענון.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <TopMetric label="אירועים" value={String(stats.events)} icon={<CalendarDays size={19} />} />
              <TopMetric label="סגורים" value={String(stats.closed)} icon={<CheckCircle2 size={19} />} />
              <TopMetric label="בהפקה" value={String(stats.inProduction)} icon={<Sparkles size={19} />} />
              <TopMetric label="אורחים" value={String(stats.guests)} icon={<UsersRound size={19} />} />
              <TopMetric label="הכנסות" value={formatCurrency(stats.revenue)} icon={<WalletCards size={19} />} />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-[#eadfce] pt-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <ViewButton active={view === "day"} onClick={() => setView("day")}>יום</ViewButton>
              <ViewButton active={view === "week"} onClick={() => setView("week")}>שבוע</ViewButton>
              <ViewButton active={view === "month"} onClick={() => setView("month")}>חודש</ViewButton>

              <div className="mx-1 hidden h-8 w-px bg-[#eadfce] md:block" />

              <button
                type="button"
                onClick={goPrevious}
                className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#6f6252]"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#2b241c]"
              >
                {getWeekRangeLabel(currentDate)}
              </button>

              <button
                type="button"
                onClick={goNext}
                className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#6f6252]"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={goToday}
                className="flex h-10 items-center gap-2 rounded-2xl bg-[#f4ead9] px-4 text-sm font-black text-[#b98121]"
              >
                היום
              </button>

              <button
                type="button"
                onClick={fetchCalendar}
                className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252]"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Clock3 size={16} />}
                רענון
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#6f6252]">
                <input
                  type="checkbox"
                  checked={showMeetings}
                  onChange={(event) => setShowMeetings(event.target.checked)}
                  className="h-4 w-4 rounded border-[#d8c7aa] text-[#b98121]"
                />
                הצג פגישות
              </label>

              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#6f6252]">
                <input
                  type="checkbox"
                  checked={showTasks}
                  onChange={(event) => setShowTasks(event.target.checked)}
                  className="h-4 w-4 rounded border-[#d8c7aa] text-[#b98121]"
                />
                הצג משימות
              </label>

              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252]"
              >
                <Filter size={16} />
                סינון
              </button>
            </div>
          </div>

          {serverError ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {serverError}
            </div>
          ) : null}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[280px_1fr_330px]">
          <aside className="space-y-5">
            <Panel title="חיפוש וסינון" icon={<Search size={18} />}>
              <div className="space-y-3">
                <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3">
                  <Search size={16} className="text-[#a2937f]" />
                  <input
                    placeholder="חיפוש אירוע..."
                    className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#b7a895]"
                  />
                </div>

                <SelectLike label="כל סוגי האירועים" />
                <SelectLike label="כל הסטטוסים" />
                <SelectLike label="כל המקורות" />
                <SelectLike label="כל הנציגים" />

                <button
                  type="button"
                  className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#b98121]"
                >
                  איפוס סינונים
                </button>
              </div>
            </Panel>

            <Panel title="מקרא סטטוסים" icon={<Grid3X3 size={18} />}>
              <div className="space-y-2">
                <Legend color="bg-violet-400" label="ליד" />
                <Legend color="bg-rose-400" label="בהצעה" />
                <Legend color="bg-[#d6a33a]" label="סגור" />
                <Legend color="bg-emerald-400" label="מאושר / פעיל" />
                <Legend color="bg-sky-400" label="בהכנות" />
                <Legend color="bg-slate-400" label="הסתיים / בוטל" />
              </div>
            </Panel>

            <Panel title="זמינות מהירה" icon={<Clock3 size={18} />}>
              <div className="space-y-3">
                <AvailabilityRow label="אולם" value={hall?.name || "לא נטען"} />
                <AvailabilityRow label="קיבולת" value={`${hall?.capacity || 0} אורחים`} />
                <AvailabilityRow label="סטטוס" value={hall?.status || "פעיל"} />
                <AvailabilityRow label="אירועים השבוע" value={`${events.length}`} />
              </div>
            </Panel>
          </aside>

          <section className="overflow-x-auto rounded-[30px] border border-[#eadfce] bg-white shadow-sm">
            <div className="min-w-[1050px]">
              <div className="grid grid-cols-[70px_repeat(7,minmax(130px,1fr))] border-b border-[#eadfce] bg-[#fffdf8]">
                <div className="border-l border-[#eadfce] p-3 text-center text-xs font-black text-[#9b8a73]">
                  שעה
                </div>

                {weekDays.map((day) => (
                  <div
                    key={day.date}
                    className={[
                      "border-l border-[#eadfce] p-3 text-center",
                      day.date === getTodayYmd() ? "bg-[#fff7e6]" : "",
                    ].join(" ")}
                  >
                    <div className="text-sm font-black text-[#2b241c]">{day.label}</div>
                    <div className="mt-1 text-xs font-bold text-[#8a7b68]">{day.dateLabel}</div>
                  </div>
                ))}
              </div>

              <div className="relative">
                <div className="grid grid-cols-[70px_repeat(7,minmax(130px,1fr))]">
                  {hours.map((hour) => (
                    <React.Fragment key={hour}>
                      <div className="h-16 border-b border-l border-[#eadfce] bg-[#fffdf8] px-2 py-2 text-left text-xs font-black text-[#8a7b68]">
                        {`${pad(hour)}:00`}
                      </div>

                      {weekDays.map((day) => (
                        <div
                          key={`${day.date}-${hour}`}
                          className="h-16 border-b border-l border-[#eadfce] bg-white/70"
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>

                {visibleItems.length === 0 && !loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-[28px] border border-dashed border-[#d8bd83] bg-[#fffdf8]/95 p-8 text-center shadow-sm">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
                        <CalendarDays size={26} />
                      </div>
                      <h3 className="mt-4 text-xl font-black text-[#2b241c]">
                        אין אירועים בשבוע הזה
                      </h3>
                      <p className="mt-2 text-sm font-bold text-[#8a7b68]">
                        לחצי על “אירוע חדש” כדי להוסיף אירוע ליומן.
                      </p>
                    </div>
                  </div>
                ) : null}

                {visibleItems.map((item) => {
                  const dayIndex = weekDays.findIndex((day) => day.date === item.date);
                  if (dayIndex < 0) return null;

                  const startHour = getEventHour(item.startTime, 9);
                  const endHour = getEventHour(item.endTime, startHour + 2);

                  const top = ((startHour - 7) / hours.length) * 100;
                  const height = ((endHour - startHour) / hours.length) * 100;

                  const right = `calc(70px + ${dayIndex} * ((100% - 70px) / 7))`;
                  const width = `calc((100% - 70px) / 7 - 12px)`;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onDoubleClick={() => goToEvent(item)}
                      className={[
                        "absolute z-20 overflow-hidden rounded-2xl border p-3 text-right shadow-sm transition hover:z-30 hover:-translate-y-1 hover:shadow-xl",
                        itemColorClass(item.status),
                      ].join(" ")}
                      style={{
                        top: `calc(${Math.max(0, top)}% + 8px)`,
                        height: `calc(${Math.max(8, height)}% - 12px)`,
                        right: `calc(${right} + 6px)`,
                        width,
                      }}
                      title="קליק כפול לפתיחת האירוע"
                    >
                      <div className="text-sm font-black">{item.title}</div>
                      <div className="mt-1 text-xs font-bold opacity-80">
                        {item.startTime} - {item.endTime || "לא הוגדר"}
                      </div>
                      <div className="mt-2 text-xs font-bold opacity-80">
                        {item.clientName || "ללא שם לקוח"}
                      </div>
                      {item.guests ? (
                        <div className="mt-1 text-xs font-bold opacity-80">
                          {item.guests} אורחים
                        </div>
                      ) : null}
                      <span className="mt-2 inline-flex rounded-full bg-white/70 px-2 py-1 text-[10px] font-black">
                        {statusLabel(item.status)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <Panel title={`היום - ${formatDateLabel(getTodayYmd())}`} icon={<CalendarDays size={18} />}>
              <div className="space-y-3">
                {todayEvents.length ? (
                  todayEvents.map((event) => (
                    <TodayLine
                      key={event.id}
                      time={event.startTime}
                      title={event.title}
                      subtitle={event.clientName || event.eventType || "אירוע"}
                      highlight={event.status === "live" || event.status === "closed"}
                    />
                  ))
                ) : (
                  <EmptySideText text="אין אירועים היום." />
                )}
              </div>
            </Panel>

            <Panel title="משימות ותזכורות" icon={<ListChecks size={18} />}>
              {showTasks ? (
                <EmptySideText text="חיבור משימות יתווסף בשלב הבא." />
              ) : (
                <EmptySideText text="סמני “הצג משימות” כדי להציג משימות לאחר שנחבר אותן." />
              )}
            </Panel>

            <Panel title="מידע על האולם" icon={<Building2 size={18} />}>
              <div className="space-y-3">
                <InfoLine label="שם אולם" value={hall?.name || "לא נטען"} />
                <InfoLine label="קיבולת מרבית" value={`${hall?.capacity || 0} אורחים`} />
                <InfoLine label="סטטוס" value={hall?.status || "פעיל"} />
                <InfoLine label="מזהה אולם" value={hallId} />
              </div>

              <Link
                href={`/venues/dashboard/halls/${hallId}`}
                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-white text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
              >
                <Settings2 size={16} />
                פרטי אולם
              </Link>
            </Panel>
          </aside>
        </section>

        <p className="mt-4 text-center text-xs font-bold text-[#9b8a73]">
          טיפ: קליק כפול על אירוע פותח את עמוד האירוע המלא.
        </p>
      </div>

      {createOpen && (
        <CreateEventModal
          saving={creating}
          defaultDate={getTodayYmd()}
          onClose={() => setCreateOpen(false)}
          onCreate={createEvent}
        />
      )}
    </main>
  );
}

/* ======================================================
   CREATE EVENT MODAL
====================================================== */

function CreateEventModal({
  saving,
  defaultDate,
  onClose,
  onCreate,
}: {
  saving: boolean;
  defaultDate: string;
  onClose: () => void;
  onCreate: (form: NewEventForm) => void;
}) {
  const [form, setForm] = useState<NewEventForm>({
    title: "",
    eventType: "חתונה",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    date: defaultDate,
    startTime: "19:30",
    endTime: "00:30",
    guests: "",
    status: "confirmed",
    budget: "",
    paidAmount: "",
    notes: "",
  });

  const updateField = <K extends keyof NewEventForm>(
    key: K,
    value: NewEventForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("חובה להזין שם אירוע");
      return;
    }

    if (!form.date) {
      alert("חובה להזין תאריך");
      return;
    }

    if (!form.startTime) {
      alert("חובה להזין שעת התחלה");
      return;
    }

    onCreate(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[32px] border border-[#eadfce] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eadfce] bg-white/95 p-5 backdrop-blur">
          <div>
            <h2 className="text-xl font-black text-[#2b241c]">אירוע חדש ביומן</h2>
            <p className="mt-1 text-sm font-bold text-[#8a7b68]">
              האירוע יישמר במונגו ויופיע ביומן גם אחרי רענון.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] text-[#6f6252] transition hover:bg-[#fbf5ea]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput label="שם אירוע" value={form.title} onChange={(value) => updateField("title", value)} />

            <FormInput label="סוג אירוע" value={form.eventType} onChange={(value) => updateField("eventType", value)} />

            <FormInput label="שם לקוח" value={form.clientName} onChange={(value) => updateField("clientName", value)} />

            <FormInput label="טלפון לקוח" value={form.clientPhone} onChange={(value) => updateField("clientPhone", value)} />

            <FormInput label="אימייל לקוח" value={form.clientEmail} onChange={(value) => updateField("clientEmail", value)} />

            <FormInput label="תאריך" type="date" value={form.date} onChange={(value) => updateField("date", value)} />

            <FormInput label="שעת התחלה" type="time" value={form.startTime} onChange={(value) => updateField("startTime", value)} />

            <FormInput label="שעת סיום" type="time" value={form.endTime} onChange={(value) => updateField("endTime", value)} />

            <FormInput label="כמות אורחים" type="number" value={form.guests} onChange={(value) => updateField("guests", value)} />

            <FormInput label="תקציב / מחיר אירוע" type="number" value={form.budget} onChange={(value) => updateField("budget", value)} />

            <FormInput label="שולם עד כה" type="number" value={form.paidAmount} onChange={(value) => updateField("paidAmount", value)} />

            <label>
              <span className="mb-2 block text-sm font-black text-[#6f6252]">סטטוס</span>
              <select
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as VenueEventStatus)}
                className="h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#2b241c] outline-none transition focus:border-[#b98121]"
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
              <span className="mb-2 block text-sm font-black text-[#6f6252]">הערות</span>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                className="min-h-[110px] w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-bold text-[#2b241c] outline-none transition focus:border-[#b98121]"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#eadfce] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-2xl border border-[#eadfce] bg-white px-6 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
            >
              ביטול
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#b98121] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              שמירת אירוע
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ======================================================
   SMALL COMPONENTS
====================================================== */

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-10 rounded-2xl px-4 text-sm font-black transition",
        active
          ? "bg-[#b98121] text-white shadow-sm"
          : "border border-[#eadfce] bg-white text-[#6f6252] hover:bg-[#fbf5ea]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function TopMetric({
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

function Panel({
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
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
          {icon}
        </div>
        <h2 className="text-base font-black text-[#2b241c]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SelectLike({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex h-11 w-full items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 text-sm font-black text-[#6f6252]"
    >
      <span>{label}</span>
      <ChevronLeft size={15} />
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#fffdf8] px-3 py-2">
      <span className="text-sm font-bold text-[#6f6252]">{label}</span>
      <span className={`h-3 w-3 rounded-full ${color}`} />
    </div>
  );
}

function AvailabilityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2">
      <span className="text-sm font-black text-[#2b241c]">{label}</span>
      <span className="text-xs font-bold text-[#8a7b68]">{value}</span>
    </div>
  );
}

function TodayLine({
  time,
  title,
  subtitle,
  highlight,
}: {
  time: string;
  title: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between rounded-2xl border px-3 py-3",
        highlight ? "border-[#d6a33a] bg-[#fff4dc]" : "border-[#eadfce] bg-[#fffdf8]",
      ].join(" ")}
    >
      <div>
        <div className="text-sm font-black text-[#2b241c]">{title}</div>
        <div className="mt-1 text-xs font-bold text-[#8a7b68]">{subtitle}</div>
      </div>
      <div className="text-sm font-black text-[#b98121]">{time}</div>
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

function EmptySideText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d8bd83] bg-[#fffdf8] p-4 text-center text-sm font-bold leading-6 text-[#8a7b68]">
      {text}
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
    <label>
      <span className="mb-2 block text-sm font-black text-[#6f6252]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-bold text-[#2b241c] outline-none transition focus:border-[#b98121]"
      />
    </label>
  );
}