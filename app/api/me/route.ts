import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   Helpers
========================= */

function expireCookie(
  res: NextResponse,
  name: string,
  opts?: { domain?: string; httpOnly?: boolean }
) {
  const base = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };

  res.cookies.set(name, "", {
    ...base,
    ...(opts?.domain ? { domain: opts.domain } : {}),
    httpOnly: opts?.httpOnly ?? true,
  });

  res.cookies.set(name, "", {
    ...base,
    httpOnly: opts?.httpOnly ?? true,
  });
}

function clearAuthCookies(res: NextResponse) {
  const cookieDomain =
    process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

  const cookieNames = [
    "authToken",
    "producerAuthToken",
    "adminAuthToken",
    "token",
    "adminToken",
    "impersonationToken",
  ];

  for (const name of cookieNames) {
    expireCookie(res, name, {
      domain: cookieDomain,
      httpOnly: true,
    });
  }
}

function normalizeAccessModules(user: any) {
  const includeDigitalSeating =
    Boolean(user?.includeDigitalSeating) ||
    Boolean(user?.planLimits?.seatingEnabled);

  const includeEventManagement =
    Boolean(user?.includeEventManagement) ||
    Boolean(user?.selfManageEnabled);

  const isVenueOwner = user?.role === "venue_owner" || user?.venueOwner === true;

  return {
    rsvpSeating: Boolean(
      user?.accessModules?.rsvpSeating ?? includeDigitalSeating
    ),

    eventProduction: Boolean(
      user?.accessModules?.eventProduction ?? includeEventManagement
    ),

    venues: Boolean(user?.accessModules?.venues ?? isVenueOwner),
    venueDashboard: Boolean(user?.accessModules?.venueDashboard ?? isVenueOwner),
    venueCrm: Boolean(user?.accessModules?.venueCrm ?? isVenueOwner),
    venueCalendar: Boolean(user?.accessModules?.venueCalendar ?? isVenueOwner),
    venueMenus: Boolean(user?.accessModules?.venueMenus ?? isVenueOwner),
    venueStaff: Boolean(user?.accessModules?.venueStaff ?? isVenueOwner),
  };
}

/* =========================
   Types
========================= */

type UserRole = "admin" | "producer" | "client" | "user" | "staff" | "venue_owner";

type EffectiveRole =
  | "producer"
  | "producer_staff"
  | "client"
  | "admin"
  | "user"
  | "venue_owner";

type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;

  role?: UserRole;

  hasPaid?: boolean;
  isTrial?: boolean;

  accessModules?: {
    rsvpSeating?: boolean;
    eventProduction?: boolean;

    venues?: boolean;
    venueDashboard?: boolean;
    venueCrm?: boolean;
    venueCalendar?: boolean;
    venueMenus?: boolean;
    venueStaff?: boolean;
  };

  impersonated?: boolean;
  impersonatedBy?: string;
  impersonatedByAdmin?: boolean;
  adminId?: string;

  impersonationRole?:
    | "admin"
    | "producer"
    | "producer_staff"
    | "staff_producer"
    | "venue_owner";

  iat?: number;
  exp?: number;
};

type DecodedTokenResult = {
  decoded: JwtPayload;
  source: string;
};

/* =========================
   Token Resolver
========================= */

