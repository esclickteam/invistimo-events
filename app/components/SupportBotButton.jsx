"use client";

import { useState } from "react";
import SupportBot from "./SupportBot";

export default function SupportBotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* כפתור צף */}
      <button
        onClick={() => setOpen(true)}
        aria-label="פתיחת בוט תמיכה"
        className="
          fixed bottom-6 left-6
          z-[9999]
          bg-[#c7a17a] text-white
          rounded-full px-5 py-3
          shadow-xl
          hover:scale-105
          active:scale-95
          transition
        "
      >
        💬 צריכים עזרה?
      </button>

      {/* חלון הבוט */}
      {open && <SupportBot onClose={() => setOpen(false)} />}
    </>
  );
}
