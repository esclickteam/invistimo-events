"use client";

import { nanoid } from "nanoid";
import { useZoneStore } from "@/store/zoneStore";
import { ZONE_META } from "@/config/zonesMeta";
import type { ZoneType } from "@/types/zones";

export default function ZonesToolbar() {
  const addZone = useZoneStore((s) => s.addZone);

  return (
    <div
      className="
        w-full
        bg-white
        border-b
        sm:border-b-0
        sm:border-t
        sticky
        top-[56px]
        sm:top-auto
        z-20
      "
    >
      {/* תוכן פנימי – גלילה אופקית */}
      <div
        className="
          flex items-center gap-2
          px-3 py-2
          overflow-x-auto
          scrollbar-hide
        "
      >
        {/* כותרת – נעלמת במובייל */}
        <span className="hidden sm:inline text-sm font-semibold text-gray-700 ml-2 whitespace-nowrap">
          אלמנטים:
        </span>

        {(Object.keys(ZONE_META) as ZoneType[]).map((type) => {
          const meta = ZONE_META[type];

          return (
            <button
              key={type}
              onClick={() => {
                addZone({
                  id: nanoid(),
                  type,
                  name: meta.label,
                  icon: meta.icon,
                  color: meta.color,
                  opacity: 0.35,

                  x: 300,
                  y: 200,
                  width: meta.defaultSize.width,
                  height: meta.defaultSize.height,
                  rotation: 0,
                  locked: false,
                });
              }}
              className="
                flex items-center gap-2
                px-3 py-2
                rounded-xl
                border
                bg-gray-50
                hover:bg-indigo-50
                hover:border-indigo-300
                active:scale-[0.97]
                transition
                text-sm
                whitespace-nowrap
                shrink-0
              "
            >
              <span className="text-lg leading-none">
                {meta.icon}
              </span>

              {/* טקסט – בדסקטופ כן, במובייל רק אייקון */}
              <span className="hidden sm:inline">
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
