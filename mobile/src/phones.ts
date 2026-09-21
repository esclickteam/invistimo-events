export function digitsOnly(value: string) {
  return String(value || "").replace(/\D/g, "");
}

/** Comparable Israeli phone key: 9725... and 05... collapse to the same local number. */
export function phoneKey(value: string) {
  let digits = digitsOnly(value);
  if (!digits) return "";
  if (digits.startsWith("972")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function phonesMatch(a: string, b: string) {
  const left = phoneKey(a);
  const right = phoneKey(b);
  return Boolean(left) && left === right;
}

export function displayPhone(value: string) {
  const digits = digitsOnly(value);
  if (!digits) return "";
  if (digits.startsWith("972") && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

const MOBILE_LABEL = /mobile|cell|iphone|נייד|סלולרי/i;

export function preferPhone<T extends { number?: string | null; label?: string | null }>(
  numbers: T[] | null | undefined
) {
  const usable = (numbers || []).filter((item) => digitsOnly(item.number || ""));
  if (!usable.length) return null;
  const ranked = [...usable].sort((a, b) => {
    const aMobile = MOBILE_LABEL.test(String(a.label || "")) ? 1 : 0;
    const bMobile = MOBILE_LABEL.test(String(b.label || "")) ? 1 : 0;
    return bMobile - aMobile;
  });
  return ranked[0];
}
