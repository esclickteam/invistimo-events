import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Crown,
  GalleryHorizontalEnd,
  Grid3X3,
  LayoutTemplate,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Star,
  UsersRound,
  Utensils,
  WalletCards,
  Wrench,
} from "lucide-react";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import VenueHall from "@/models/VenueHall";
import VenueEvent from "@/models/VenueEvent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    hallId: string;
  }>;
};

type HallStatus = "active" | "maintenance" | "closed";

type EventStatus =
  | "lead"
  | "proposal"
  | "closed"
  | "confirmed"
  | "preparing"
  | "live"
  | "done"
  | "cancelled";

type SerializedHall = {
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

type SerializedEvent = {
  id: string;
  title: string;
  eventType: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  status: EventStatus;
  budget: number;
  paidAmount: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return "לא הוגדר";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  return `${day}.${month}.${year}`;
}

function getCurrentMonthRange() {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const toYmd = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    from: toYmd(start),
    to: toYmd(end),
    today: toYmd(now),
  };
}

function statusLabel(status: HallStatus) {
  if (status === "active") return "פעיל";
  if (status === "maintenance") return "תחזוקה";
  return "סגור";
}

function statusClass(status: HallStatus) {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "maintenance") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-rose-50 text-rose-700";
}

function eventStatusLabel(status: EventStatus) {
  if (status === "lead") return "ליד";
  if (status === "proposal") return "בהצעה";
  if (status === "closed") return "סגור";
  if (status === "confirmed") return "מאושר";
  if (status === "preparing") return "בהכנות";
  if (status === "live") return "פעיל עכשיו";
  if (status === "done") return "הסתיים";
  return "בוטל";
}

function serializeHall(hall: any): SerializedHall {
  return {
    id: String(hall.id || ""),
    name: String(hall.name || "אולם ללא שם"),
    subtitle: String(hall.subtitle || ""),
    capacity: Number(hall.capacity || 0),
    monthlyEvents: Number(hall.monthlyEvents || 0),
    upcomingEvents: Number(hall.upcomingEvents || 0),
    occupancyRate: Number(hall.occupancyRate || 0),
    monthlyRevenue: Number(hall.monthlyRevenue || 0),
    nextEventAt: String(hall.nextEventAt || ""),
    status: (hall.status || "active") as HallStatus,
    image: String(hall.image || ""),
  };
}

function serializeEvent(event: any): SerializedEvent {
  return {
    id: String(event._id),
    title: String(event.title || ""),
    eventType: String(event.eventType || ""),
    clientName: String(event.clientName || ""),
    date: String(event.date || ""),
    startTime: String(event.startTime || ""),
    endTime: String(event.endTime || ""),
    guests: Number(event.guests || 0),
    status: (event.status || "confirmed") as EventStatus,
    budget: Number(event.budget || 0),
    paidAmount: Number(event.paidAmount || 0),
  };
}

