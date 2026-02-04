"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import GuestSidebar from "./GuestSidebar";

export default function MobileGuests({ onDragStart, onClose }) {
  const drawerRef = useRef(null);
  const startX = useRef(0);
  const [translateX, setTranslateX] = useState(0);
  const [closing, setClosing] = useState(false);

  /* 🔒 נועל גלילה ברקע */
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  /* 👉 התחלת סווייפ */
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  /* 👉 תנועה */
  const handleTouchMove = (e) => {
    const delta = e.touches[0].clientX - startX.current;
    if (delta > 0) {
      setTranslateX(delta);
    }
  };

  /* 👉 שחרור */
  const handleTouchEnd = () => {
    if (translateX > 120) {
      closeWithAnimation();
    } else {
      setTranslateX(0);
    }
  };

  const closeWithAnimation = () => {
    setClosing(true);
    setTranslateX(window.innerWidth);
    setTimeout(onClose, 220);
  };

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="רשימת אורחים"
    >
      {/* overlay */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={closeWithAnimation}
      />

      {/* drawer */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-[88%] max-w-[420px] bg-white flex flex-col shadow-2xl transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧾</span>
            <span className="font-semibold">רשימת אורחים</span>
          </div>

          <button
            onClick={closeWithAnimation}
            aria-label="סגור רשימת אורחים"
            className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <GuestSidebar
            variant="mobile"
            onDragStart={onDragStart}
          />
        </div>

        {/* grab handle */}
        <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 h-24 w-1.5 rounded-full bg-gray-300/70" />
      </div>
    </div>
  );
}
