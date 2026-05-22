"use client";

import { useRouter } from "next/navigation";

export default function DashboardEventPage() {
  const router = useRouter();

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#F6F1EA] p-6"
    >
      <div className="max-w-lg rounded-[28px] border border-[#E3D0B8] bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-[#241A14]">
          יש לפתוח עריכת אירוע מתוך הזמנה קיימת
        </h1>

        <p className="mt-3 text-sm font-semibold leading-7 text-[#8A7B69]">
          כדי לערוך פרטי אירוע, צריך להיכנס דרך ההזמנה הספציפית.
        </p>

        <button
          type="button"
          onClick={() => router.push("/dashboard/invitations")}
          className="mt-6 rounded-2xl bg-[#B8844F] px-6 py-3 text-sm font-black text-white"
        >
          מעבר להזמנות
        </button>
      </div>
    </div>
  );
}