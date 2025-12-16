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
        flex items-center gap-3
        px-4 py-2
        bg-white
        border-b
        overflow-x-auto
      "
    >
      <span className="text-sm font-semibold text-gray-700 ml-2">
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
              px-3 py-1.5
              rounded-lg
              border
              bg-gray-50
              hover:bg-indigo-50
              hover:border-indigo-300
              text-sm
              whitespace-nowrap
            "
          >
            <span className="text-lg">{meta.icon}</span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
