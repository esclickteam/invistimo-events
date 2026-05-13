"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onSelect: (data: {
    name?: string;
    address: string;
    lat: number | null;
    lng: number | null;
  }) => void;
};

export default function LocationAutocomplete({ value, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.google ||
      !window.google.maps ||
      !window.google.maps.places ||
      !inputRef.current
    ) {
      return;
    }

    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["establishment", "geocode"],
        componentRestrictions: { country: "il" },
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();

      if (!place) return;

      const name = place.name || "";
      const address = place.formatted_address || name || "";

      const lat =
        place.geometry?.location?.lat?.() ?? null;

      const lng =
        place.geometry?.location?.lng?.() ?? null;

      onSelect({
        name: name || address,
        address,
        lat,
        lng,
      });
    });
  }, [onSelect]);

  return (
    <input
      ref={inputRef}
      defaultValue={value}
      placeholder="שם אולם או כתובת האירוע"
      className="border rounded-full px-4 py-3 w-full"
      onBlur={(e) => {
        const typedValue = e.target.value.trim();

        if (!typedValue) return;

        onSelect({
          name: typedValue,
          address: typedValue,
          lat: null,
          lng: null,
        });
      }}
    />
  );
}