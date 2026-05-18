"use client";

import {
  Bell,
  CalendarDays,
  CheckCircle2,
  LayoutDashboard,
  Search,
  Users,
  CalendarCheck,
  Armchair,
  MessageCircle,
  BarChart3,
  Settings,
  ShieldCheck,
  ClipboardList,
} from "lucide-react";

type Hall = {
  id: string;
  name: string;
  capacity: number;
  status: "live" | "ready" | "busy" | "inactive";
  nextEventTime?: string;
  arrivalPercent: number;
};

const venue = {
  name: "מתחם גני הזהב",
  managerName: "רוני",
  halls: [
    {
      id: "1",
      name: "אולם זהב",
      capacity: 450,
      status: "live",
      nextEventTime: "19:30",
      arrivalPercent: 81,
    },
    {
      id: "2",
      name: "אולם אור",
      capacity: 350,
      status: "ready",
      nextEventTime: "20:00",
      arrivalPercent: 72,
    },
    {
      id: "3",
      name: "אולם SKY",
      capacity: 250,
      status: "busy",
      nextEventTime: "20:30",
      arrivalPercent: 68,
    },
  ] satisfies Hall[],
};

const navItems = [
  { label: "דשבורד ראשי", icon: LayoutDashboard, active: true },
  { label: "אירועים", icon: CalendarDays },
  { label: "יומן וניהול אירועים", icon: CalendarCheck },
  { label: "זוגות CRM", icon: Users },
  { label: "אישורי הגעה", icon: CheckCircle2 },
  { label: "הושבה", icon: Armchair },
  { label: "LIVE אירוע", icon: ShieldCheck },
  { label: "משימות", icon: ClipboardList },
  { label: "הודעות", icon: MessageCircle },
  { label: "דוחות ואנליטיקס", icon: BarChart3 },
  { label: "עובדים וצוותים", icon: Users },
  { label: "הגדרות מתחם", icon: Settings },
];

