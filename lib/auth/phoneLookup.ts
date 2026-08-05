export function digitsOnly(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

export function phoneLookupVariants(rawPhone: string) {
  let digits = digitsOnly(rawPhone);

  if (!digits) return [];

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  const variants = new Set<string>();
  variants.add(digits);
  variants.add(`+${digits}`);

  if (digits.startsWith("972") && digits.length >= 11) {
    const local = `0${digits.slice(3)}`;
    variants.add(local);
    variants.add(digits);
    variants.add(`+${digits}`);
  } else if (digits.startsWith("0") && digits.length >= 9) {
    const intl = `972${digits.slice(1)}`;
    variants.add(digits);
    variants.add(intl);
    variants.add(`+${intl}`);
  } else if (digits.length >= 8) {
    const local = `0${digits}`;
    const intl = `972${digits}`;
    variants.add(local);
    variants.add(intl);
    variants.add(`+${intl}`);
  }

  return [...variants];
}

export function phoneCoreDigits(rawPhone: string) {
  return digitsOnly(rawPhone)
    .replace(/^00/, "")
    .replace(/^972/, "")
    .replace(/^0/, "");
}
