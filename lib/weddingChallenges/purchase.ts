import User from "@/models/User";
import WeddingChallengeEntitlement from "@/models/WeddingChallengeEntitlement";
import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_MAX_GUESTS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "./constants";
import type { WeddingChallengesSourceType } from "./types";
import { userHasInviteOrProductionPackage } from "./entitlement";

export async function applyWeddingChallengesPurchase(params: {
  userId: string;
  eventId?: string | null;
  sourceType?: WeddingChallengesSourceType;
  includeGiveaway?: boolean;
  pricePaid?: number;
  paymentMethod?: string;
  paymentStatus?: "unpaid" | "pending" | "paid";
  status?: "PENDING" | "ACTIVE" | "CANCELLED";
  notes?: string;
  prizeCost?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  stripeCheckoutSessionId?: string;
  entitlementId?: string;
  basePrice?: number;
  giveawayPrice?: number;
}) {
  const includeGiveaway = params.includeGiveaway === true;
  const status = params.status || "ACTIVE";
  const paid = status === "ACTIVE" || params.paymentStatus === "paid";
  const basePrice =
    Number(params.basePrice) > 0 ? Number(params.basePrice) : WEDDING_CHALLENGES_PRICE_ILS;
  const giveawayPrice =
    Number(params.giveawayPrice) > 0
      ? Number(params.giveawayPrice)
      : WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS;
  const pricePaid =
    params.pricePaid ?? basePrice + (includeGiveaway ? giveawayPrice : 0);

  const set: Record<string, unknown> = {
    userId: params.userId,
    sourceType: params.sourceType || "STANDALONE_GAME",
    status,
    pricePaid,
    maxGuests: WEDDING_CHALLENGES_MAX_GUESTS,
    giveawayPurchased: includeGiveaway && paid,
    giveawayFee: includeGiveaway ? giveawayPrice : 0,
    prizeCost: Number(params.prizeCost || 0),
    prizeValue: Number(params.prizeCost || 0),
    prizeProvider: Number(params.prizeCost || 0) > 0 ? "BUYME" : "NONE",
    prizeCurrency: "ILS",
    prizeFulfillmentStatus: includeGiveaway && paid ? "PENDING" : "PENDING",
    paymentMethod: params.paymentMethod || "",
    paymentStatus: paid ? "paid" : params.paymentStatus || "pending",
    notes: params.notes || "",
    customerName: params.customerName || "",
    customerPhone: params.customerPhone || "",
    customerEmail: String(params.customerEmail || "").toLowerCase(),
  };
  if (params.eventId) set.eventId = params.eventId;
  if (params.stripeCheckoutSessionId) {
    set.stripeCheckoutSessionId = params.stripeCheckoutSessionId;
  }
  if (paid) set.purchasedAt = new Date();

  const query = params.entitlementId
    ? { _id: params.entitlementId }
    : params.stripeCheckoutSessionId
      ? { stripeCheckoutSessionId: params.stripeCheckoutSessionId }
      : {
          userId: params.userId,
          status: { $in: ["PENDING", "ACTIVE"] },
          ...(params.eventId ? { eventId: params.eventId } : {}),
        };

  const entitlement = await WeddingChallengeEntitlement.findOneAndUpdate(
    query,
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (paid) {
    const user = await User.findById(params.userId).select(
      "hasPaid includeDigitalSeating includeEventManagement selfManageEnabled accessModules planLimits features weddingChallengesOnly"
    );
    const standalone = (params.sourceType || "STANDALONE_GAME") !== "EXISTING_EVENT";
    const gameOnly =
      standalone &&
      !userHasInviteOrProductionPackage(user as any) &&
      (user?.weddingChallengesOnly === true || user?.hasPaid !== true);
    const setUser: Record<string, unknown> = {
      includeWeddingChallenges: true,
      includeWeddingChallengesGiveaway: includeGiveaway,
      "accessModules.weddingChallenges": true,
      "salesUpsells.weddingChallenges.enabled": true,
      "salesUpsells.weddingChallenges.price": basePrice,
      "salesUpsells.weddingChallengesGiveaway.enabled": includeGiveaway,
      "salesUpsells.weddingChallengesGiveaway.price": giveawayPrice,
      "planLimits.weddingChallengesEnabled": true,
      hasDashboardAccess: true,
      weddingChallengesOnly: gameOnly,
    };
    if (gameOnly) {
      setUser["accessModules.rsvpSeating"] = false;
      setUser.includeDigitalSeating = false;
    }
    await User.findByIdAndUpdate(params.userId, { $set: setUser });
  }

  return entitlement;
}

export async function linkEntitlementToEvent(params: {
  userId: string;
  eventId: string;
  sourceType?: WeddingChallengesSourceType;
}) {
  const existing = await WeddingChallengeEntitlement.findOne({
    userId: params.userId,
    status: "ACTIVE",
    $or: [{ eventId: null }, { eventId: { $exists: false } }, { eventId: params.eventId }],
  }).sort({ purchasedAt: -1 });

  if (!existing) return null;
  existing.eventId = params.eventId as any;
  if (params.sourceType) existing.sourceType = params.sourceType;
  await existing.save();
  return existing;
}

export async function getActiveEntitlement(userId: string) {
  return WeddingChallengeEntitlement.findOne({
    userId,
    status: "ACTIVE",
  }).sort({ purchasedAt: -1, createdAt: -1 });
}