export default function VenueDashboardClient() {
  const hallsCount = venue.halls.length;

  return (
    <main dir="rtl" className="min-h-screen bg-[#fbfafc] text-[#161622]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 h-screen w-[260px] border-l border-[#ece9f3] bg-white px-4 py-6">
          <div className="text-center">
            <div className="text-3xl font-black tracking-[0.22em] text-[#c89235]">
              INVISTIMO
            </div>
            <div className="mt-1 text-xs font-black tracking-[0.35em] text-[#c89235]">
              VENUES
            </div>
          </div>

          <button className="mt-7 flex w-full items-center justify-between rounded-2xl border border-[#ebe7f3] bg-white p-3 shadow-sm">
            <span className="text-sm font-black">{venue.name}</span>
            <span className="text-[#7d7890]">⌄</span>
          </button>

          <nav className="mt-5 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition",
                    item.active
                      ? "bg-[#fff4d9] text-[#b47a18]"
                      : "text-[#3a3548] hover:bg-[#f7f4ff]",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 px-6 py-5">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">שלום {venue.managerName} 👋</h1>
              <p className="mt-1 text-sm font-bold text-[#8b8799]">
                ברוך הבא ל{venue.name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex h-12 items-center gap-2 rounded-2xl border border-[#ece9f3] bg-white px-5 text-sm font-black shadow-sm">
                <CalendarDays size={18} />
                18.05.25 - 24.05.25
              </button>

              <div className="flex h-12 w-[280px] items-center gap-2 rounded-2xl border border-[#ece9f3] bg-white px-4 shadow-sm">
                <Search size={18} className="text-[#9b95aa]" />
                <input
                  className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-[#aaa4b8]"
                  placeholder="חיפוש..."
                />
              </div>

              <button className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[#ece9f3] bg-white shadow-sm">
                <Bell size={19} />
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-black text-white">
                  3
                </span>
              </button>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-5 gap-4">
            <StatCard title="אירועים השבוע" value="28" sub="14% מהשבוע שעבר" />
            <StatCard title="אישורי הגעה" value="4,692" sub="מתוך 6,240 מוזמנים" />
            <StatCard title="הגיעו בפועל" value="3,842" sub="82% אישרו" />
            <StatCard title="הכנסות החודש" value="₪1,248,000" sub="16% מהחודש הקודם" />
            <StatCard title="אחוז סגירה CRM" value="68%" sub="8% מהחודש הקודם" />
          </section>

          <section className="mt-6 grid grid-cols-[1fr_360px] gap-5">
            <div className="rounded-[30px] border border-[#ece9f3] bg-white p-5 shadow-[0_18px_45px_rgba(31,25,70,0.05)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black">{venue.name}</h2>
                  <p className="text-sm font-bold text-[#8b8799]">
                    סקירת {hallsCount === 1 ? "אולם אחד" : `${hallsCount} אולמות`} במתחם
                  </p>
                </div>

                <div className="flex gap-2">
                  <button className="rounded-2xl border border-[#ece9f3] px-4 py-2 text-sm font-black">
                    תצוגת מפה
                  </button>
                  <button className="rounded-2xl bg-[#6d3df5] px-4 py-2 text-sm font-black text-white shadow-lg shadow-purple-100">
                    תצוגת טבלה
                  </button>
                </div>
              </div>

              <div
                className={[
                  "grid gap-4",
                  hallsCount === 1
                    ? "grid-cols-1"
                    : hallsCount === 2
                      ? "grid-cols-2"
                      : "grid-cols-3",
                ].join(" ")}
              >
                {venue.halls.map((hall) => (
                  <HallCard key={hall.id} hall={hall} />
                ))}
              </div>
            </div>

            <aside className="rounded-[30px] border border-[#ece9f3] bg-white p-5 shadow-[0_18px_45px_rgba(31,25,70,0.05)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black">אירועים היום</h2>
                <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">
                  LIVE
                </span>
              </div>

              <div className="space-y-4">
                {venue.halls.map((hall, index) => (
                  <div key={hall.id} className="rounded-2xl border border-[#f0edf8] p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black">
                          {index === 0 ? "נועם & דניאל" : index === 1 ? "ליאור & מאיה" : "שיר & רון"}
                        </p>
                        <p className="text-xs font-bold text-[#8b8799]">{hall.name}</p>
                      </div>
                      <p className="font-black">{hall.nextEventTime || "—"}</p>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-[#eeeaf5]">
                        <div
                          className="h-2 rounded-full bg-emerald-400"
                          style={{ width: `${hall.arrivalPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-[#6d6a7c]">
                        {hall.arrivalPercent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[26px] border border-[#ece9f3] bg-white p-5 shadow-[0_18px_45px_rgba(31,25,70,0.05)]">
      <p className="text-sm font-black text-[#625d72]">{title}</p>
      <h3 className="mt-4 text-3xl font-black">{value}</h3>
      <p className="mt-2 text-xs font-black text-emerald-500">{sub}</p>
    </div>
  );
}

function HallCard({ hall }: { hall: Hall }) {
  const statusLabel =
    hall.status === "live"
      ? "LIVE"
      : hall.status === "ready"
        ? "מוכן"
        : hall.status === "busy"
          ? "עמוס"
          : "לא פעיל";

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#ece9f3] bg-white shadow-sm">
      <div className="h-40 bg-gradient-to-br from-[#2d2140] via-[#c89235] to-[#f7e9ca]" />

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black">{hall.name}</h3>
            <p className="text-xs font-bold text-[#8b8799]">
              {hall.capacity} קיבולת
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
            {statusLabel}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xl font-black">{hall.arrivalPercent}%</p>
            <p className="text-xs font-bold text-[#8b8799]">הגעה</p>
          </div>

          <div className="text-left">
            <p className="text-xl font-black">{hall.nextEventTime || "—"}</p>
            <p className="text-xs font-bold text-[#8b8799]">אירוע הבא</p>
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-[#eeeaf5]">
          <div
            className="h-2 rounded-full bg-emerald-400"
            style={{ width: `${hall.arrivalPercent}%` }}
          />
        </div>
      </div>
    </article>
  );
}