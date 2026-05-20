"use client";

import React, { useMemo, useState } from "react";
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
  Plus,
  Search,
  Settings2,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";

export const dynamic = "force-dynamic";

type CalendarView = "day" | "week" | "month";
type EventStatus = "closed" | "in_production" | "proposal" | "cancelled" | "blocked";
type CalendarItemType = "event" | "meeting" | "maintenance" | "blocked";

type HallCalendarItem = {
  id: string;
  title: string;
  clientName: string;
  eventType: string;
  dayIndex: number;
  dateLabel: string;
  startHour: number;
  endHour: number;
  guests?: number;
  status: EventStatus;
  type: CalendarItemType;
  color: "gold" | "green" | "blue" | "rose" | "purple" | "gray";
};

type TodayTask = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  done: boolean;
};

const weekDays = [
  { label: "ראשון", date: "18/05" },
  { label: "שני", date: "19/05" },
  { label: "שלישי", date: "20/05" },
  { label: "רביעי", date: "21/05" },
  { label: "חמישי", date: "22/05" },
  { label: "שישי", date: "23/05" },
  { label: "שבת", date: "24/05" },
];

const hours = Array.from({ length: 18 }, (_, index) => index + 7);

const calendarItems: HallCalendarItem[] = [
  {
    id: "evt-1001",
    title: "חתונה - משפחת לוי",
    clientName: "רוזן & לוי",
    eventType: "חתונה",
    dayIndex: 1,
    dateLabel: "19.05.26",
    startHour: 19,
    endHour: 24,
    guests: 420,
    status: "closed",
    type: "event",
    color: "gold",
  },
  {
    id: "evt-1002",
    title: "בר מצווה - דניאל",
    clientName: "משפחת כהן",
    eventType: "בר מצווה",
    dayIndex: 3,
    dateLabel: "21.05.26",
    startHour: 16,
    endHour: 20,
    guests: 180,
    status: "in_production",
    type: "event",
    color: "blue",
  },
  {
    id: "evt-1003",
    title: "כנס עסקי",
    clientName: "Global Solutions",
    eventType: "כנס",
    dayIndex: 4,
    dateLabel: "22.05.26",
    startHour: 11,
    endHour: 14,
    guests: 150,
    status: "closed",
    type: "event",
    color: "green",
  },
  {
    id: "evt-1004",
    title: "אירוע חברה",
    clientName: "Fashion Tech",
    eventType: "אירוע חברה",
    dayIndex: 2,
    dateLabel: "20.05.26",
    startHour: 19,
    endHour: 23,
    guests: 300,
    status: "proposal",
    type: "event",
    color: "rose",
  },
  {
    id: "meet-2001",
    title: "פגישת טעימות",
    clientName: "משפחת לוי",
    eventType: "פגישה",
    dayIndex: 1,
    dateLabel: "19.05.26",
    startHour: 10,
    endHour: 12,
    guests: 6,
    status: "in_production",
    type: "meeting",
    color: "purple",
  },
  {
    id: "block-3001",
    title: "ניקיון עמוק",
    clientName: "צוות תפעול",
    eventType: "תחזוקה",
    dayIndex: 5,
    dateLabel: "23.05.26",
    startHour: 8,
    endHour: 11,
    status: "blocked",
    type: "maintenance",
    color: "gray",
  },
];

