"use client";

import { useZoneStore } from "@/store/zoneStore";

const EVENT_TYPES = [
  { key: "wedding", label: "💍 חתונה" },
  { key: "bar_mitzvah", label: "🎤 בר מצווה" },
  { key: "bat_mitzvah", label: "🎤 בת מצווה" },
  { key: "brit", label: "👶 ברית / בריתה" },
  { key: "henna", label: "🪔 חינה" },
];

export default function EventTypeSelector() {
  const loadPreset = useZoneStore((s) => s.loadPreset);

  return (
    <div className="flex gap-2">
      {EVENT_TYPES.map((e) => (
        <button
          key={e.key}
          onClick={() => loadPreset(e.key)}
          className="px-3 py-1.5 text-sm rounded-lg
                     bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}
