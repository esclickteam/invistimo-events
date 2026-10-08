import {
  resolveCentralGifts,
  type CentralGiftOptions,
} from "@/lib/eventDetails/centralEventDetails";

export type WeddingGiftLinks = {
  creditUrl: string;
  payboxUrl: string;
  bitPhone: string;
  bitUrl: string;
};

export const EMPTY_WEDDING_GIFTS: WeddingGiftLinks = {
  creditUrl: "",
  payboxUrl: "",
  bitPhone: "",
  bitUrl: "",
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toHttpUrl(value: unknown) {
  const raw = cleanString(value);
  if (!raw) return "";
  if (/^javascript:/i.test(raw)) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//") && raw.length > 4) return `https:${raw}`;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/?#]|$)/i.test(raw)) return `https://${raw}`;
  return "";
}

/**
 * Resolve guest-facing gift links from the central Event source (with Invitation fallback).
 */
export function resolveWeddingGifts(
  invitation?: {
    giftOptions?: {
      creditEnabled?: boolean;
      creditUrl?: string;
      payboxEnabled?: boolean;
      payboxUrl?: string;
    } | null;
    publicEventPage?: {
      gifts?: {
        creditUrl?: string;
        payboxUrl?: string;
        bitPhone?: string;
        bitUrl?: string;
      } | null;
    } | null;
  } | null,
  event?: {
    gifts?: Partial<CentralGiftOptions> | null;
    giftCreditUrl?: string | null;
  } | null
): WeddingGiftLinks {
  const resolved = resolveCentralGifts(event, invitation);

  return {
    creditUrl: resolved.creditEnabled ? resolved.creditUrl : "",
    payboxUrl: resolved.payboxEnabled ? resolved.payboxUrl : "",
    bitPhone: resolved.bitEnabled ? resolved.bitPhone : "",
    bitUrl: toHttpUrl(invitation?.publicEventPage?.gifts?.bitUrl),
  };
}

export function hasWeddingGifts(gifts?: Partial<WeddingGiftLinks> | null) {
  return Boolean(
    gifts?.creditUrl || gifts?.payboxUrl || gifts?.bitPhone || gifts?.bitUrl
  );
}
