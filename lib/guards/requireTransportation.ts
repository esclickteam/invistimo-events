import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { userHasTransportationEntitlement } from "@/lib/transportation/entitlement";
import Event from "@/models/Event";

export async function requireTransportationManagement(options?: {
  /** When set, verify the event belongs to this user (owner/producer). */
  eventId?: string;
  /** If true, admin/producer impersonation bypasses customer entitlement. */
  allowPrivilegedBypass?: boolean;
}) {
  await db();

  const auth = await getUserIdFromRequest();

  if (!auth?.userId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "UNAUTHORIZED", code: "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const userId = auth.userId;
  const user = await User.findById(userId).lean();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: "USER_NOT_FOUND", code: "USER_NOT_FOUND" },
        { status: 404 }
      ),
    };
  }

  const allowPrivilegedBypass = options?.allowPrivilegedBypass !== false;

  const isPrivilegedActor =
    auth.role === "admin" ||
    auth.impersonationRole === "admin" ||
    auth.impersonatedByAdmin === true ||
    Boolean(auth.impersonatedBy);

  /**
   * Producers managing an assigned event may use transportation tools for that event
   * only when the event OWNER has the entitlement (checked below via eventId).
   * Admins/impersonation always allowed.
   */
  if (allowPrivilegedBypass && isPrivilegedActor) {
    if (options?.eventId) {
      const event = await Event.findById(options.eventId)
        .select("userId producerId status")
        .lean();
      if (!event || event.status === "archived") {
        return {
          ok: false as const,
          response: NextResponse.json(
            { success: false, error: "EVENT_NOT_FOUND", code: "EVENT_NOT_FOUND" },
            { status: 404 }
          ),
        };
      }
    }

    return { ok: true as const, userId, user, auth, privileged: true as const };
  }

  if (options?.eventId) {
    const event = await Event.findOne({
      _id: options.eventId,
      status: { $ne: "archived" },
      $or: [{ userId }, { producerId: userId }],
    })
      .select("userId producerId")
      .lean();

    if (!event) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { success: false, error: "EVENT_NOT_FOUND", code: "EVENT_NOT_FOUND" },
          { status: 404 }
        ),
      };
    }

    // Entitlement is on the event owner (customer), not the producer actor.
    const owner = await User.findById(event.userId).lean();
    if (!userHasTransportationEntitlement(owner as any)) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            success: false,
            error: "Transportation management is not enabled for this account",
            code: "TRANSPORTATION_NOT_ALLOWED",
          },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true as const,
      userId,
      user,
      auth,
      event,
      privileged: false as const,
    };
  }

  if (!userHasTransportationEntitlement(user as any)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Transportation management is not enabled for this account",
          code: "TRANSPORTATION_NOT_ALLOWED",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, userId, user, auth, privileged: false as const };
}
