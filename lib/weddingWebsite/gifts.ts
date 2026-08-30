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

export function resolveWeddingGifts(invitation?: {
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
} | null): WeddingGiftLinks {
  const options = invitation?.giftOptions || {};
  const publicGifts = invitation?.publicEventPage?.gifts || {};

  const creditFromOptions = options.creditEnabled ? toHttpUrl(options.creditUrl) : "";
  const payboxFromOptions = options.payboxEnabled ? toHttpUrl(options.payboxUrl) : "";

  return {
    creditUrl: creditFromOptions || toHttpUrl(publicGifts.creditUrl),
    payboxUrl: payboxFromOptions || toHttpUrl(publicGifts.payboxUrl),
    bitPhone: cleanString(publicGifts.bitPhone),
    bitUrl: toHttpUrl(publicGifts.bitUrl),
  };
}

export function hasWeddingGifts(gifts?: Partial<WeddingGiftLinks> | null) {
  return Boolean(
    gifts?.creditUrl || gifts?.payboxUrl || gifts?.bitPhone || gifts?.bitUrl
  );
}
