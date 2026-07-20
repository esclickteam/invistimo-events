export const DATE_FIELD_PLACEHOLDER = "dd/mm/yyyy";

export function formatDateMaskInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isoToDisplayDate(value: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    return clean;
  }

  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) return clean;

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear());

  return `${day}/${month}/${year}`;
}

export function displayToIsoDate(value: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return clean;

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];

  return `${year}-${month}-${day}`;
}

export function isValidDisplayDate(value: string) {
  const clean = String(value || "").trim();
  if (!clean) return false;

  const iso = displayToIsoDate(clean);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;

  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function formatDateForPdf(value: string) {
  const iso = displayToIsoDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return String(value || "").trim();
  }

  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}
