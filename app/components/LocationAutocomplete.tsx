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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!window.google || !inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["establishment", "geocode"],
        componentRestrictions: { country: "il" },
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      onSelect({
        address: place.formatted_address || place.name || "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    });
  }, []);

  return (
    <input
      ref={inputRef}
      defaultValue={value}
      placeholder="כתובת האירוע"
      className="border rounded-full px-4 py-3 w-full"
    />
  );
}
