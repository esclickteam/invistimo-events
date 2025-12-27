"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type DemoToastProps = {
  open: boolean;
  onClose: () => void;
};

export default function DemoToast({ open, onClose }: DemoToastProps) {
  const router = useRouter();

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
        <span>
          🧪 בדמו ניתן לצפות בדשבורד, הושבה והודעות בלבד
        </span>

        <button
          onClick={() => router.push("/login")}
          className="
            whitespace-nowrap
            px-4 py-1.5
            rounded-full
            bg-[#c9b48f]
            text-white
            font-medium
            hover:bg-[#b7a27a]
            transition
          "
        >
          להתחברות
        </button>
      </div>
    </div>
  );
}
