"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ============================================================
   UI CONST
============================================================ */
const HEADER_UI = {
  height: "h-16",
  navText: "text-[20px] tracking-wide",
};

export default function ProducerDashboardHeader() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // ✅ חזרה למפיק (סיום אימפרסונציה)
  const handleBackToProducer = async () => {
    try {
      const res = await fetch("/api/producer/stop-impersonation", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Stop impersonation failed:", res.status, text.slice(0, 200));
        // fallback: עדיין ננסה להחזיר לדשבורד מפיק
        router.push("/producer/dashboard");
        return;
      }

      const data = await res.json();
      if (!data?.success) {
        console.error("Stop impersonation returned success=false:", data);
      }

      router.push("/producer/dashboard");
    } catch (err) {
      console.error("Stop impersonation error:", err);
      router.push("/producer/dashboard");
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
        {/* =========================
            ימין – כפתור ראשי
        ========================= */}
        <div className="flex justify-start">
          <button
            onClick={() => router.push("/producer/dashboard")}
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

        {/* =========================
            מרכז – לוגו
        ========================= */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push("/producer/dashboard")}
            aria-label="מעבר לדשבורד מפיק"
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

        {/* =========================
            שמאל – כפתורים
        ========================= */}
        <div className="flex justify-end items-center gap-4">

         

          {/* התנתקות */}
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
