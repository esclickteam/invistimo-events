"use client";

import { useEffect } from "react";
import {
  PHONE_DUPLICATE_MESSAGE,
  PHONE_LENGTH_REVIEW_MESSAGE,
  normalizePhoneKey,
} from "@/lib/guestPhone";
import { usePhoneAvailability } from "@/app/components/usePhoneAvailability";

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
}: Props) {
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
    <div>
      <input
        value={value}
        disabled={disabled}
        readOnly={disabled}
        placeholder={placeholder}
        inputMode="tel"
        onChange={(event) => onChange(event.target.value)}
        className={`${className}${
          status.duplicate
            ? " border-red-500 focus:border-red-500"
            : status.needsReview
              ? " border-amber-500 focus:border-amber-500"
              : ""
        }${disabled ? " cursor-not-allowed bg-[#F4EEE6] opacity-80" : ""}`}
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
