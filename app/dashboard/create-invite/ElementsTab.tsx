"use client";

import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEditorStore } from "./editorStore";

interface ElementItem {
  name: string;
  url: string;
}

type ElementPreset = {
  label: string;
  width: number;
  height: number;
  tone: string;
};

const ELEMENT_PRESETS: Record<string, ElementPreset> = {
  במה: {
    label: "במה",
    width: 320,
    height: 170,
    tone: "from-[#f7d8c7] via-[#efc0ad] to-[#c9977c]",
  },
  חופה: {
    label: "חופה",
    width: 260,
    height: 190,
    tone: "from-[#fff8ec] via-[#f1dfbd] to-[#d7b36b]",
  },
  "רחבת ריקודים": {
    label: "רחבת ריקודים",
    width: 420,
    height: 230,
    tone: "from-[#fbf4e9] via-[#eadcc8] to-[#c6a66a]",
  },
  "קבלת פנים": {
    label: "קבלת פנים",
    width: 320,
    height: 180,
    tone: "from-[#f8efe4] via-[#e7d3bd] to-[#bfa17d]",
  },
  בר: {
    label: "בר",
    width: 340,
    height: 160,
    tone: "from-[#fff4df] via-[#ddbd7c] to-[#9f7435]",
  },
  בופה: {
    label: "בופה",
    width: 340,
    height: 150,
    tone: "from-[#f5e8d2] via-[#d7b98a] to-[#a77c43]",
  },
};

function getPreset(name: string): ElementPreset {
  return (
    ELEMENT_PRESETS[name] || {
      label: name,
      width: 220,
      height: 220,
      tone: "from-[#fff8ef] via-[#ead8bd] to-[#c8a36a]",
    }
  );
}

function ElementsTabComponent() {
  const addObject = useEditorStore((s) => s.addObject);

  const { data = [], isLoading } = useQuery<ElementItem[]>({
    queryKey: ["library", "elements"],
    queryFn: async () => {
      const res = await fetch("/api/invity/library/elements");

      if (!res.ok) {
        throw new Error("Failed to load elements");
      }

      return res.json();
    },
  });

  if (isLoading) return <SkeletonGrid />;

  if (!data.length) {
    return (
      <div className="rounded-[24px] border border-[#EFE4D4] bg-[#FFFDF9] px-5 py-8 text-center shadow-[0_18px_45px_rgba(80,55,25,0.08)]">
        <p className="text-sm font-bold text-[#8B765D]">
          אין אלמנטים זמינים כרגע.
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-[28px] border border-[#EFE2CF] bg-gradient-to-br from-[#FFFDF9] via-[#FBF5EC] to-[#F3E6D4] p-4 shadow-[0_22px_55px_rgba(75,52,24,0.12)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-black text-[#4E3C2C]">
              אלמנטים לאולם
            </h3>
            <p className="mt-1 text-[12px] font-medium text-[#9A836A]">
              גררי או לחצי כדי להוסיף אלמנט לתכנון
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E7D4B7] bg-[#FFF9EF] text-lg shadow-[inset_0_2px_5px_rgba(255,255,255,0.9),0_10px_20px_rgba(116,82,38,0.12)]">
            ✨
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {data.map((item) => {
            const preset = getPreset(item.name);

            return (
              <button
                key={item.name}
                type="button"
                onClick={() =>
                  addObject({
                    id: crypto.randomUUID(),
                    type: "image",
                    url: item.url,
                    x: 150,
                    y: 150,
                    width: preset.width,
                    height: preset.height,
                  })
                }
                className="
                  group relative overflow-hidden rounded-[24px]
                  border border-[#EADCC9]
                  bg-[#FFFDF9]
                  p-3 text-right
                  shadow-[0_14px_30px_rgba(73,50,23,0.10)]
                  transition-all duration-300
                  hover:-translate-y-1
                  hover:border-[#D4AA61]
                  hover:shadow-[0_22px_45px_rgba(73,50,23,0.18)]
                  active:scale-[0.98]
                "
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-[#D2AA63]/10 opacity-80" />

                <div
                  className={`
                    relative mb-3 flex h-24 items-center justify-center overflow-hidden
                    rounded-[20px]
                    border border-[#E7D4B7]
                    bg-gradient-to-br ${preset.tone}
                    shadow-[inset_0_3px_7px_rgba(255,255,255,0.75),inset_0_-10px_18px_rgba(91,57,22,0.14),0_12px_22px_rgba(82,57,25,0.18)]
                  `}
                >
                  <div className="absolute inset-x-4 top-2 h-5 rounded-full bg-white/35 blur-md" />

                  <img
                    src={item.url}
                    alt={item.name}
                    loading="lazy"
                    className="
                      relative z-10 max-h-[82px] max-w-[90%]
                      object-contain
                      drop-shadow-[0_10px_12px_rgba(72,48,22,0.25)]
                      transition-transform duration-300
                      group-hover:scale-105
                    "
                  />

                  <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-black/10 to-transparent" />
                </div>

                <div className="relative flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-black text-[#4C3A2C]">
                      {preset.label}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#A48B70]">
                      אלמנט תלת־מימדי
                    </p>
                  </div>

                  <span
                    className="
                      flex h-8 w-8 items-center justify-center rounded-full
                      border border-[#E5D3BA]
                      bg-[#FFF8EE]
                      text-lg text-[#A87A35]
                      shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_7px_14px_rgba(89,61,27,0.12)]
                      transition-all duration-300
                      group-hover:bg-[#F6E6CC]
                      group-hover:text-[#7B5625]
                    "
                  >
                    +
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(ElementsTabComponent);

function SkeletonGrid() {
  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-[28px] border border-[#EFE2CF] bg-[#FFFDF9] p-4 shadow-[0_22px_55px_rgba(75,52,24,0.10)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="h-4 w-28 animate-pulse rounded-full bg-[#EADCC9]" />
            <div className="mt-2 h-3 w-40 animate-pulse rounded-full bg-[#F1E7D9]" />
          </div>

          <div className="h-10 w-10 animate-pulse rounded-2xl bg-[#F1E7D9]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="
                h-36 animate-pulse rounded-[24px]
                border border-[#EFE2CF]
                bg-gradient-to-br from-[#FFF8EE] via-[#F6EBDD] to-[#EAD8BD]
              "
            />
          ))}
        </div>
      </div>
    </div>
  );
}