function verifyFirstValidToken(
  tokens: Array<{ source: string; value: string | null }>,
  secret: string
): DecodedTokenResult | null {
  let lastError: unknown = null;

  for (const item of tokens) {
    if (!item.value) continue;

    try {
      const decoded = jwt.verify(item.value, secret) as JwtPayload;

      return {
        decoded,
        source: item.source,
      };
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Invalid token skipped: ${item.source}`, err);
    }
  }

  if (lastError) {
    console.error("❌ No valid JWT found. Last error:", lastError);
  }

  return null;
}

/* =========================
   GET /api/me
========================= */

export async function GET() {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing");

      return NextResponse.json(
        {
          success: false,
          user: null,
          error: "SERVER_CONFIG_ERROR",
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const cookieStore = await cookies();

    const authToken = cookieStore.get("authToken")?.value ?? null;
    const producerAuthToken =
      cookieStore.get("producerAuthToken")?.value ?? null;
    const adminAuthToken = cookieStore.get("adminAuthToken")?.value ?? null;

    const legacyToken = cookieStore.get("token")?.value ?? null;
    const legacyAdminToken = cookieStore.get("adminToken")?.value ?? null;
    const impersonationToken =
      cookieStore.get("impersonationToken")?.value ?? null;

    const hasAnyToken =
      !!authToken ||
      !!producerAuthToken ||
      !!adminAuthToken ||
      !!legacyToken ||
      !!legacyAdminToken ||
      !!impersonationToken;

    if (!hasAnyToken) {
      return NextResponse.json(
        {
          success: false,
          user: null,
          error: "NO_TOKEN",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const tokenResult = verifyFirstValidToken(
      [
        { source: "impersonationToken", value: impersonationToken },
        { source: "authToken", value: authToken },
        { source: "producerAuthToken", value: producerAuthToken },
        { source: "adminAuthToken", value: adminAuthToken },
        { source: "adminToken", value: legacyAdminToken },
        { source: "token", value: legacyToken },
      ],
      process.env.JWT_SECRET
    );

    if (!tokenResult?.decoded) {
      const res = NextResponse.json(
        {
          success: false,
          user: null,
          error: "INVALID_TOKEN",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );

      clearAuthCookies(res);
      return res;
    }

    const decoded = tokenResult.decoded;

    const baseUserId = decoded.userId || decoded.id || decoded._id || null;

    if (!baseUserId) {
      const res = NextResponse.json(
        {
          success: false,
          user: null,
          error: "MISSING_USER_ID_IN_TOKEN",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );

      clearAuthCookies(res);
      return res;
    }

    const user = await User.findById(baseUserId).lean();

    if (!user) {
      const res = NextResponse.json(
        {
          success: false,
          user: null,
          error: "USER_NOT_FOUND",
        },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      );

      clearAuthCookies(res);
      return res;
    }

    const safeRole = (user.role as UserRole) ?? "user";

    const staffType = (user.staffType as string | null) ?? null;
    const impersonationRole = decoded.impersonationRole ?? null;

    const accessModules = normalizeAccessModules(user);

    const isVenueOwner =
      safeRole === "venue_owner" ||
      user.venueOwner === true ||
      accessModules.venues === true;

    const isProducer =
      safeRole === "producer" || impersonationRole === "producer";

    const isProducerStaff =
      (safeRole === "staff" && staffType === "producer_staff") ||
      impersonationRole === "producer_staff" ||
      impersonationRole === "staff_producer";

    const isProducerLike = isProducer || isProducerStaff;

    const effectiveRole: EffectiveRole = isProducer
      ? "producer"
      : isProducerStaff
      ? "producer_staff"
      : safeRole === "client"
      ? "client"
      : safeRole === "admin"
      ? "admin"
      : isVenueOwner
      ? "venue_owner"
      : "user";

    const isImpersonated =
      !!decoded.impersonated ||
      !!decoded.impersonatedByAdmin ||
      !!decoded.impersonatedBy;

    console.log(
      "✅ ME:",
      user.email,
      "| tokenSource:",
      tokenResult.source,
      "| role:",
      safeRole,
      "| effectiveRole:",
      effectiveRole,
      "| hasPaid:",
      user.hasPaid === true,
      "| venueOwner:",
      isVenueOwner,
      "| accessModules:",
      accessModules,
      "| staffType:",
      staffType,
      "| impersonationRole:",
      impersonationRole,
      "| producerLike:",
      isProducerLike,
      isImpersonated ? "| impersonated" : ""
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          _id: String(user._id),
          name: user.name ?? "",
          email: user.email ?? "",

          role: safeRole,
          effectiveRole,
          venueOwner: isVenueOwner,

          staffType,
          assignedProducerId: user.assignedProducerId
            ? String(user.assignedProducerId)
            : null,
          createdByProducer: !!user.createdByProducer,

          isProducerLike,
          isProducerStaff,

          isActive: user.isActive === true,
          hasPaid: user.hasPaid === true,
          isTrial: user.isTrial === true,
          trialExpiresAt: user.trialExpiresAt ?? null,
          hasDashboardAccess: user.hasDashboardAccess === true,

          accessModules,
          includeDigitalSeating: accessModules.rsvpSeating,
          includeEventManagement: accessModules.eventProduction,
          selfManageEnabled: accessModules.eventProduction,

          plan: user.plan ?? "basic",
          guests: user.guests ?? 0,
          paidAmount: user.paidAmount ?? 0,
          billingSource: user.billingSource ?? null,
          planLimits: {
            ...(user.planLimits ?? {}),
            seatingEnabled: accessModules.rsvpSeating,
          },

          includeCalls: !!user.includeCalls,
          callsAddonPrice: user.callsAddonPrice ?? 0,

          includeCreditGifts: !!user.includeCreditGifts,
          creditGiftsAddonPrice: user.creditGiftsAddonPrice ?? 0,

          smsPerRecord: user.smsPerRecord ?? 0,
          maxMessages: user.maxMessages ?? 0,

          smsUsed: user.smsUsed ?? 0,
          smsBalance: user.smsBalance ?? 0,
          whatsappBalance: user.whatsappBalance ?? 0,
          whatsappUsed: user.whatsappUsed ?? 0,

          producerPricePerRecord: user.producerPricePerRecord ?? 0,

          impersonated: isImpersonated,
          impersonatedBy: decoded.impersonatedBy ?? null,
          impersonatedByAdmin: !!decoded.impersonatedByAdmin,
          adminId: decoded.adminId ?? null,
          impersonationRole,

          tokenSource: tokenResult.source,

          createdAt: user.createdAt,
          updatedAt: user.updatedAt ?? null,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("❌ ME API ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        user: null,
        error: "ME_API_ERROR",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}