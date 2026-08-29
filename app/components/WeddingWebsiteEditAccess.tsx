"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { hasWeddingWebsiteFeature } from "@/lib/features/entitlements";

export default function WeddingWebsiteEditAccess() {
  const { user } = useAuth();
  const enabled = hasWeddingWebsiteFeature(user);

  if (!enabled) return null;

  return (
    <div
      dir="rtl"
      className="overflow-hidden rounded-[34px] border border-[#E3D0B8] bg-[#FFFDF9] shadow-[0_22px_70px_rgba(92,65,35,0.13)]"
    >
      <div className="border-b border-[#EFE4D6] bg-gradient-to-l from-[#F8EBD7] via-[#FFF8EE] to-white px-7 py-6">
        <p className="text-xs font-black text-[#8B5E34]">הזמנה · אתר החתונה</p>
        <h2 className="mt-2 text-2xl font-black text-[#241A14]">עריכת אתר החתונה</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-[#8A7B69]">
          ניהול האירוע נשאר בדשבורד הרגיל. כאן עורכים רק את עיצוב האתר שהאורחים
          מקבלים בקישור האישי שלהם.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 px-7 py-5">
        <span className="rounded-2xl bg-[#FFF4DF] px-4 py-3 text-sm font-black text-[#B8844F]">
          הזמנה
        </span>
        <Link
          href="/dashboard/wedding-website"
          className="rounded-2xl bg-[#B8844F] px-4 py-3 text-sm font-black text-white"
        >
          אתר החתונה
        </Link>
        <Link
          href="/dashboard/guest-messages"
          className="rounded-2xl border border-[#E7DED1] bg-white px-4 py-3 text-sm font-black text-[#241A14]"
        >
          הודעות מהאורחים
        </Link>
      </div>
    </div>
  );
}
