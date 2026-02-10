"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ============================================================
   UI CONST – זהה להידר מפיק
============================================================ */
const HEADER_UI = {
  height: "h-16",
  navText: "text-[20px] tracking-wide",
};

export default function ProducerStaffHeader() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
      router.replace("/login"); // fallback only
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
        <div className="flex justify-start items-center gap-3">
          <button
            onClick={() => router.push("/producer-staff/dashboard")}
            className={`
              font-medium text-[#4a413a]
              ${HEADER_UI.navText}
              hover:text-[var(--champagne-dark)]
              transition
              flex items-center gap-2
            `}
          >
            🏠 ראשי
          </button>

          <span
            className="
              text-xs font-semibold
              px-2 py-0.5
              rounded-full
              bg-[#ede3d7]
              text-[#6b4b2a]
              border border-[#d6c4b0]
              whitespace-nowrap
            "
          >
            עובד מפיק
          </span>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => router.push("/producer-staff/dashboard")}
            aria-label="מעבר לדשבורד עובד מפיק"
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

        <div className="flex justify-end items-center gap-4">
          <button
            onClick={handleLogout}
            className={`
              font-medium
              ${HEADER_UI.navText}
              text-red-600
              hover:text-red-700
              transition
            `}
            title="התנתקות"
          >
            🚪 התנתקות
          </button>
        </div>
      </div>
    </header>
  );
}
