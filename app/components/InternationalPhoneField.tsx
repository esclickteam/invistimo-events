"use client";

import { useMemo } from "react";
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
  stacked = false,
  id = "guest-phone-country",
  onBlur,
}: Props) {
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

  const validation = touched ? phoneFieldError(value, country) : "";
  const message = error || validation;

  return (
    <div className="min-w-0">
      <div
        className={`flex min-w-0 gap-2 ${stacked ? "flex-col" : "flex-col sm:flex-row"}`}
      >
        <label className="sr-only" htmlFor={id}>
          מדינה וקידומת
        </label>
        <select
          id={id}
          dir="ltr"
          disabled={disabled}
          value={country}
          onChange={(event) => onCountryChange(event.target.value as CountryCode)}
          className="h-12 w-full shrink-0 rounded-2xl border border-[#E3D6C3] bg-[#FCFAF6] px-3 text-sm font-bold text-[#241A14] outline-none focus:border-[#B8844F] focus:bg-white disabled:cursor-not-allowed disabled:opacity-70 sm:w-[168px]"
        >
          {options.map((iso) => (
            <option key={iso} value={iso}>
              {flagEmoji(iso)} {countryName(iso)} +{countryCallingCode(iso)}
            </option>
          ))}
        </select>
        <input
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
          className="h-12 min-w-0 flex-1 rounded-2xl border border-[#E3D6C3] bg-[#FCFAF6] px-4 text-sm font-bold text-[#241A14] outline-none focus:border-[#B8844F] focus:bg-white disabled:cursor-not-allowed disabled:bg-[#F4EEE6] disabled:opacity-80"
        />
      </div>
      {message ? (
        <p className="mt-1 text-[11px] font-bold leading-5 text-[#9B2C2C]">{message}</p>
      ) : null}
    </div>
  );
}
