"use client";

import { useState } from "react";
import SupportBot from "./SupportBot";

export default function SupportBotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-6 z-[9999]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="פתיחת תמיכה"
            className="
              group relative
              flex h-[72px] w-[72px] items-center justify-center
              rounded-full
              border border-[#E5CFAE]
              bg-gradient-to-br from-[#E0B56E] via-[#C89343] to-[#A66E2C]
              text-white
              shadow-[0_18px_45px_rgba(145,96,42,0.34)]
              transition-all duration-300
              hover:-translate-y-1
              hover:scale-[1.04]
              hover:shadow-[0_24px_55px_rgba(145,96,42,0.42)]
              active:scale-95
            "
          >
            {/* glow */}
            <span className="absolute inset-0 -z-10 scale-110 rounded-full bg-[#D8B16A]/30 blur-xl" />

            {/* inner ring */}
            <span className="absolute inset-[6px] rounded-full border border-white/25" />

            {/* icon - הודעה */}
            <span className="relative z-10 flex items-center justify-center">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-sm"
              >
                <path
                  d="M7 18L4 20V6.8C4 5.80589 4.80589 5 5.8 5H18.2C19.1941 5 20 5.80589 20 6.8V15.2C20 16.1941 19.1941 17 18.2 17H8.5L7 18Z"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 10H16"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M8 13H13.5"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            {/* נקודת אור קטנה */}
            <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-white/85 shadow-[0_0_12px_rgba(255,255,255,0.9)]" />

            {/* tooltip */}
            <div
              className="
                pointer-events-none absolute bottom-[84px] right-1/2 translate-x-1/2
                whitespace-nowrap rounded-full
                bg-[#3E2D20] px-4 py-2
                text-xs font-bold text-white
                opacity-0 shadow-lg
                transition duration-300
                group-hover:opacity-100
              "
            >
              צריכים עזרה?
            </div>
          </button>
        </div>
      )}

      {open && <SupportBot onClose={() => setOpen(false)} />}
    </>
  );
}