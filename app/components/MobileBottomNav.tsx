"use client";

import {
  Type,
  HeartHandshake,
  Gem,
  Image as ImageIcon,
  PartyPopper,
} from "lucide-react";

export type MobileNavTab =
  | "text"
  | "blessing"
  | "wedding"
  | "backgrounds"
  | "batmitzvah";

interface MobileBottomNavProps {
  active: MobileNavTab;
  onChange: (tab: MobileNavTab) => void;
}

export default function MobileBottomNav({
  active,
  onChange,
}: MobileBottomNavProps) {
  const items: Array<{
    id: MobileNavTab;
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    { id: "text", label: "טקסט", Icon: Type },
    { id: "blessing", label: "ברית/ה", Icon: HeartHandshake },
    { id: "wedding", label: "חתונה", Icon: Gem },
    { id: "backgrounds", label: "רקעים", Icon: ImageIcon },
    { id: "batmitzvah", label: "בת/מצווה, חינה ועוד", Icon: PartyPopper },
  ];

  return (
    <div
      className="
        md:hidden
        fixed bottom-0 left-0 right-0 z-50
        bg-white/95 backdrop-blur
        border-t border-gray-200
        pb-[env(safe-area-inset-bottom)]
      "
    >
      <div className="flex items-stretch justify-between px-2">
        {items.map(({ id, label, Icon }) => {
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="
                flex-1 py-2
                flex flex-col items-center justify-center gap-1
                text-[11px]
                transition-colors
                active:scale-95
              "
            >
              <Icon
                size={20}
                className={isActive ? "text-black" : "text-gray-400"}
              />

              <span
                className={`whitespace-nowrap ${
                  isActive ? "text-black" : "text-gray-500"
                }`}
              >
                {label}
              </span>

              <span
                className={`mt-1 h-[2px] w-8 rounded-full transition-colors ${
                  isActive ? "bg-black" : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
