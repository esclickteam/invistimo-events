"use client";

import { useEffect } from "react";

type DemoToastProps = {
  open: boolean;
  onClose: () => void;
};

export default function DemoToast({ open, onClose }: DemoToastProps) {
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      onClose();
    }, 6000); // נסגר אוטומטית אחרי 6 שניות

    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
      <div
        className="
          flex items-center gap-4
          bg-[#fff7e6]
          border border-[#e6cfa3]
          text-[#5c4632]
          px-5 py-3
          rounded-xl
          shadow-lg
          text-sm
          animate-slide-up
        "
      >
        <span className="leading-relaxed">
          🧪 בדמו ניתן לצפות בדשבורד, הושבה והודעות בלבד.{" "}
          <a
            href="https://www.invistimo.com/pricing"
            className="
              font-semibold
              text-amber-700
              underline
              underline-offset-2
              hover:text-amber-900
              transition
              whitespace-nowrap
            "
          >
            להצטרפות
          </a>
        </span>
      </div>
    </div>
  );
}
