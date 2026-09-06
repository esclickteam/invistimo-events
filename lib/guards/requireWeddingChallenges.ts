import { NextResponse } from "next/server";
import db from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { userHasWeddingChallengesEntitlement } from "@/lib/weddingChallenges/entitlement";
import { WEDDING_CHALLENGES_PRICE_ILS } from "@/lib/weddingChallenges/constants";

export async function requireWeddingChallenges(options?: {
  eventId?: string;
  allowPrivilegedBypass?: boolean;
}) {
  await db();

  const auth = await getUserIdFromRequest();
  if (!auth?.userId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const user = await User.findById(auth.userId).lean();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      ),
    };
  }

  const isPrivileged =
    auth.role === "admin" ||
    auth.impersonationRole === "admin" ||
    auth.impersonatedByAdmin === true ||
    Boolean(auth.impersonatedBy);

  if (options?.eventId) {
    const event = await Event.findOne({
      _id: options.eventId,
      status: { $ne: "archived" },
      $or: [{ userId: auth.userId }, { producerId: auth.userId }],
    })
      .select("userId producerId")
      .lean();

    if (!event && !isPrivileged) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { success: false, error: "EVENT_NOT_FOUND" },
          { status: 404 }
        ),
      };
    }
  }

  if (options?.allowPrivilegedBypass !== false && isPrivileged) {
    return { ok: true as const, userId: auth.userId, user, auth, privileged: true as const };
  }

  if (!userHasWeddingChallengesEntitlement(user)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "WEDDING_CHALLENGES_NOT_PURCHASED",
          price: WEDDING_CHALLENGES_PRICE_ILS,
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, userId: auth.userId, user, auth, privileged: false as const };
}
