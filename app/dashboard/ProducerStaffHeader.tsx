"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ============================================================
   Producer Staff Header – Same Website Header Style
============================================================ */

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
      className="
        fixed
        top-0
        inset-x-0
        z-50
        bg-[#F7F1EA]
        pt-2
        pb-2
      "
    >
      <div
        className="
          mx-auto
          flex
          h-[76px]
          w-[92%]
          max-w-[1760px]
          items-center
          justify-between
          rounded-[26px]
          border
          border-[#D9BE8B]
          bg-[#F8F1E8]/92
          bg-[url('/noise.png')]
          bg-repeat
          px-8
          shadow-[0_10px_35px_rgba(86,60,34,0.08)]
          backdrop-blur-xl
        "
      >
        {/* RIGHT NAV */}
        <nav
          className="
            flex
            flex-1
            items-center
            justify-start
            gap-10
            text-[15px]
            font-black
            tracking-wide
            text-[#5A5148]
          "
        >
          <button
            type="button"
            onClick={() => router.push("/producer-staff/dashboard")}
            className="
              transition
              hover:text-[#A77A2F]
            "
          >
            ראשי
          </button>

          <button
            type="button"
            onClick={() => router.push("/producer-staff/dashboard")}
            className="
              transition
              hover:text-[#A77A2F]
            "
          >
            אישורי הגעה
          </button>

          <button
            type="button"
            onClick={() => router.push("/producer-staff/dashboard")}
            className="
              transition
              hover:text-[#A77A2F]
            "
          >
            סידורי הושבה
          </button>

          <button
            type="button"
            onClick={() => router.push("/producer-staff/dashboard")}
            className="
              transition
              hover:text-[#A77A2F]
            "
          >
            חבילות ומחירים
          </button>
        </nav>

        {/* CENTER LOGO */}
        <div
          className="
            flex
            flex-none
            items-center
            justify-center
            px-10
          "
        >
          <button
            type="button"
            onClick={() => router.push("/producer-staff/dashboard")}
            aria-label="מעבר לדשבורד עובד מפיק"
            className="
              flex
              items-center
              justify-center
              transition
              hover:scale-[1.02]
            "
          >
            <img
              src="/invistimo-logo.png"
              alt="Invistimo"
              className="
                h-[58px]
                w-auto
                select-none
                object-contain
              "
              draggable={false}
            />
          </button>
        </div>

        {/* LEFT ACTIONS */}
        <div
          className="
            flex
            flex-1
            items-center
            justify-end
            gap-3
          "
        >
          <button
            type="button"
            onClick={() => router.push("/producer-staff/dashboard")}
            className="
              inline-flex
              h-[48px]
              items-center
              justify-center
              gap-2
              rounded-[14px]
              bg-[#A67A2F]
              px-7
              text-[15px]
              font-black
              text-white
              shadow-[0_10px_25px_rgba(166,122,47,0.22)]
              transition
              hover:-translate-y-0.5
              hover:bg-[#936B28]
            "
          >
            ✨ נסו דמו עכשיו
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="התנתקות"
            className="
              inline-flex
              h-[48px]
              items-center
              justify-center
              gap-2
              rounded-[14px]
              border
              border-[#D9BE8B]
              bg-white/55
              px-7
              text-[15px]
              font-black
              text-[#5A5148]
              transition
              hover:bg-white
              hover:text-[#9A2B2B]
            "
          >
            <span className="text-[#A67A2F]">♙</span>
            התנתקות
          </button>
        </div>
      </div>
    </header>
  );
}