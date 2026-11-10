/**
 * Guest links section for invitation pages (personal + public).
 * Additive-only helpers — normalize, filter, and validate HTTP(S) URLs.
 */

export const GUEST_LINKS_DEFAULT_TITLE = "מידע נוסף לאורחים";

export const GUEST_LINK_VISIBILITIES = ["personal", "public", "both"] as const;

export type GuestLinkVisibility = (typeof GUEST_LINK_VISIBILITIES)[number];

export type GuestLinkPageKind = "personal" | "public";

export type GuestLinkItem = {
  id: string;
  label: string;
  url: string;
  visibility: GuestLinkVisibility;
  enabled: boolean;
  order: number;
};

export type GuestLinksSection = {
  enabled: boolean;
  title: string;
  subtitle: string;
  links: GuestLinkItem[];
};

export function cleanGuestLinkText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value || "").trim();
}

/** Only allow http/https absolute URLs. Rejects javascript:, data:, etc. */
export function sanitizeGuestLinkUrl(value: unknown): string {
  const raw = cleanGuestLinkText(value);
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    // Never allow embedding credentials in the URL string guests open.
    parsed.username = "";
    parsed.password = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function normalizeGuestLinkVisibility(value: unknown): GuestLinkVisibility {
  const raw = cleanGuestLinkText(value).toLowerCase();
  if (raw === "personal" || raw === "public" || raw === "both") {
    return raw;
  }
  return "both";
}

export function createGuestLinkId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `gl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyGuestLinksSection(): GuestLinksSection {
  return {
    enabled: false,
    title: GUEST_LINKS_DEFAULT_TITLE,
    subtitle: "",
    links: [],
  };
}

export function normalizeGuestLinksSection(input: any): GuestLinksSection {
  const fallback = emptyGuestLinksSection();
  if (!input || typeof input !== "object") {
    return fallback;
  }

  const linksRaw = Array.isArray(input.links) ? input.links : [];
  const links: GuestLinkItem[] = linksRaw
    .map((item: any, index: number) => {
      const id = cleanGuestLinkText(item?.id) || `gl_${index}`;
      const label = cleanGuestLinkText(item?.label);
      const url = sanitizeGuestLinkUrl(item?.url);
      const order =
        typeof item?.order === "number" && Number.isFinite(item.order)
          ? item.order
          : index;

      return {
        id,
        label,
        url,
        visibility: normalizeGuestLinkVisibility(item?.visibility),
        enabled: item?.enabled !== false,
        order,
      };
    })
    .filter((item: GuestLinkItem) => item.label || item.url)
    .sort((a: GuestLinkItem, b: GuestLinkItem) => a.order - b.order)
    .map((item: GuestLinkItem, index: number) => ({ ...item, order: index }));

  const title = cleanGuestLinkText(input.title) || GUEST_LINKS_DEFAULT_TITLE;

  return {
    enabled: input.enabled === true,
    title,
    subtitle: cleanGuestLinkText(input.subtitle),
    links,
  };
}

export function linkMatchesPage(
  visibility: GuestLinkVisibility,
  page: GuestLinkPageKind
) {
  if (visibility === "both") return true;
  return visibility === page;
}

/**
 * Links that should render for a given invitation page.
 * Section is hidden entirely when disabled or when no matching active links exist.
 */
export function resolveVisibleGuestLinks(
  sectionInput: any,
  page: GuestLinkPageKind
): { section: GuestLinksSection; links: GuestLinkItem[] } {
  const section = normalizeGuestLinksSection(sectionInput);
  if (!section.enabled) {
    return { section, links: [] };
  }

  const links = section.links.filter(
    (link) =>
      link.enabled &&
      Boolean(link.label) &&
      Boolean(link.url) &&
      linkMatchesPage(link.visibility, page)
  );

  return { section, links };
}

export function shouldShowGuestLinksSection(
  sectionInput: any,
  page: GuestLinkPageKind
) {
  return resolveVisibleGuestLinks(sectionInput, page).links.length > 0;
}
