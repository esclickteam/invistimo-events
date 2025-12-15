"use client";

import { useState } from "react";

export default function AccessibilityButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* כפתור נגישות */}
      <button
        aria-label="פתיחת תפריט נגישות"
        onClick={() => setOpen(true)}
        className="
          fixed bottom-6 right-6
          z-[9999]
          bg-[#5c4632] text-white
          rounded-full px-4 py-3
          shadow-lg
          hover:scale-105
          transition
        "
      >
        ♿ נגישות
      </button>

      {open && <AccessibilityPanel onClose={() => setOpen(false)} />}
    </>
  );
}
