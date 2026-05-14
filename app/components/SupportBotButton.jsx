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

            {/* icon */}
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
                  d="M4 13.5C4 9.08172 7.58172 5.5 12 5.5C16.4183 5.5 20 9.08172 20 13.5"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <path
                  d="M6 12.5H6.5C7.60457 12.5 8.5 13.3954 8.5 14.5V17C8.5 18.1046 7.60457 19 6.5 19H6C4.89543 19 4 18.1046 4 17V14.5C4 13.3954 4.89543 12.5 6 12.5Z"
                  stroke="white"
                  strokeWidth="1.8"
                />

                <path
                  d="M17.5 12.5H18C19.1046 12.5 20 13.3954 20 14.5V17C20 18.1046 19.1046 19 18 19H17.5C16.3954 19 15.5 18.1046 15.5 17V14.5C15.5 13.3954 16.3954 12.5 17.5 12.5Z"
                  stroke="white"
                  strokeWidth="1.8"
                />

                <path
                  d="M8.5 19H12C13.1046 19 14 18.1046 14 17"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <circle
                  cx="12"
                  cy="10"
                  r="2.2"
                  stroke="white"
                  strokeWidth="1.8"
                />
              </svg>
            </span>

            {/* נקודת אור קטנה */}
            <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.9)]" />

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
              תמיכה
            </div>
          </button>
        </div>
      )}

      {open && <SupportBot onClose={() => setOpen(false)} />}
    </>
  );
}