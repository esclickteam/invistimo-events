"use client";

import { useEffect, useRef } from "react";
import { resolveMapPinInBrowser } from "@/lib/resolveMapPin.client";

type SelectedPlace = {
  inputValue: string;
  name?: string;
  address: string;
  lat: number | null;
  lng: number | null;
  placeId?: string | null;
};

type Props = {
  value: string;
  onSelect: (data: {
    name?: string;
    address: string;
    lat: number | null;
    lng: number | null;
    placeId?: string | null;
  }) => void;
};

function samePlaceText(typedValue: string, selected: SelectedPlace) {
  const candidates = [
    selected.inputValue,
    selected.address,
    selected.name,
    selected.name && selected.address
      ? `${selected.name}, ${selected.address}`
      : "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return candidates.includes(typedValue);
}

export default function LocationAutocomplete({ value, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);
  const selectedPlaceRef = useRef<SelectedPlace | null>(null);

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

      const lat = place.geometry?.location?.lat?.() ?? null;
      const lng = place.geometry?.location?.lng?.() ?? null;
      const placeId = place.place_id || "";

      const selected: SelectedPlace = {
        inputValue: inputRef.current?.value?.trim() || address,
        name: name || address,
        address,
        lat,
        lng,
        placeId,
      };

      selectedPlaceRef.current = selected;
      onSelect({
        name: selected.name,
        address: selected.address,
        lat: selected.lat,
        lng: selected.lng,
        placeId: selected.placeId,
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

        const selected = selectedPlaceRef.current;
        if (selected && samePlaceText(typedValue, selected)) {
          return;
        }

        if (typedValue === String(value || "").trim()) {
          return;
        }

        selectedPlaceRef.current = null;
        onSelect({
          name: typedValue,
          address: typedValue,
          lat: null,
          lng: null,
          placeId: null,
        });

        void resolveMapPinInBrowser({
          name: typedValue,
          address: typedValue,
        }).then((pin) => {
          if (!pin) return;
          if (inputRef.current?.value.trim() !== typedValue) return;

          const selected: SelectedPlace = {
            inputValue: typedValue,
            name: typedValue,
            address: typedValue,
            lat: pin.lat,
            lng: pin.lng,
            placeId: null,
          };
          selectedPlaceRef.current = selected;
          onSelect({
            name: typedValue,
            address: typedValue,
            lat: pin.lat,
            lng: pin.lng,
            placeId: null,
          });
        });
      }}
    />
  );
}
