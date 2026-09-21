export function formatLocation(location: unknown) {
  if (!location) return "";
  if (typeof location === "string") return location.trim();
  if (typeof location !== "object") return "";
  const loc = location as Record<string, unknown>;
  return [loc.name, loc.venue, loc.address, loc.city, loc.formattedAddress]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index)
    .join(" · ");
}

export function formatEventDate(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export const RSVP_LABELS: Record<string, string> = {
  yes: "מגיע",
  no: "לא מגיע",
  maybe: "מתלבטים",
  pending: "בהמתנה",
};

export function rsvpLabel(value: unknown) {
  return RSVP_LABELS[String(value || "pending")] || "בהמתנה";
}

export function messageFromApi(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const body = data as Record<string, unknown>;
  const message = String(body.message || body.error || "").trim();
  if (!message || message === "SERVER_ERROR" || message === "UNAUTHORIZED") {
    if (message === "UNAUTHORIZED") return "יש להתחבר מחדש";
    return fallback;
  }
  return message;
}
