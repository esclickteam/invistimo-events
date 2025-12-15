"use client";

import { useState } from "react";
import { BOT_FLOW } from "../data/supportBotFlow";

export default function SupportBot({ onClose }) {
  const [step, setStep] = useState("start");

  const current = BOT_FLOW[step];

  return (
    <div className="fixed bottom-24 right-6 w-80 bg-white rounded-2xl shadow-xl border border-[#eadfce] p-4 z-50">
      <p className="text-sm mb-4">{current.message}</p>

      {current.options && (
        <div className="flex flex-col gap-2">
          {current.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setStep(opt.next)}
              className="rounded-xl border border-[#c7a17a] px-4 py-2 text-sm hover:bg-[#c7a17a] hover:text-white transition"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {current.back && (
        <button
          onClick={() => setStep("start")}
          className="mt-4 text-xs underline text-[#7b6754]"
        >
          חזרה לתפריט הראשי
        </button>
      )}

      <button
        onClick={onClose}
        className="absolute top-2 left-2 text-xs text-[#999]"
      >
        ✕
      </button>
    </div>
  );
}
