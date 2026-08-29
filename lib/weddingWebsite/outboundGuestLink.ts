/**
 * Outbound guest link routing for WhatsApp / SMS.
 *
 * Regular package  → personal /invite/[shareId]?token=...
 * Wedding Website  → public /w/[shareId] (only when published)
 *
 * Meta WhatsApp templates use a fixed /invite/ button base URL.
 * For WW we therefore send suffix `site/[shareId]` which resolves via
 * /invite/site/[shareId] → redirect → /w/[shareId].
 */

export type OutboundLinkKind = "invite" | "website";

export type OutboundGuestLinkResult =
  | {
      ok: true;
      kind: OutboundLinkKind;
      fullUrl: string;
      /** Parameter for WhatsApp dynamic URL button (appended after /invite/) */
      urlSuffix: string;
      websitePublished: boolean;
    }
  | {
      ok: false;
      kind: "website";
      reason: "WEDDING_WEBSITE_NOT_PUBLISHED";
      message: string;
    };

const DEFAULT_ORIGIN = "https://www.invistimo.com";

function siteOrigin() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXTAUTH_URL ||
    DEFAULT_ORIGIN;
  return String(raw).replace(/\/$/, "") || DEFAULT_ORIGIN;
}

export function resolveOutboundGuestLink(input: {
  entitled: boolean;
  websiteStatus?: string | null;
  websiteShareId?: string | null;
  invitationShareId: string;
  guestToken: string;
}): OutboundGuestLinkResult {
  const inviteShare = String(input.invitationShareId || "").trim();
  const guestToken = String(input.guestToken || "").trim();
  const origin = siteOrigin();

  if (!input.entitled) {
    if (!inviteShare || !guestToken) {
      return {
        ok: false,
        kind: "website",
        reason: "WEDDING_WEBSITE_NOT_PUBLISHED",
        message: "חסר קישור הזמנה אישי לאורח",
      };
    }
    const urlSuffix = `${inviteShare}?token=${guestToken}`;
    return {
      ok: true,
      kind: "invite",
      fullUrl: `${origin}/invite/${urlSuffix}`,
      urlSuffix,
      websitePublished: false,
    };
  }

  const wwShare = String(input.websiteShareId || inviteShare || "").trim();
  const published = String(input.websiteStatus || "") === "published";

  if (!published || !wwShare) {
    return {
      ok: false,
      kind: "website",
      reason: "WEDDING_WEBSITE_NOT_PUBLISHED",
      message:
        "חבילת אתר חתונה פעילה אך האתר עדיין לא פורסם. פרסמו את האתר לפני שליחה לאורחים.",
    };
  }

  // WhatsApp button base is /invite/ — bridge redirects to /w/
  const urlSuffix = `site/${wwShare}`;
  return {
    ok: true,
    kind: "website",
    fullUrl: `${origin}/w/${wwShare}`,
    urlSuffix,
    websitePublished: true,
  };
}
