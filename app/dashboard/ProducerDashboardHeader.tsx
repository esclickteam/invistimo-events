"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Props = {
  homeHref?: string;
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
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header
      dir="rtl"
      className="
        fixed
        inset-x-0
        top-0
        z-50
        bg-[#F7F1EA]
        px-4
        py-2
      "
    >
      <div
        className="
          mx-auto
          grid
          h-[78px]
          w-full
          max-w-[1760px]
          grid-cols-[1fr_auto_1fr]
          items-center
          rounded-[26px]
          border
          border-[#D8B46A]/55
          bg-[#F8F1E8]/95
          bg-[url('/noise.png')]
          bg-repeat
          px-6
          shadow-[0_10px_35px_rgba(86,60,34,0.08)]
          backdrop-blur-xl
        "
      >
        {/* ימין – ניווט */}
        <nav
          className="
            flex
            items-center
            justify-start
            gap-9
            text-[15px]
            font-black
            tracking-wide
            text-[#5A5148]
          "
        >
          <button
            type="button"
            onClick={() => router.push(homeHref)}
            className="
              flex
              items-center
              gap-2
              transition
              hover:text-[#A77A2F]
            "
          >
            <span className="text-[16px]">🏠</span>
            ראשי
          </button>
        </nav>

        {/* מרכז – לוגו */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => router.push(homeHref)}
            aria-label="מעבר לעמוד הראשי"
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
                h-[62px]
                w-auto
                select-none
                object-contain
              "
              draggable={false}
            />
          </button>
        </div>

        {/* שמאל – פעולות */}
        <div
          className="
            flex
            items-center
            justify-end
            gap-3
          "
        >
          <span
            className="
              inline-flex
              h-[34px]
              items-center
              justify-center
              rounded-full
              border
              border-[#D8B46A]/55
              bg-white/45
              px-4
              text-xs
              font-black
              text-[#6B4B2A]
              shadow-sm
              whitespace-nowrap
            "
          >
            מפיק
          </span>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="התנתקות"
            className="
              inline-flex
              h-[46px]
              items-center
              justify-center
              gap-2
              rounded-[14px]
              border
              border-[#D8B46A]/60
              bg-white/55
              px-6
              text-[15px]
              font-black
              text-[#5A5148]
              transition
              hover:bg-white
              hover:text-[#9A2B2B]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <span className="text-[#A67A2F]">♙</span>
            {loggingOut ? "מתנתק..." : "התנתקות"}
          </button>
        </div>
      </div>
    </header>
  );
}