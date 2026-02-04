"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { nanoid } from "nanoid";
import { useZoneStore } from "@/store/zoneStore";
import { ZONE_META } from "@/config/zonesMeta";
import type { ZoneType } from "@/types/zones";

type Pos = { top: number; right: number; width: number };

export default function ZonesToolbar() {
  const addZone = useZoneStore((s) => s.addZone);
  const setSelectedZone = useZoneStore((s) => s.setSelectedZone);

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);


  const [pos, setPos] = useState<Pos>({ top: 64, right: 16, width: 224 });
  const [mounted, setMounted] = useState(false);

  

  useEffect(() => setMounted(true), []);

  const computePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();

    const DD_W = 224; // w-56
    const right = Math.max(16, window.innerWidth - r.right);
    const top = Math.round(r.bottom + 8);

    setPos({ top, right, width: DD_W });
  };

  useLayoutEffect(() => {
    if (!open) return;

    computePosition();

    const onResize = () => computePosition();
    const onScroll = () => computePosition();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const btn = btnRef.current;
      if (btn && btn.contains(target)) return;

      // בתוך הדרופדאון
      if (target.closest?.('[data-zones-dropdown="1"]')) return;

      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const portalTarget = mounted ? document.body : null;


  return (
    <div className="relative">
      <button
  ref={btnRef}
  onClick={() => setOpen((v) => !v)}
  className="
    relative z-[10000]
    flex items-center gap-2
    px-4 py-2
    rounded-lg
    bg-white
    border
    shadow-sm
    hover:bg-gray-50
    transition
    text-sm font-medium
    whitespace-nowrap
  "
>

        ➕ הוסף אלמנט
        <span className="text-xs opacity-60">▾</span>
      </button>

      {open && portalTarget
        ? createPortal(
            <div
              data-zones-dropdown="1"
              className="
  fixed
  bg-white
  border
  rounded-xl
  shadow-lg
  overflow-hidden
  pointer-events-auto
  z-[2147483647]
"
              style={{
                top: pos.top,
                right: pos.right,
                width: pos.width,
              }}
            >
              {(Object.keys(ZONE_META) as ZoneType[]).map((type) => {
                const meta = ZONE_META[type];

                return (
                  <button
                    key={type}

                    onClick={() => {
  const id = nanoid();

  addZone({
    id,
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

  // ⭐ זה השינוי הקריטי
  setSelectedZone(id);

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
            </div>,
            portalTarget
          )
        : null}
    </div>
  );
}
