"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ============================================================
   PRODUCER STAFF HEADER – Invistimo Luxury Style
============================================================ */
const HEADER_UI = {
  height: "h-[76px]",
};

export default function ProducerStaffHeader() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
      router.replace("/login");
    }
  };

  return (
    <header
      dir="rtl"
      className={`
        fixed top-0 inset-x-0 z-40
        ${HEADER_UI.height}
        border-b border-[#E8DCCB]/90
        bg-[#F8F1E8]/88
        shadow-[0_10px_34px_rgba(92,64,36,0.08)]
        backdrop-blur-2xl
      `}
    >
      <div
        className="
          relative
          grid h-full grid-cols-[1fr_auto_1fr]
          items-center
          px-4 md:px-10
        "
      >
        {/* RIGHT ACTIONS */}
        <div className="flex items-center justify-start gap-3">
          <button
            type="button"
            onClick={() => router.push("/producer-staff/dashboard")}
            className="
              group
              inline-flex h-11 items-center justify-center gap-2
              rounded-2xl
              border border-[#E2CDAE]
              bg-white/78
              px-4
              text-sm font-black
              text-[#3B2C1D]
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:bg-white
              hover:shadow-[0_12px_30px_rgba(103,75,42,0.10)]
            "
          >
            <span className="text-base leading-none">🏠</span>
            ראשי
          </button>

          <span
            className="
              hidden sm:inline-flex
              h-9 items-center justify-center
              rounded-full
              border border-[#DFC9AA]
              bg-[#FFF8EA]/85
              px-3
              text-xs font-black
              text-[#8A6537]
              shadow-sm
              whitespace-nowrap
            "
          >
            עובד מפיק
          </span>
        </div>

        {/* CENTER LOGO */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => router.push("/producer-staff/dashboard")}
            aria-label="מעבר לדשבורד עובד מפיק"
            className="
              group
              relative
              flex items-center justify-center
              rounded-full
              px-4 py-2
              transition
              hover:scale-[1.02]
            "
          >
            <span
              className="
                pointer-events-none
                absolute inset-0
                rounded-full
                bg-white/40
                blur-xl
                opacity-0
                transition
                group-hover:opacity-100
              "
            />

            <img
              src="/invistimo-logo.png"
              alt="Invistimo"
              className="
                relative
                h-11 w-auto
                select-none
                drop-shadow-[0_8px_18px_rgba(92,64,36,0.10)]
              "
              draggable={false}
            />
          </button>
        </div>

        {/* LEFT ACTIONS */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="
              inline-flex h-11 items-center justify-center gap-2
              rounded-2xl
              border border-[#F0C8C8]
              bg-white/78
              px-4
              text-sm font-black
              text-[#B42318]
              shadow-sm
              transition
              hover:-translate-y-0.5
              hover:bg-[#FFF5F5]
              hover:text-[#991B1B]
              hover:shadow-[0_12px_30px_rgba(180,35,24,0.10)]
            "
            title="התנתקות"
          >
            <span className="text-base leading-none">🚪</span>
            התנתקות
          </button>
        </div>
      </div>

      {/* subtle luxury line */}
      <div
        className="
          pointer-events-none
          absolute bottom-0 left-0 right-0
          h-px
          bg-gradient-to-l
          from-transparent
          via-[#D8B46A]/60
          to-transparent
        "
      />
    </header>
  );
}