export default async function VenueHallPage({ params }: Props) {
  await connectDB();

  const auth = await getUserIdFromRequest();

  if (!auth?.userId) {
    redirect("/login");
  }

  const { hallId } = await params;

  const rawHall = await VenueHall.findOne({
    ownerId: auth.userId,
    id: hallId,
  }).lean();

  if (!rawHall) {
    notFound();
  }

  const { from, to, today } = getCurrentMonthRange();

  const [monthEventsRaw, upcomingEventsRaw, nextEventRaw] = await Promise.all([
    VenueEvent.find({
      ownerId: auth.userId,
      hallId,
      date: {
        $gte: from,
        $lte: to,
      },
    })
      .sort({ date: 1, startTime: 1 })
      .lean(),

    VenueEvent.find({
      ownerId: auth.userId,
      hallId,
      date: {
        $gte: today,
      },
    })
      .sort({ date: 1, startTime: 1 })
      .limit(6)
      .lean(),

    VenueEvent.findOne({
      ownerId: auth.userId,
      hallId,
      date: {
        $gte: today,
      },
    })
      .sort({ date: 1, startTime: 1 })
      .lean(),
  ]);

  const hall = serializeHall(rawHall);
  const monthEvents = monthEventsRaw.map(serializeEvent);
  const upcomingEvents = upcomingEventsRaw.map(serializeEvent);
  const nextEvent = nextEventRaw ? serializeEvent(nextEventRaw) : null;

  const monthlyRevenue = monthEvents.reduce(
    (sum, event) => sum + event.budget,
    0
  );

  const monthlyGuests = monthEvents.reduce(
    (sum, event) => sum + event.guests,
    0
  );

  const closedEvents = monthEvents.filter(
    (event) => event.status === "closed" || event.status === "confirmed"
  ).length;

  const occupancyRate =
    hall.capacity > 0 && monthEvents.length > 0
      ? Math.min(100, Math.round((monthlyGuests / (hall.capacity * monthEvents.length)) * 100))
      : 0;

  const hallCalendarHref = `/venues/dashboard/halls/${hallId}/calendar`;
  const hallCrmHref = `/venues/dashboard/halls/${hallId}/crm`;
  const hallMenusHref = `/venues/dashboard/halls/${hallId}/menus`;
  const hallStaffHref = `/venues/dashboard/halls/${hallId}/staff`;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f8f6f2] text-[#2b241c]">
      <div className="mx-auto max-w-[1760px] px-4 py-5 md:px-7">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/venues/dashboard"
            className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl border border-[#eadfce] bg-white px-4 text-sm font-black text-[#6f6252] shadow-sm transition hover:bg-[#fbf5ea]"
          >
            <ArrowRight size={17} />
            חזרה לדשבורד המתחם
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={hallCalendarHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
            >
              <CalendarDays size={16} />
              יומן אולם
            </Link>

            <Link
              href={hallCrmHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#f4ead9]"
            >
              <UsersRound size={16} />
              CRM לקוחות
            </Link>

            <Link
              href={hallMenusHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#f4ead9]"
            >
              <Utensils size={16} />
              תפריטים
            </Link>

            <Link
              href={hallStaffHref}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-[#fff8eb] px-4 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#f4ead9]"
            >
              <UsersRound size={16} />
              צוות ומשמרות
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-[34px] border border-[#eadfce] bg-white shadow-sm">
          <div className="relative min-h-[210px] overflow-hidden">
            {hall.image ? (
              <img
                src={hall.image}
                alt={hall.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-l from-[#fff8ec] via-white to-[#f4ead9]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-l from-white via-white/92 to-white/5" />

            <div className="relative z-10 flex min-h-[210px] flex-col justify-center px-6 py-8 md:px-10">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#f4ead9] text-[#b98121] shadow-sm">
                  <Crown size={34} />
                </div>

                <div>
                  <div className="text-sm font-black text-[#8a7b68]">
                    ניהול אולם
                  </div>

                  <h1 className="mt-1 text-4xl font-black tracking-tight text-[#2b241c] md:text-5xl">
                    {hall.name}
                  </h1>

                  <p className="mt-2 text-base font-bold text-[#7f705d]">
                    {hall.subtitle || "ניהול יומן, לקוחות, תפריטים, צוות, משמרות ותחזוקה"}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Link
                      href={hallCalendarHref}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#b98121] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#9f6f1a]"
                    >
                      <CalendarDays size={17} />
                      מעבר ליומן אולם
                    </Link>

                    <Link
                      href={hallMenusHref}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-white/80 px-5 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#fff8eb]"
                    >
                      <Utensils size={17} />
                      ניהול תפריטים
                    </Link>

                    <Link
                      href={hallStaffHref}
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#d9bd83] bg-white/80 px-5 text-sm font-black text-[#9f6f1a] shadow-sm transition hover:bg-[#fff8eb]"
                    >
                      <UsersRound size={17} />
                      צוות ומשמרות
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#eadfce] bg-[#fffdf8] p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <HallKpi
              icon={<UsersRound size={22} />}
              label="קיבולת מקסימלית"
              value={`${hall.capacity}`}
              subValue="אורחים"
            />

            <HallKpi
              icon={<CalendarDays size={22} />}
              label="אירועים החודש"
              value={`${monthEvents.length}`}
              subValue="אירועים ביומן"
            />

            <HallKpi
              icon={<CircleDollarSign size={22} />}
              label="הכנסות החודש"
              value={formatCurrency(monthlyRevenue)}
              subValue="לפי מחיר אירועים"
            />

            <HallKpi
              icon={<Clock3 size={22} />}
              label="אירועים עתידיים"
              value={`${upcomingEvents.length}`}
              subValue="קדימה"
            />

            <HallKpi
              icon={<Clock3 size={22} />}
              label="האירוע הבא"
              value={nextEvent ? `${formatDate(nextEvent.date)}` : "אין"}
              subValue={nextEvent ? `${nextEvent.title} · ${nextEvent.startTime}` : "לא הוגדר אירוע"}
            />

            <HallKpi
              icon={<CheckCircle2 size={22} />}
              label="סטטוס אולם"
              value={statusLabel(hall.status)}
              subValue="מצב אולם במערכת"
              success={hall.status === "active"}
            />
          </div>

          <div className="overflow-x-auto border-t border-[#eadfce]">
            <div className="flex min-w-[1050px]">
              {[
                "סקירה כללית",
                "יומן אולם",
                "תבניות הושבה",
                "תפריטים",
                "צוות ומשמרות",
                "כספים",
                "גלריה",
                "ציוד ותחזוקה",
                "הגדרות",
              ].map((tab, index) => {
                if (tab === "יומן אולם") {
                  return <TopNavLink key={tab} href={hallCalendarHref} label={tab} />;
                }

                if (tab === "תפריטים") {
                  return <TopNavLink key={tab} href={hallMenusHref} label={tab} />;
                }

                if (tab === "צוות ומשמרות") {
                  return <TopNavLink key={tab} href={hallStaffHref} label={tab} />;
                }

                return (
                  <button
                    key={tab}
                    type="button"
                    className={[
                      "h-12 flex-1 border-l border-[#eadfce] px-4 text-sm font-black transition",
                      index === 0
                        ? "bg-[#b98121] text-white"
                        : "bg-[#fffdf8] text-[#6f6252] hover:bg-[#fbf5ea] hover:text-[#b98121]",
                    ].join(" ")}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[330px_1fr]">
          <aside className="space-y-5 xl:order-1">
            <div className="rounded-[30px] border border-[#eadfce] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Building2 size={19} className="text-[#b98121]" />
                <h2 className="text-lg font-black">פרטי אולם</h2>
              </div>

              <div className="space-y-3 text-sm">
                <InfoLine label="שם האולם" value={hall.name} />
                <InfoLine label="תיאור" value={hall.subtitle || "לא הוגדר"} />
                <InfoLine label="קיבולת ישיבה" value={`${hall.capacity} אורחים`} />
                <InfoLine label="סטטוס" value={statusLabel(hall.status)} />
                <InfoLine label="מזהה אולם" value={hall.id} />
              </div>

              <div className="my-5 h-px bg-[#eadfce]" />

              <InfoBlock
                icon={<MapPin size={18} />}
                title="מיקום במתחם"
                description="לא הוגדר עדיין"
              />

              <InfoBlock
                icon={<UsersRound size={18} />}
                title="מנהל אולם"
                description="לא הוגדר עדיין"
              />

              <InfoBlock
                icon={<Phone size={18} />}
                title="איש קשר"
                description="לא הוגדר עדיין"
              />

              <div className="mt-5 space-y-2">
                <SideLink href={hallCalendarHref} icon={<CalendarDays size={17} />} label="יומן אולם" primary />
                <SideLink href={hallCrmHref} icon={<UsersRound size={17} />} label="ניהול לקוחות CRM" />
                <SideLink href={hallMenusHref} icon={<Utensils size={17} />} label="ניהול תפריטים" />
                <SideLink href={hallStaffHref} icon={<UsersRound size={17} />} label="צוות ומשמרות" />

                <Link
                  href={hallCalendarHref}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
                >
                  <Plus size={17} />
                  הוסף אירוע
                </Link>

                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#eadfce] bg-[#fffdf8] text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea]"
                >
                  <Grid3X3 size={17} />
                  הוסף תבנית הושבה
                </button>
              </div>
            </div>
          </aside>

          <div className="grid gap-5 xl:order-2">
            <section className="grid gap-5 lg:grid-cols-3">
              <DashboardCard
                title="יומן אולם"
                icon={<CalendarDays size={20} />}
                footer="מעבר ליומן המלא"
                href={hallCalendarHref}
              >
                <div className="space-y-2">
                  {upcomingEvents.length ? (
                    upcomingEvents.map((event) => (
                      <Link
                        href={`/venues/dashboard/events/${event.id}`}
                        key={event.id}
                        className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2 transition hover:bg-[#fbf5ea]"
                      >
                        <div className="text-right">
                          <div className="text-xs font-black text-[#9b8a73]">
                            {formatDate(event.date)}
                          </div>
                          <div className="text-sm font-black text-[#2b241c]">
                            {event.startTime || "לא הוגדר"}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-black text-[#2b241c]">
                            {event.eventType || event.title}
                          </div>
                          <div className="text-xs font-bold text-[#8a7b68]">
                            {event.clientName || "ללא לקוח"}
                          </div>
                        </div>

                        <span className="rounded-full bg-[#f4ead9] px-2.5 py-1 text-[11px] font-black text-[#b98121]">
                          {eventStatusLabel(event.status)}
                        </span>
                      </Link>
                    ))
                  ) : (
                    <EmptyCardText text="אין אירועים עתידיים לאולם הזה עדיין." />
                  )}
                </div>
              </DashboardCard>

              <DashboardCard
                title="תבניות הושבה"
                icon={<LayoutTemplate size={20} />}
                footer="ניהול תבניות"
              >
                <EmptyFeature
                  title="עדיין אין תבניות הושבה"
                  text="בהמשך נחבר כאן יצירת תבניות הושבה אמיתיות לפי אולם."
                  icon={<LayoutTemplate size={24} />}
                />
              </DashboardCard>

              <DashboardCard
                title="תפריטים וחבילות"
                icon={<Utensils size={20} />}
                footer="ניהול כל התפריטים"
                href={hallMenusHref}
              >
                <EmptyFeature
                  title="תפריטים יופיעו כאן"
                  text="לאחר שתיצרי תפריטים לאולם, הם יוצגו כאן ויהיה ניתן לשלוח ללקוח לבחירה."
                  icon={<Utensils size={24} />}
                />
              </DashboardCard>
            </section>

            <section className="grid gap-5 lg:grid-cols-3">
              <DashboardCard
                title="צוות ומשמרות"
                icon={<UsersRound size={20} />}
                footer="ניהול צוות ומשמרות"
                href={hallStaffHref}
              >
                <EmptyFeature
                  title="עדיין אין שיבוצי צוות"
                  text="אחרי חיבור צוות ומשמרות, יוצגו כאן עובדים, משמרות, חופשות והחלפות."
                  icon={<UsersRound size={24} />}
                />
              </DashboardCard>

              <DashboardCard
                title="כספים ותשלומים"
                icon={<WalletCards size={20} />}
                footer="מעבר לדוחות כספיים"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FinanceBox
                    label="הכנסות החודש"
                    value={formatCurrency(monthlyRevenue)}
                    tone="green"
                  />
                  <FinanceBox
                    label="שולם עד כה"
                    value={formatCurrency(
                      monthEvents.reduce((sum, event) => sum + event.paidAmount, 0)
                    )}
                  />
                  <FinanceBox
                    label="אירועים סגורים"
                    value={`${closedEvents}`}
                  />
                  <FinanceBox
                    label="תפוסה"
                    value={`${occupancyRate}%`}
                  />
                </div>
              </DashboardCard>

              <DashboardCard
                title="ציוד ותחזוקה"
                icon={<Wrench size={20} />}
                footer="ניהול ציוד ותחזוקה"
              >
                <EmptyFeature
                  title="אין משימות תחזוקה"
                  text="משימות תחזוקה, ציוד ובדיקות אולם יופיעו כאן אחרי שנחבר את המודול."
                  icon={<Wrench size={24} />}
                />
              </DashboardCard>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <DashboardCard
                title="גלריית אולם"
                icon={<GalleryHorizontalEnd size={20} />}
                footer="צפייה בגלריה המלאה"
              >
                {hall.image ? (
                  <div className="overflow-hidden rounded-2xl border border-[#eadfce] bg-[#fffdf8]">
                    <img
                      src={hall.image}
                      alt={hall.name}
                      className="h-[220px] w-full object-cover"
                    />
                  </div>
                ) : (
                  <EmptyFeature
                    title="עדיין אין תמונות"
                    text="כשתעדכני תמונת אולם או גלריה, היא תופיע כאן."
                    icon={<GalleryHorizontalEnd size={24} />}
                  />
                )}
              </DashboardCard>

              <DashboardCard
                title="הערות ותזכורות"
                icon={<Bell size={20} />}
                footer="מעבר לכל ההערות"
              >
                <EmptyFeature
                  title="אין הערות כרגע"
                  text="הערות פנימיות ותזכורות לאולם יוצגו כאן בהמשך."
                  icon={<Bell size={24} />}
                />
              </DashboardCard>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function TopNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-12 flex-1 items-center justify-center border-l border-[#eadfce] bg-[#fffdf8] px-4 text-sm font-black text-[#6f6252] transition hover:bg-[#fbf5ea] hover:text-[#b98121]"
    >
      {label}
    </Link>
  );
}

function SideLink({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black shadow-sm transition",
        primary
          ? "bg-[#b98121] text-white hover:bg-[#9f6f1a]"
          : "border border-[#d9bd83] bg-[#fff8eb] text-[#9f6f1a] hover:bg-[#f4ead9]",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
  );
}

function HallKpi({
  icon,
  label,
  value,
  subValue,
  success,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  success?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-2xl",
            success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[#f4ead9] text-[#b98121]",
          ].join(" ")}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 text-xs font-black text-[#8a7b68]">{label}</div>
      <div className="mt-1 text-xl font-black text-[#2b241c]">{value}</div>
      <div className="mt-1 text-xs font-bold text-[#9b8a73]">{subValue}</div>
    </div>
  );
}

function DashboardCard({
  title,
  icon,
  footer,
  href,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  footer: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[#eadfce] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
            {icon}
          </div>
          <h2 className="text-base font-black text-[#2b241c]">{title}</h2>
        </div>
      </div>

      {children}

      {href ? (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#b98121] transition hover:text-[#8a5e14]"
        >
          {footer}
          <ArrowRight size={15} />
        </Link>
      ) : (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#b98121] transition hover:text-[#8a5e14]"
        >
          {footer}
          <ArrowRight size={15} />
        </button>
      )}
    </section>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#fffdf8] px-3 py-2">
      <span className="text-xs font-black text-[#8a7b68]">{label}</span>
      <span className="text-sm font-black text-[#2b241c]">{value}</span>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex gap-3 rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
        {icon}
      </div>
      <div>
        <div className="text-sm font-black text-[#2b241c]">{title}</div>
        <div className="mt-1 text-xs font-bold leading-5 text-[#8a7b68]">
          {description}
        </div>
      </div>
    </div>
  );
}

function FinanceBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
}) {
  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf8] p-4">
      <div className="text-xs font-black text-[#8a7b68]">{label}</div>
      <div
        className={[
          "mt-2 text-lg font-black",
          tone === "green"
            ? "text-emerald-700"
            : tone === "red"
              ? "text-rose-700"
              : "text-[#2b241c]",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyCardText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d8bd83] bg-[#fffdf8] p-4 text-center text-sm font-bold leading-6 text-[#8a7b68]">
      {text}
    </div>
  );
}

function EmptyFeature({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#d8bd83] bg-[#fffdf8] p-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4ead9] text-[#b98121]">
        {icon}
      </div>
      <div className="mt-3 text-sm font-black text-[#2b241c]">{title}</div>
      <p className="mx-auto mt-1 max-w-xs text-xs font-bold leading-5 text-[#8a7b68]">
        {text}
      </p>
    </div>
  );
}