"use client";

import { useState } from "react";
import { X } from "lucide-react";
import GuestSidebar from "./GuestSidebar";

export default function MobileGuests({ onDragStart }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ☰ כפתור המבורגר */}
      <button
        onClick={() => setOpen(true)}
        className="
          md:hidden
          fixed top-20 right-4 z-50
          w-12 h-12 rounded-full
          bg-[#c9b48f] text-white
          shadow-lg
          flex items-center justify-center
        "
        aria-label="פתח רשימת אורחים"
      >
        ☰
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* תוכן */}
          <div className="absolute right-0 top-0 h-full w-[85%] bg-white flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-semibold">🧾 רשימת אורחים</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="סגור רשימת אורחים"
              >
                <X />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <GuestSidebar
                variant="mobile"
                onDragStart={onDragStart}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
