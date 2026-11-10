"use client";

import { useEffect, useState } from "react";
import {
  PHONE_DUPLICATE_MESSAGE,
  PHONE_LENGTH_REVIEW_MESSAGE,
  normalizePhoneKey,
} from "@/lib/guestPhone";
import { usePhoneAvailability } from "@/app/components/usePhoneAvailability";
import InternationalPhoneField, {
  DEFAULT_PHONE_COUNTRY,
} from "@/app/components/InternationalPhoneField";
import {
  parseGuestPhone,
  type CountryCode,
} from "@/lib/phones/international";

type Props = {
  value: string;
  onChange: (value: string) => void;
  invitationId?: string;
  excludeGuestId?: string;
  otherPhones?: Array<string | null | undefined>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onDuplicateChange?: (duplicate: boolean) => void;
  country?: CountryCode;
  onCountryChange?: (country: CountryCode) => void;
  stacked?: boolean;
  id?: string;
};

export default function GuestPhoneField({
  value,
  onChange,
  invitationId,
  excludeGuestId,
  otherPhones,
  disabled = false,
  placeholder = "מספר טלפון",
  className = "",
  onDuplicateChange,
  country,
  onCountryChange,
  stacked = false,
  id,
}: Props) {
  const detected = parseGuestPhone(value);
  const [innerCountry, setInnerCountry] = useState<CountryCode>(
    country || (detected.ok && detected.country ? detected.country : DEFAULT_PHONE_COUNTRY)
  );
  const selectedCountry = country || innerCountry;
  const [touched, setTouched] = useState(false);
  const status = usePhoneAvailability({
    invitationId,
    phone: value,
    excludeGuestId,
    otherPhones,
    disabled,
  });

  useEffect(() => {
    onDuplicateChange?.(status.duplicate);
  }, [onDuplicateChange, status.duplicate]);

  return (
    <div
      className={`min-w-0 w-full ${className} ${
        disabled ? "pointer-events-none opacity-80" : ""
      }`}
    >
      <InternationalPhoneField
        id={id}
        value={value}
        country={selectedCountry}
        disabled={disabled}
        stacked={stacked}
        placeholder={placeholder}
        touched={touched && !status.needsReview}
        onBlur={() => setTouched(true)}
        onChange={onChange}
        onCountryChange={(next) => {
          setInnerCountry(next);
          onCountryChange?.(next);
        }}
      />
      {status.duplicate ? (
        <p className="mt-1 text-[11px] font-bold text-red-600">
          {PHONE_DUPLICATE_MESSAGE}
        </p>
      ) : status.needsReview ? (
        <p className="mt-1 text-[11px] font-bold text-amber-700">
          {PHONE_LENGTH_REVIEW_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}

export function phoneConflictsWith(
  phone: string,
  otherPhones: Array<string | null | undefined>
) {
  const key = normalizePhoneKey(phone);
  if (!key) return false;
  return otherPhones.some((value) => normalizePhoneKey(value) === key);
}
