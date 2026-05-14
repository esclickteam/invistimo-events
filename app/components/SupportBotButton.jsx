"use client";

import { useState } from "react";
import SupportBot from "./SupportBot";

export default function SupportBotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="פתיחת תמיכה"
          className="
            fixed bottom-6 right-6 z-[9999]
            group
            flex items-center gap-3
            rounded-full
            border border-[#E6D2B8]
            bg-gradient-to-l from-[#A86F2B] via-[#C8944D] to-[#D8B16A]
            px-5 py-3.5
            text-sm font-black text-white
            shadow-[0_18px_45px_rgba(145,96,42,0.34)]
            transition-all duration-300
            hover:-translate-y-1
            hover:shadow-[0_24px_55px_rgba(145,96,42,0.42)]
            active:scale-95
          "
        >
          <span
            className="
              flex h-9 w-9 items-center justify-center
              rounded-full bg-white/20
              text-lg shadow-inner
              transition group-hover:scale-110
            "
          >
            💬
          </span>

          <span>צריכים עזרה?</span>

          <span className="absolute inset-0 -z-10 rounded-full bg-[#D8B16A]/35 blur-xl" />
        </button>
      )}

      {open && <SupportBot onClose={() => setOpen(false)} />}
    </>
  );
}