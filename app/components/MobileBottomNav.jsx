"use client";

import {
  LayoutGrid,
  Shapes,
  Type,
  Image as ImageIcon,
  Sparkles,
  Folder,
} from "lucide-react";

export default function MobileBottomNav({ active, onChange }) {
  const items = [
    { id: "design", label: "Design", Icon: LayoutGrid },
    { id: "elements", label: "Elements", Icon: Shapes },
    { id: "text", label: "Text", Icon: Type },
    { id: "uploads", label: "Uploads", Icon: ImageIcon },
    { id: "tools", label: "Tools", Icon: Sparkles },
    { id: "projects", label: "Projects", Icon: Folder },
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
              onClick={() => onChange(id)}
              className="
                flex-1 py-2
                flex flex-col items-center justify-center gap-1
                text-[11px]
              "
            >
              <Icon
                size={20}
                className={isActive ? "text-black" : "text-gray-400"}
              />
              <span className={isActive ? "text-black" : "text-gray-500"}>
                {label}
              </span>
              <span
                className={`mt-1 h-[2px] w-8 rounded-full ${
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
