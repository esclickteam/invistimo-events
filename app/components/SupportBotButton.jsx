"use client";

import { useState } from "react";
import SupportBot from "./SupportBot";

export default function SupportBotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-[#c7a17a] text-white rounded-full px-5 py-3 shadow-lg hover:scale-105 transition z-40"
      >
        💬 צריכים עזרה?
      </button>

      {open && <SupportBot onClose={() => setOpen(false)} />}
    </>
  );
}
