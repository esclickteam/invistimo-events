"use client";

import { useState, useMemo } from "react";
import { CalendarDays, Users, CheckCircle2, Plus, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// אנימציה רכה
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 1) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" },
  }),
};

export default function ProducerDashboard() {
  // ⚙️ נתונים מדומים זמניים
  const events = [
    {
      id: 1,
      title: "חתונת דניאל וטל",
      date: "2026-03-25",
      location: "גן האירועים הרמוניה בגן",
      guests: 280,
      confirmed: 230,
      status: "active",
    },
    {
      id: 2,
      title: "בר מצווה של עומר",
      date: "2026-02-10",
      location: "אולמי דניאלה",
      guests: 150,
      confirmed: 120,
      status: "active",
    },
  ];

  // נחשב אירוע קרוב
  const nextEvent = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    return sorted[0];
  }, [events]);

  return (
    <div className="p-6 space-y-8">
      {/* =====================
          כרטיסי סטטוס עליונים
      ====================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-500">אירועים פעילים</h3>
            <CalendarDays className="w-5 h-5 text-[var(--brand-purple)]" />
          </div>
          <p className="text-3xl font-bold mt-2">{events.length}</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-500">אירועים בשבוע הקרוב</h3>
            <CheckCircle2 className="w-5 h-5 text-[var(--brand-cyan-strong)]" />
          </div>
          <p className="text-3xl font-bold mt-2">1</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-500">סה״כ מוזמנים</h3>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold mt-2">
            {events.reduce((sum, e) => sum + e.guests, 0)}
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-500">משימות פתוחות</h3>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold mt-2">3</p>
        </motion.div>
      </div>

      {/* =====================
          האירוע הבא שלי
      ====================== */}
      {nextEvent && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-xl font-semibold mb-4">האירוע הבא שלי 🎉</h2>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold">{nextEvent.title}</h3>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <CalendarDays className="w-4 h-4" />{" "}
                {new Date(nextEvent.date).toLocaleDateString("he-IL")}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" /> {nextEvent.location}
              </p>
            </div>
            <Button className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-hover)] text-white rounded-xl px-5">
              כניסה לניהול האירוע
            </Button>
          </div>
        </motion.div>
      )}

      {/* =====================
          טבלת האירועים שלי
      ====================== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">האירועים שלי</h2>
          <Button className="flex items-center gap-2 bg-[var(--brand-cyan-strong)] text-white rounded-xl px-4 hover:opacity-90">
            <Plus className="w-4 h-4" />
            הוסף אירוע חדש
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">תאריך</th>
                <th className="p-3">שם האירוע</th>
                <th className="p-3">מיקום</th>
                <th className="p-3">מוזמנים</th>
                <th className="p-3">אישרו הגעה</th>
                <th className="p-3">סטטוס</th>
                <th className="p-3">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, i) => (
                <tr
                  key={ev.id}
                  className="border-t hover:bg-gray-50 transition text-gray-800"
                >
                  <td className="p-3">
                    {new Date(ev.date).toLocaleDateString("he-IL")}
                  </td>
                  <td className="p-3 font-medium">{ev.title}</td>
                  <td className="p-3">{ev.location}</td>
                  <td className="p-3">{ev.guests}</td>
                  <td className="p-3">{ev.confirmed}</td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        ev.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      פעיל
                    </span>
                  </td>
                  <td className="p-3 text-[var(--brand-purple)] cursor-pointer hover:underline">
                    ניהול
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
