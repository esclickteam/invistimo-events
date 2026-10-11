"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PHONE_DUPLICATE_MESSAGE,
  PHONE_LENGTH_REVIEW_MESSAGE,
  isIsraeliMobileLengthInvalid,
  normalizePhoneKey,
} from "@/lib/guestPhone";

type Options = {
  invitationId?: string;
  phone: string;
  excludeGuestId?: string;
  otherPhones?: Array<string | null | undefined>;
  disabled?: boolean;
};

export function usePhoneAvailability({
  invitationId,
  phone,
  excludeGuestId,
  otherPhones = [],
  disabled = false,
}: Options) {
  const key = normalizePhoneKey(phone);
  const otherKey = otherPhones.map((value) => normalizePhoneKey(value)).join("|");

  const localDuplicate = useMemo(() => {
    if (!key || disabled) return false;
    return otherKey.split("|").filter(Boolean).includes(key);
  }, [disabled, key, otherKey]);

  const needsReview = Boolean(key) && !disabled && isIsraeliMobileLengthInvalid(key);
  const [serverDuplicate, setServerDuplicate] = useState(false);

  useEffect(() => {
    setServerDuplicate(false);
  }, [disabled, excludeGuestId, invitationId, key]);

  useEffect(() => {
    if (disabled || !invitationId || !key) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/guests/phone-check", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            invitationId,
            phone,
            excludeGuestId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) return;
        setServerDuplicate(Boolean(data.duplicate));
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [disabled, excludeGuestId, invitationId, key, phone]);

  const duplicate = localDuplicate || serverDuplicate;

  return {
    duplicate,
    needsReview: needsReview && !duplicate,
    blockingMessage: duplicate ? PHONE_DUPLICATE_MESSAGE : "",
    warningMessage:
      !duplicate && needsReview ? PHONE_LENGTH_REVIEW_MESSAGE : "",
  };
}
