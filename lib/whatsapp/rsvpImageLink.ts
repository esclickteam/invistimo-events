/**
 * RSVP header value for image.link.
 * The address is the current headerImageUrl, trimmed only.
 * It is not rewritten, re-encoded, or replaced with a media id.
 */

export function rsvpWhatsappImageLink(value: unknown) {
  const link = String(value ?? "").trim();
  if (!link.startsWith("https://")) throw new Error("Invalid headerImageUrl");
  return link;
}

export function buildRsvpImageLinkHeader(headerImageUrl: unknown) {
  const link = rsvpWhatsappImageLink(headerImageUrl);
  return {
    type: "header" as const,
    parameters: [
      {
        type: "image" as const,
        image: { link },
      },
    ],
  };
}
