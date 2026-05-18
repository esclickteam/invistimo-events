"use client";

import React from "react";
import {
  AlertCircle,
  ArrowUpLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";

const stats = [
  {
    title: "אירועים החודש",
    value: "24",
    change: "+12% מהחודש הקודם",
    icon: CalendarDays,
  },
  {
    title: "לקוחות פתוחים",
    value: "38",
    change: "9 לידים חדשים",
    icon: Users,
  },
  {
    title: "אולמות פעילים",
    value: "3",
    change: "מתחם אחד פעיל",
    icon: Building2,
  },
  {
    title: "תפריטים לאישור",
    value: "7",
    change: "דורש טיפול",
    icon: Utensils,
  },
  {
    title: "הכנסות צפויות",
    value: "₪382K",
    change: "אירועים סגורים",
    icon: Wallet,
  },
  {
    title: "התראות חשובות",
    value: "5",
    change: "לטיפול היום",
    icon: AlertCircle,
  },
];

const upcomingEvents = [
  {
    title: "חתונת לירון ואיתי",
    hall: "אולם גפן",
    date: "23.05.2026",
    guests: "320 אורחים",
    status: "בתכנון",
  },
  {
    title: "בר מצווה משפחת כהן",
    hall: "אולם הדר",
    date: "26.05.2026",
    guests: "180 אורחים",
    status: "מוכן",
  },
  {
    title: "אירוע חברה",
    hall: "אולם כרם",
    date: "29.05.2026",
    guests: "450 אורחים",
    status: "תפריט פתוח",
  },
];

const tasks = [
  {
    title: "אירוע בעוד 7 ימים ללא תפריט מאושר",
    meta: "חתונת לירון ואיתי",
    icon: Utensils,
  },
  {
    title: "לקוח חדש ממתין לחזרה",
    meta: "נכנס מהאתר היום",
    icon: Clock3,
  },
  {
    title: "הושבה לא הושלמה",
    meta: "אירוע חברה · אולם כרם",
    icon: Users,
  },
];

export default function VenueOverviewTab() {
  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-[#eadfce] bg-[#2f261d] shadow-xl shadow-[#2f261d]/10">
        <div className="relative p-6 sm:p-8">
          <div className="absolute left-[-80px] top-[-80px] h-60 w-60 rounded-full bg-[#d8b873]/25 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-[#d8b873]">
                מערכת ניהול לאולמות ומתחמי אירועים
              </p>

              <h2 className="mt-3 max-w-3xl text-2xl font-black leading-tight text-white sm:text-4xl">
                כל הלקוחות, האירועים, האולמות, התפריטים והמשימות במקום אחד.
              </h2>

              <p className="mt-4 max-w-2xl text-sm font-bold leading-7 text-white/70 sm:text-base">
                דשבורד מקצועי לאולמות שמרכז CRM, אירועים, הושבה, RSVP,
                תפריטים, כספים ותפעול יומיומי.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-sm font-black text-[#d8b873]">
                טיפול מומלץ היום
              </p>

              <div className="mt-4 space-y-3">
                {[
                  "לבדוק 5 אירועים פתוחים",
                  "לחזור ל-3 לידים חדשים",
                  "לאשר תפריט לאירוע קרוב",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-white"
                  >
                    <CheckCircle2 size={18} className="text-[#d8b873]" />
                    <span className="text-sm font-bold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#8a7966]">
                    {item.title}
                  </p>

                  <p className="mt-3 text-3xl font-black text-[#2f261d]">
                    {item.value}
                  </p>

                  <p className="mt-2 text-xs font-black text-[#a5824f]">
                    {item.change}
                  </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f1e6d4] text-[#a5824f]">
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-[#2f261d]">
                אירועים קרובים
              </h3>
              <p className="mt-1 text-sm font-bold text-[#8a7966]">
                מבט מהיר על האירועים הבאים במתחם
              </p>
            </div>

            <button
              type="button"
              className="flex items-center gap-1 rounded-2xl bg-[#fffaf4] px-4 py-2 text-sm font-black text-[#2f261d] transition hover:bg-[#f1e6d4]"
            >
              הכל
              <ArrowUpLeft size={16} />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.title}
                className="grid gap-3 rounded-2xl border border-[#f0e6d7] bg-[#fffaf4] p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <h4 className="font-black text-[#2f261d]">{event.title}</h4>
                  <p className="mt-1 text-sm font-bold text-[#7b6a58]">
                    {event.hall} · {event.date} · {event.guests}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-[#7a5a25]">
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#eadfce] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-xl font-black text-[#2f261d]">
            דברים שדורשים טיפול
          </h3>

          <p className="mt-1 text-sm font-bold text-[#8a7966]">
            משימות חשובות שלא כדאי לפספס
          </p>

          <div className="mt-5 space-y-3">
            {tasks.map((task) => {
              const Icon = task.icon;

              return (
                <div
                  key={task.title}
                  className="flex gap-3 rounded-2xl border border-[#f0e6d7] bg-[#fffaf4] p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1e6d4] text-[#a5824f]">
                    <Icon size={18} />
                  </div>

                  <div>
                    <p className="text-sm font-black text-[#2f261d]">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#8a7966]">
                      {task.meta}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}