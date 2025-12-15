"use client";

import { useState } from "react";
import { BOT_FLOW } from "../data/supportBotFlow";

export default function SupportBot({ onClose }) {
  const [step, setStep] = useState("start");

  const current = BOT_FLOW[step];

  return (
    <div
      className="
        fixed bottom-24 right-6
        w-[320px]
        bg-white
        rounded-2xl
        shadow-2xl
        border border-[#eadfce]
        p-5
        z-[9999]
      "
      dir="rtl"
    >
      {/* כותרת */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[#5c4632]">
          💬 עוזרת לך לבחור נכון
        </p>

        <button
          onClick={onClose}
          aria-label="סגירת הבוט"
          className="text-[#999] hover:text-[#5c4632] transition"
        >
          ✕
        </button>
      </div>

      {/* טקסט */}
      <p className="text-sm text-[#5c4632] mb-4 leading-relaxed">
        {current.message}
      </p>

      {/* אפשרויות */}
      {current.options && (
        <div className="flex flex-col gap-2">
          {current.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setStep(opt.next)}
              className="
                w-full
                rounded-xl
                border border-[#c7a17a]
                px-4 py-2
                text-sm font-medium
                text-[#5c4632]
                hover:bg-[#c7a17a]
                hover:text-white
                transition
              "
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* חזרה */}
      {current.back && (
        <button
          onClick={() => setStep("start")}
          className="mt-4 text-xs text-[#7b6754] underline hover:text-[#5c4632]"
        >
          ← חזרה לתפריט הראשי
        </button>
      )}
    </div>
  );
}
