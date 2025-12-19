"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onSelect: (data: {
    address: string;
    lat: number;
    lng: number;
  }) => void;
};

export default function LocationAutocomplete({ value, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null); // ✅ אין google כ־type

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

      if (!place?.geometry?.location) return;

      onSelect({
        address: place.formatted_address || place.name || "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    });
  }, [onSelect]);

  return (
    <input
      ref={inputRef}
      defaultValue={value}
      placeholder="כתובת האירוע"
      className="border rounded-full px-4 py-3 w-full"
    />
  );
}
