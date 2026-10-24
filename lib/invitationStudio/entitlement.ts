import {
  packageIncludesDigitalInvitation,
  type PackageId,
} from "@/lib/pricing/packageQuote";

export { packageIncludesDigitalInvitation, type PackageId };

export const DESIGNED_INVITATION_LABEL = "הזמנה דיגיטלית מעוצבת";

export const DESIGNED_INVITATION_DESCRIPTION =
  "בחרו עיצוב מתוך מגוון תבניות יוקרתיות, התאימו את פרטי האירוע וצרו הזמנה אישית ומרשימה לאורחים שלכם.";

/** Fallback only. The live price is InvitationStudioSettings.priceIls. */
export const DEFAULT_DESIGNED_INVITATION_PRICE_ILS = 150;

const PACKAGE_PLANS = new Set(["basic", "premium", "plan1", "plan2", "plan3"]);

export type EntitlementUser = {
  plan?: string | null;
  hasPaid?: boolean | null;
  customDesignEnabled?: boolean | null;
  designedInvitationEnabled?: boolean | null;
} | null | undefined;

export type EntitlementReason = "package" | "custom_design" | "addon" | "none";

/**
 * The existing packages already include "הזמנה דיגיטלית מלאה".
 * Paying customers keep that entitlement and can design without a second charge.
 * customDesignEnabled is the existing paid design add-on and is extended, not rebilled.
 */
export function resolveDesignedInvitationEntitlement(user: EntitlementUser): {
  entitled: boolean;
  reason: EntitlementReason;
} {
  if (!user) return { entitled: false, reason: "none" };
  if (user.designedInvitationEnabled) return { entitled: true, reason: "addon" };
  if (user.customDesignEnabled) return { entitled: true, reason: "custom_design" };
  if (PACKAGE_PLANS.has(String(user.plan || "")) && user.hasPaid) {
    return { entitled: true, reason: "package" };
  }
  return { entitled: false, reason: "none" };
}

export function designedInvitationCharge(input: {
  packageId: PackageId;
  selected: boolean;
  catalogPrice: number;
}) {
  const includedInPackage = packageIncludesDigitalInvitation(input.packageId);
  const catalogPrice = sanitizeCatalogPrice(input.catalogPrice);
  const price = input.selected && !includedInPackage ? catalogPrice : 0;
  return {
    includedInPackage,
    catalogPrice,
    price,
    label: DESIGNED_INVITATION_LABEL,
    description: DESIGNED_INVITATION_DESCRIPTION,
  };
}

export function sanitizeCatalogPrice(value: unknown) {
  const price = Math.round(Number(value));
  if (!Number.isFinite(price)) return DEFAULT_DESIGNED_INVITATION_PRICE_ILS;
  return Math.min(10000, Math.max(0, price));
}

export function canPublishOrExport(input: {
  entitled: boolean;
  templateFree: boolean;
}) {
  return input.entitled || input.templateFree;
}

/**
 * A studio checkout may be created only with a Stripe test key.
 * Live keys are refused so this branch cannot open a real charge.
 * Entitlement is granted later, only after the webhook sees payment_status=paid.
 */
export function studioCheckoutGate(secretKey: string | undefined) {
  const key = String(secretKey || "").trim();
  if (!key) return { ok: false as const, reason: "missing" as const };
  if (key.startsWith("sk_live_")) return { ok: false as const, reason: "live_blocked" as const };
  if (key.startsWith("sk_test_")) return { ok: true as const, reason: "test" as const };
  return { ok: false as const, reason: "unknown" as const };
}

export function studioPaymentShouldGrant(session: {
  payment_status?: string | null;
  livemode?: boolean | null;
  metadata?: { source?: string | null } | null;
}) {
  if (session.metadata?.source !== "invitation_studio") {
    return { grant: false, reason: "other" };
  }
  if (session.payment_status !== "paid") {
    return { grant: false, reason: "unpaid" };
  }
  if (session.livemode) {
    return { grant: false, reason: "live_blocked" };
  }
  return { grant: true, reason: "test_paid" };
}
