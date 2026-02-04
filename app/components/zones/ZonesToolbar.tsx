"use client";

import { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { useZoneStore } from "@/store/zoneStore";
import { ZONE_META } from "@/config/zonesMeta";
import type { ZoneType } from "@/types/zones";

import { useSeatingStore } from "@/store/seatingStore";


export default function ZonesToolbar() {
  const addZone = useZoneStore((s) => s.addZone);
const canvasView = useSeatingStore((s) => s.canvasView);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // סגירה בלחיצה מחוץ לדרופדאון
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* כפתור פתיחה */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          flex items-center gap-2
          px-4 py-2
          rounded-lg
          bg-white
          border
          shadow-sm
          hover:bg-gray-50
          transition
          text-sm font-medium
        "
      >
        ➕ הוסף אלמנט
        <span className="text-xs opacity-60">▾</span>
      </button>

      {/* הדרופדאון */}
      {open && (
        <div
          className="
            absolute right-0 mt-2
            w-56
            bg-white
            border
            rounded-xl
            shadow-lg
            z-50
            overflow-hidden
          "
        >
          {(Object.keys(ZONE_META) as ZoneType[]).map((type) => {
            const meta = ZONE_META[type];

            return (
              <button
                key={type}
                onClick={() => {
                  const view = canvasView ?? { x: 0, y: 0, scale: 1 };
                  const isMobile = window.innerWidth < 768;
                  const UI_OFFSET_Y = isMobile ? 120 : 0;

                  const centerX =
                    (-view.x + window.innerWidth / 2) / view.scale;
                  const centerY =
                    (-view.y +
                      window.innerHeight / 2 -
                      UI_OFFSET_Y) /
                    view.scale;

                  addZone({
                    id: nanoid(),
                    type,
                    name: meta.label,
                    icon: meta.icon,
                    color: meta.color,
                    opacity: 0.35,
                    x: centerX,
                    y: centerY,
                    width: meta.defaultSize.width,
                    height: meta.defaultSize.height,
                    rotation: 0,
                    locked: false,
                  });

                  setOpen(false);
                }}
                className="
                  w-full flex items-center gap-3
                  px-4 py-3
                  text-right
                  hover:bg-indigo-50
                  transition
                  text-sm
                "
              >
                <span className="text-lg">{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
