"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  countryCallingCode,
  detectCountryFromInternationalInput,
  listPhoneCountries,
  phoneFieldError,
  type CountryCode,
} from "@/lib/phones/international";

const PRIORITY: CountryCode[] = ["IL", "US", "GB", "FR", "DE", "IT", "ES"];

function flagEmoji(iso: string) {
  if (!/^[A-Z]{2}$/.test(iso)) return "";
  return [...iso]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function countryName(iso: string) {
  try {
    return new Intl.DisplayNames(["he"], { type: "region" }).of(iso) || iso;
  } catch {
    return iso;
  }
}

export const DEFAULT_PHONE_COUNTRY: CountryCode = "IL";

type Props = {
  value: string;
  country: CountryCode;
  onChange: (value: string) => void;
  onCountryChange: (country: CountryCode) => void;
  disabled?: boolean;
  touched?: boolean;
  error?: string;
  placeholder?: string;
  /** Kept for callers; layout is always compact side-by-side. */
  stacked?: boolean;
  id?: string;
  onBlur?: () => void;
};

export default function InternationalPhoneField({
  value,
  country,
  onChange,
  onCountryChange,
  disabled = false,
  touched = false,
  error = "",
  placeholder = "מספר טלפון",
  stacked: _stacked = false,
  id,
  onBlur,
}: Props) {
  const autoId = useId();
  const fieldId = id || autoId;
  const listboxId = `${fieldId}-countries`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    const countries = listPhoneCountries();
    const rank = new Map(PRIORITY.map((code, index) => [code, index]));
    return [...countries].sort((a, b) => {
      const aRank = rank.has(a) ? rank.get(a)! : 100;
      const bRank = rank.has(b) ? rank.get(b)! : 100;
      if (aRank !== bRank) return aRank - bRank;
      return countryName(a).localeCompare(countryName(b), "he");
    });
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("he");
    if (!needle) return options;
    return options.filter((iso) => {
      const name = countryName(iso).toLocaleLowerCase("he");
      const dial = countryCallingCode(iso);
      return (
        name.includes(needle) ||
        iso.toLowerCase().includes(needle) ||
        dial.includes(needle.replace(/^\+/, "")) ||
        `+${dial}`.includes(needle)
      );
    });
  }, [options, query]);

  const validation = touched ? phoneFieldError(value, country) : "";
  const message = error || validation;
  const dial = countryCallingCode(country);
  const selectedFlag = flagEmoji(country);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
        setQuery("");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative min-w-0 w-full" ref={rootRef}>
      {/*
        Phone controls stay LTR even inside Hebrew RTL pages:
        compact dial prefix on the visual left, editable number on the right.
        Dropdown is a sibling of the clipped field shell so options are not cut off.
      */}
      <div
        dir="ltr"
        className={`flex h-12 min-w-0 w-full items-stretch overflow-hidden rounded-2xl border bg-[#FCFAF6] transition ${
          message
            ? "border-[#D4A0A0] focus-within:border-[#9B2C2C] focus-within:ring-4 focus-within:ring-[#9B2C2C]/15"
            : "border-[#E3D6C3] focus-within:border-[#B8844F] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#B8844F]/15"
        } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <label className="sr-only" htmlFor={`${fieldId}-country-button`}>
          מדינה וקידומת
        </label>
        <button
          id={`${fieldId}-country-button`}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => {
              const next = !prev;
              if (!next) setQuery("");
              return next;
            });
          }}
          className="flex h-full w-[5.75rem] shrink-0 items-center justify-center gap-1 border-r border-[#E3D6C3] bg-[#FCFAF6] px-1.5 text-[13px] font-bold text-[#241A14] outline-none transition hover:bg-white disabled:cursor-not-allowed sm:w-[6.25rem]"
        >
          <span aria-hidden="true" className="text-base leading-none">
            {selectedFlag}
          </span>
          <span className="tabular-nums leading-none">+{dial}</span>
          <span aria-hidden="true" className="text-[10px] text-[#8A7B69]">
            ▾
          </span>
        </button>

        <input
          id={fieldId}
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(event) => {
            const next = event.target.value;
            onChange(next);
            const detected = detectCountryFromInternationalInput(next);
            if (detected && detected !== country) onCountryChange(detected);
          }}
          onBlur={onBlur}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-[#241A14] outline-none placeholder:text-[#A89C8E] disabled:cursor-not-allowed disabled:bg-[#F4EEE6]"
        />
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="בחירת מדינה וקידומת"
          dir="rtl"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E3D6C3] bg-white shadow-[0_18px_40px_rgba(61,42,20,0.16)]"
        >
          <div className="border-b border-[#F0E5D6] p-2">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש מדינה או קידומת"
              className="h-10 w-full rounded-xl border border-[#E3D6C3] bg-[#FCFAF6] px-3 text-sm font-bold text-[#241A14] outline-none focus:border-[#B8844F] focus:bg-white"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm font-bold text-[#8A7B69]">
                לא נמצאה מדינה
              </li>
            ) : (
              filtered.map((iso) => {
                const selected = iso === country;
                return (
                  <li key={iso}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-right text-sm font-bold transition ${
                        selected
                          ? "bg-[#F7EFE4] text-[#241A14]"
                          : "text-[#241A14] hover:bg-[#FCFAF6]"
                      }`}
                      onClick={() => {
                        onCountryChange(iso);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span aria-hidden="true" className="text-base leading-none">
                        {flagEmoji(iso)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {countryName(iso)}
                      </span>
                      <span dir="ltr" className="shrink-0 tabular-nums text-[#6B5B4B]">
                        +{countryCallingCode(iso)}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}

      {message ? (
        <p className="mt-1 text-[11px] font-bold leading-5 text-[#9B2C2C]">{message}</p>
      ) : null}
    </div>
  );
}
