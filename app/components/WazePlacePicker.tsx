"use client";

import { useEffect, useRef, useState } from "react";
import {
  parseWazeDestinationInput,
  type ParsedWazeDestination,
} from "@/lib/navigationLinks";
import type { WazePlace } from "@/lib/resolveWazePlace";

type Props = {
  value: string;
  biasLat?: number | null;
  biasLng?: number | null;
  onChange: (parsed: ParsedWazeDestination) => void;
  onSelect: (place: WazePlace) => void;
};

function skipLiveSearch(value: string) {
  const parsed = parseWazeDestinationInput(value);
  return (
    parsed.wazeLat != null ||
    /^(https?:\/\/|waze:\/\/|geo:)/i.test(parsed.wazeUrl)
  );
}

export default function WazePlacePicker({
  value,
  biasLat,
  biasLng,
  onChange,
  onSelect,
}: Props) {
  const [places, setPlaces] = useState<WazePlace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || skipLiveSearch(query)) {
      setPlaces([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (biasLat != null && biasLng != null) {
          params.set("lat", String(biasLat));
          params.set("lng", String(biasLng));
        }
        const res = await fetch(`/api/waze/search?${params.toString()}`, {
          credentials: "include",
        });
        const data = await res.json();
        setPlaces(Array.isArray(data?.places) ? data.places : []);
        setOpen(true);
      } catch {
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [value, biasLat, biasLng]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        dir="auto"
        className="w-full rounded-[20px] border border-[#E3D6C3] bg-[#FCFAF6] px-4 py-3 text-sm text-[#4A3F35] outline-none transition focus:border-[#B8844F] focus:bg-white focus:ring-4 focus:ring-[#D9B46F]/15"
        placeholder="חפשו ב-Waze, הדביקו קישור, או lat,lng"
        value={value}
        onChange={(e) => {
          onChange(parseWazeDestinationInput(e.target.value));
          setOpen(true);
        }}
        onFocus={() => {
          if (places.length) setOpen(true);
        }}
        autoComplete="off"
      />

      {open && (loading || places.length > 0) && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#E3D6C3] bg-white shadow-[0_12px_30px_rgba(91,63,31,0.12)]">
          {loading && !places.length ? (
            <p className="px-4 py-3 text-sm font-semibold text-[#9B8D7D]">
              מחפש ב-Waze…
            </p>
          ) : (
            places.map((place) => (
              <button
                key={`${place.lat},${place.lng},${place.name}`}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-right hover:bg-[#FCFAF6]"
                onClick={() => {
                  onSelect(place);
                  setPlaces([]);
                  setOpen(false);
                }}
              >
                <span className="text-sm font-black text-[#4A3F35]">
                  {place.name}
                </span>
                {place.subtitle ? (
                  <span className="text-xs font-semibold text-[#9B8D7D]">
                    {place.subtitle}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
