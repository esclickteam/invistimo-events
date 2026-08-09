import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  getUserIdFromRequest,
  type AuthPayload,
} from "@/lib/getUserIdFromRequest";
import VenueHall from "@/models/VenueHall";
import VenueMembership from "@/models/VenueMembership";
import User from "@/models/User";
import {
  hasVenuePermission,
  isVenueRole,
  resolveVenuePermissions,
  type VenuePermission,
  type VenueRole,
} from "@/lib/venues/permissions";

export type VenueAccessContext = {
  auth: AuthPayload;
  venueId: string;
  hall: any;
  ownerId: string;
  membership: any | null;
  role: VenueRole;
  permissions: VenuePermission[];
  isAdmin: boolean;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message, error: message }, { status });
}

async function findHallForOwnerOrId(venueId: string, ownerId?: string) {
  const decoded = decodeURIComponent(venueId);
  const orConditions: any[] = [{ id: venueId }, { id: decoded }];

  if (mongoose.Types.ObjectId.isValid(venueId)) {
    orConditions.push({ _id: venueId });
  }
  if (mongoose.Types.ObjectId.isValid(decoded)) {
    orConditions.push({ _id: decoded });
  }

  const query: any = { $or: orConditions };
  if (ownerId) {
    query.ownerId = ownerId;
  }

  return VenueHall.findOne(query).lean();
}

/**
 * Resolve access for a venue (hall) tenant.
 * - Admin (non-impersonation or admin impersonating): full OWNER
 * - venue_owner of the hall: OWNER (even before membership backfill)
 * - Active VenueMembership: role + permissions
 * - Never trusts client-only claims without DB membership/ownership
 */
export async function requireVenueAccess(
  req: NextRequest | Request | undefined,
  venueIdRaw: string,
  requiredPermission?: VenuePermission | VenuePermission[]
): Promise<{ ctx: VenueAccessContext | null; error: NextResponse | null }> {
  await connectDB();

  const auth = await getUserIdFromRequest(req as any);

  if (!auth?.userId) {
    return { ctx: null, error: jsonError("לא מחובר", 401) };
  }

  const venueId = cleanString(venueIdRaw);
  if (!venueId) {
    return { ctx: null, error: jsonError("חסר מזהה אולם", 400) };
  }

  const user = await User.findById(auth.userId)
    .select("role isActive venueUser employeeScope staffType")
    .lean();

  if (!user) {
    return { ctx: null, error: jsonError("משתמש לא נמצא", 404) };
  }

  if ((user as any).isActive === false) {
    return { ctx: null, error: jsonError("המשתמש אינו פעיל", 403) };
  }

  // Invistimo staff must not use venue tenant APIs unless admin
  const isInvistimoStaff =
    (user as any).role === "staff" && (user as any).employeeScope !== "venue";

  const isAdmin =
    auth.role === "admin" ||
    ((user as any).role === "admin" && !auth.impersonated);

  if (isInvistimoStaff && !isAdmin) {
    return {
      ctx: null,
      error: jsonError("אין הרשאה לאזור האולמות", 403),
    };
  }

  let hall = await findHallForOwnerOrId(venueId);

  if (!hall) {
    return { ctx: null, error: jsonError("האולם לא נמצא", 404) };
  }

  const safeVenueId = String((hall as any).id || (hall as any)._id);
  const ownerId = String((hall as any).ownerId);

  let membership = await VenueMembership.findOne({
    userId: auth.userId,
    venueId: safeVenueId,
  }).lean();

  // Backward compatible: venue_owner who owns the hall
  const isLegacyOwner =
    ((user as any).role === "venue_owner" || auth.role === "venue_owner") &&
    ownerId === String(auth.userId);

  if (!membership && isLegacyOwner) {
    // Lazy ensure OWNER membership (additive, safe)
    try {
      membership = await VenueMembership.findOneAndUpdate(
        { userId: auth.userId, venueId: safeVenueId },
        {
          $setOnInsert: {
            userId: auth.userId,
            venueId: safeVenueId,
            ownerId,
            role: "OWNER",
            permissions: [],
            status: "active",
            mustChangePassword: false,
            createdBy: auth.userId,
          },
        },
        { upsert: true, new: true, lean: true }
      );
    } catch {
      membership = await VenueMembership.findOne({
        userId: auth.userId,
        venueId: safeVenueId,
      }).lean();
    }
  }

  if (isAdmin) {
    const role: VenueRole = "OWNER";
    const permissions = resolveVenuePermissions(role, []);
    const ctx: VenueAccessContext = {
      auth,
      venueId: safeVenueId,
      hall,
      ownerId,
      membership,
      role,
      permissions,
      isAdmin: true,
    };
    return { ctx, error: null };
  }

  if (!membership) {
    return {
      ctx: null,
      error: jsonError("אין הרשאה לאולם זה", 403),
    };
  }

  if ((membership as any).status === "disabled") {
    return {
      ctx: null,
      error: jsonError("הגישה לאולם זה בוטלה", 403),
    };
  }

  const roleRaw = (membership as any).role;
  const role: VenueRole = isVenueRole(roleRaw) ? roleRaw : "VIEWER";
  const permissions = resolveVenuePermissions(
    role,
    (membership as any).permissions
  );

  if (
    requiredPermission &&
    !hasVenuePermission(role, (membership as any).permissions, requiredPermission)
  ) {
    return {
      ctx: null,
      error: jsonError("אין הרשאה לביצוע פעולה זו", 403),
    };
  }

  return {
    ctx: {
      auth,
      venueId: safeVenueId,
      hall,
      ownerId,
      membership,
      role,
      permissions,
      isAdmin: false,
    },
    error: null,
  };
}

export async function listUserVenueMemberships(userId: string) {
  await connectDB();

  const memberships = await VenueMembership.find({
    userId,
    status: "active",
  })
    .sort({ updatedAt: -1 })
    .lean();

  const venueIds = memberships.map((m: any) => m.venueId);

  const halls = await VenueHall.find({
    id: { $in: venueIds },
  }).lean();

  // Also include halls owned by legacy venue_owner without membership yet
  const ownedHalls = await VenueHall.find({ ownerId: userId }).lean();

  const byId = new Map<string, any>();
  for (const h of [...halls, ...ownedHalls]) {
    byId.set(String((h as any).id || (h as any)._id), h);
  }

  const result: {
    venueId: string;
    name: string;
    subtitle: string;
    role: VenueRole;
    permissions: VenuePermission[];
    status: string;
  }[] = [];

  const seen = new Set<string>();

  for (const m of memberships) {
    const venueId = String((m as any).venueId);
    const hall = byId.get(venueId);
    if (!hall || seen.has(venueId)) continue;
    seen.add(venueId);
    const role: VenueRole = isVenueRole((m as any).role)
      ? (m as any).role
      : "VIEWER";
    result.push({
      venueId,
      name: hall.name || venueId,
      subtitle: hall.subtitle || "",
      role,
      permissions: resolveVenuePermissions(role, (m as any).permissions),
      status: (m as any).status || "active",
    });
  }

  // Legacy owned halls without membership rows
  for (const h of ownedHalls) {
    const venueId = String((h as any).id || (h as any)._id);
    if (seen.has(venueId)) continue;
    seen.add(venueId);
    result.push({
      venueId,
      name: (h as any).name || venueId,
      subtitle: (h as any).subtitle || "",
      role: "OWNER",
      permissions: resolveVenuePermissions("OWNER", []),
      status: "active",
    });
  }

  return result;
}