const todayTasks: TodayTask[] = [
  { id: "t1", time: "09:00", title: "בדיקת סאונד ותאורה", subtitle: "לפני פגישת טעימות", done: false },
  { id: "t2", time: "11:30", title: "בדיקת סידור שולחנות", subtitle: "חתונה - משפחת לוי", done: false },
  { id: "t3", time: "15:00", title: "תיאום ספקים", subtitle: "DJ, צילום, בר וקייטרינג", done: true },
  { id: "t4", time: "18:00", title: "פתיחת אולם לאירוע", subtitle: "בדיקת כניסת אורחים", done: false },
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

function statusLabel(status: EventStatus) {
  if (status === "closed") return "סגור";
  if (status === "in_production") return "בהפקה";
  if (status === "proposal") return "בהצעה";
  if (status === "blocked") return "חסום";
  return "בוטל";
}

function itemColorClass(color: HallCalendarItem["color"]) {
  if (color === "gold") return "border-[#d6a33a] bg-[#fff4dc] text-[#7b4e09]";
  if (color === "green") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (color === "blue") return "border-sky-300 bg-sky-50 text-sky-800";
  if (color === "rose") return "border-rose-300 bg-rose-50 text-rose-800";
  if (color === "purple") return "border-violet-300 bg-violet-50 text-violet-800";
  return "border-slate-300 bg-slate-50 text-slate-700";
}

export default function HallCalendarPage() {
  const params = useParams<{ hallId: string }>();
  const router = useRouter();
  const hallId = params?.hallId || "main-gold-hall";
  const hallName = getHallName(hallId);

  const [view, setView] = useState<CalendarView>("week");
  const [showMeetings, setShowMeetings] = useState(true);
  const [showTasks, setShowTasks] = useState(false);

  const stats = useMemo(() => {
    const eventsOnly = calendarItems.filter((item) => item.type === "event");
    return {
      events: eventsOnly.length,
      closed: eventsOnly.filter((item) => item.status === "closed").length,
      inProduction: eventsOnly.filter((item) => item.status === "in_production").length,
      revenue: 486000,
      guests: eventsOnly.reduce((sum, item) => sum + (item.guests || 0), 0),
    };
  }, []);

  const visibleItems = calendarItems.filter((item) => {
    if (!showMeetings && item.type === "meeting") return false;
    return true;
  });

  const goToEvent = (item: HallCalendarItem) => {
    if (item.type === "event") {
      router.push(`/venues/dashboard/events/${item.id}`);
      return;
    }

    router.push(`/venues/dashboard/halls/${hallId}/calendar?item=${item.id}`);
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
                    יומן אירועים - {hallName}
                  </h1>
                  <p className="mt-1 text-sm font-bold text-[#8a7b68]">
                    תצוגת זמינות, אירועים סגורים, פגישות, תחזוקה וחסימות אולם.
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

              <button type="button" className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#6f6252]">
                <ChevronRight size={16} />
              </button>

              <button type="button" className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#2b241c]">
                18 - 24 מאי 2026
              </button>

              <button type="button" className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-3 text-sm font-black text-[#6f6252]">
                <ChevronLeft size={16} />
              </button>

              <button type="button" className="flex h-10 items-center gap-2 rounded-2xl bg-[#f4ead9] px-4 text-sm font-black text-[#b98121]">
                היום
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

              <button type="button" className="flex h-10 items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252]">
                <Filter size={16} />
                סינון
              </button>
            </div>
          </div>
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

                <button type="button" className="h-11 w-full rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#b98121]">
                  איפוס סינונים
                </button>
              </div>
            </Panel>

            <Panel title="מקרא סטטוסים" icon={<Grid3X3 size={18} />}>
              <div className="space-y-2">
                <Legend color="bg-[#d6a33a]" label="אירוע סגור" />
                <Legend color="bg-sky-400" label="בהפקה" />
                <Legend color="bg-rose-400" label="הצעת מחיר" />
                <Legend color="bg-violet-400" label="פגישה" />
                <Legend color="bg-slate-400" label="תחזוקה / חסימה" />
              </div>
            </Panel>

            <Panel title="זמינות מהירה" icon={<Clock3 size={18} />}>
              <div className="space-y-3">
                <AvailabilityRow label="היום" value="תפוס בערב" />
                <AvailabilityRow label="מחר" value="פנוי בבוקר" />
                <AvailabilityRow label="שישי" value="אירוע סגור" />
                <AvailabilityRow label="שבת" value="פנוי" />
              </div>
            </Panel>
          </aside>

          <section className="overflow-x-auto rounded-[30px] border border-[#eadfce] bg-white shadow-sm">
            <div className="min-w-[1050px]">
              <div className="grid grid-cols-[70px_repeat(7,minmax(130px,1fr))] border-b border-[#eadfce] bg-[#fffdf8]">
                <div className="border-l border-[#eadfce] p-3 text-center text-xs font-black text-[#9b8a73]">שעה</div>

                {weekDays.map((day, index) => (
                  <div
                    key={day.date}
                    className={[
                      "border-l border-[#eadfce] p-3 text-center",
                      index === 1 ? "bg-[#fff7e6]" : "",
                    ].join(" ")}
                  >
                    <div className="text-sm font-black text-[#2b241c]">{day.label}</div>
                    <div className="mt-1 text-xs font-bold text-[#8a7b68]">{day.date}</div>
                  </div>
                ))}
              </div>

              <div className="relative">
                <div className="grid grid-cols-[70px_repeat(7,minmax(130px,1fr))]">
                  {hours.map((hour) => (
                    <React.Fragment key={hour}>
                      <div className="h-16 border-b border-l border-[#eadfce] bg-[#fffdf8] px-2 py-2 text-left text-xs font-black text-[#8a7b68]">
                        {`${String(hour).padStart(2, "0")}:00`}
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

                <div className="pointer-events-none absolute inset-y-0 right-[70px] left-0">
                  <div
                    className="absolute left-0 right-0 border-t-2 border-rose-400"
                    style={{ top: `${((18.6 - 7) / hours.length) * 100}%` }}
                  >
                    <span className="absolute -top-3 left-3 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                      עכשיו
                    </span>
                  </div>
                </div>

                {visibleItems.map((item) => {
                  const top = ((item.startHour - 7) / hours.length) * 100;
                  const height = ((item.endHour - item.startHour) / hours.length) * 100;
                  const right = `calc(70px + ${item.dayIndex} * ((100% - 70px) / 7))`;
                  const width = `calc((100% - 70px) / 7 - 12px)`;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onDoubleClick={() => goToEvent(item)}
                      className={[
                        "absolute z-20 overflow-hidden rounded-2xl border p-3 text-right shadow-sm transition hover:z-30 hover:-translate-y-1 hover:shadow-xl",
                        itemColorClass(item.color),
                      ].join(" ")}
                      style={{
                        top: `calc(${top}% + 8px)`,
                        height: `calc(${height}% - 12px)`,
                        right: `calc(${right} + 6px)`,
                        width,
                      }}
                      title="קליק כפול לפתיחת האירוע"
                    >
                      <div className="text-sm font-black">{item.title}</div>
                      <div className="mt-1 text-xs font-bold opacity-80">
                        {String(item.startHour).padStart(2, "0")}:00 -{" "}
                        {item.endHour === 24 ? "00:00" : `${String(item.endHour).padStart(2, "0")}:00`}
                      </div>
                      <div className="mt-2 text-xs font-bold opacity-80">{item.clientName}</div>
                      {item.guests && <div className="mt-1 text-xs font-bold opacity-80">{item.guests} אורחים</div>}
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
            <Panel title="היום - יום ראשון 18 במאי" icon={<CalendarDays size={18} />}>
              <div className="space-y-3">
                <TodayLine time="09:00" title="פגישת טעימות" subtitle="משפחת לוי" />
                <TodayLine time="12:00" title="בר מצווה" subtitle="משפחת כהן" />
                <TodayLine time="19:30" title="חתונה" subtitle="רוזן & לוי" highlight />
              </div>

              <button type="button" className="mt-4 h-10 w-full rounded-2xl bg-[#f4ead9] text-sm font-black text-[#b98121]">
                צפייה ביום מלא
              </button>
            </Panel>

            <Panel title="משימות ותזכורות" icon={<ListChecks size={18} />}>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <label key={task.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
                    <input
                      type="checkbox"
                      defaultChecked={task.done}
                      className="mt-1 h-4 w-4 rounded border-[#d8c7aa] text-[#b98121]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-black text-[#b98121]">{task.time}</div>
                      <div className="mt-1 text-sm font-black text-[#2b241c]">{task.title}</div>
                      <div className="mt-1 text-xs font-bold leading-5 text-[#8a7b68]">{task.subtitle}</div>
                    </div>
                  </label>
                ))}
              </div>
            </Panel>

            <Panel title="מידע על האולם" icon={<Building2 size={18} />}>
              <div className="space-y-3">
                <InfoLine label="קיבולת מרבית" value="420 אורחים" />
                <InfoLine label="שטח אולם" value="650 מ״ר" />
                <InfoLine label="סטטוס" value="פעיל" />
                <InfoLine label="כתובת" value="דרך הכוכבים 12" />
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
          טיפ: קליק כפול על אירוע סגור פותח את עמוד האירוע המלא. פגישות ותחזוקה נפתחות לעריכה מהירה.
        </p>
      </div>
    </main>
  );
}

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

function TopMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
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

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">{icon}</div>
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

function TodayLine({ time, title, subtitle, highlight }: { time: string; title: string; subtitle: string; highlight?: boolean }) {
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
