"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ============================================================
   UI CONST
============================================================ */
const HEADER_UI = {
  height: "h-16",
  navText: "text-[20px] tracking-wide",
};

type Props = {
  homeHref?: string; // לדוגמה: "/producer/dashboard" או "/producer-staff/dashboard"
};

export default function ProducerDashboardHeader({
  homeHref = "/producer/dashboard",
}: Props) {
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      // חשוב: logout צריך להיות המקום היחיד שמנקה auth + מפנה
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
      // fallback רק אם logout נכשל
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header
      dir="rtl"
      className={`
        fixed top-0 inset-x-0 z-40
        ${HEADER_UI.height}
        border-b border-[#e2d6c8]
        bg-[#f5eee7]
        bg-[url('/noise.png')] bg-repeat
      `}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full px-4 md:px-10">
        {/* ימין – ראשי */}
        <div className="flex justify-start">
          <button
            onClick={() => router.push(homeHref)}
            className={`
              font-medium text-[#4a413a]
              ${HEADER_UI.navText}
              hover:text-[var(--champagne-dark)]
              transition
            `}
          >
            🏠 ראשי
          </button>
        </div>

        {/* מרכז – לוגו */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push(homeHref)}
            aria-label="מעבר לדשבורד"
            className="scale-[4]"
          >
            <img
              src="/invistimo-logo.png"
              alt="Invistimo"
              className="h-10 w-auto select-none"
              draggable={false}
            />
          </button>
        </div>

        {/* שמאל – התנתקות */}
        <div className="flex justify-end items-center gap-4">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`
              font-medium
              ${HEADER_UI.navText}
              text-red-600
              hover:text-red-700
              transition
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            title="התנתקות"
          >
            {loggingOut ? "מתנתק..." : "🚪 התנתקות"}
          </button>
        </div>
      </div>
    </header>
  );
}
