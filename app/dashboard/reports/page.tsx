"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function DashboardReportsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10" dir="rtl">
      <div className="rounded-[24px] border border-[#EADBC4] bg-[#FFFDF8] p-8 shadow-sm">
        <BarChart3 className="text-[#B88A2D]" size={32} />
        <h1 className="mt-4 text-2xl font-black text-[#3F3328]">דוחות</h1>
        <p className="mt-2 text-sm font-bold text-[#7C6A58]">
          דוחות שליחת הודעות וסטטוסי RSVP זמינים ממסכי ההודעות והדשבורד.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard/messages/new"
            className="rounded-[14px] bg-[#2F6B4F] px-4 py-2.5 text-sm font-black text-white"
          >
            שליחת הודעות
          </Link>
          <Link
            href="/dashboard#rsvp-stats"
            className="rounded-[14px] border border-[#E3D6C3] bg-white px-4 py-2.5 text-sm font-black text-[#5A4635]"
          >
            סטטיסטיקות בדשבורד
          </Link>
        </div>
      </div>
    </div>
  );
}
