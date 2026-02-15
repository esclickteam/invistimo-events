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
function expireCookie(res: NextResponse, name: string, opts?: { domain?: string }) {
  const base = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };

  // מחיקה עם domain (אם קיים)
  res.cookies.set(name, "", {
    ...base,
    ...(opts?.domain ? { domain: opts.domain } : {}),
    httpOnly: true,
  });

  // מחיקה גם בלי domain (למקרה שהקוקי נכתב בלי domain)
  res.cookies.set(name, "", {
    ...base,
    httpOnly: true,
  });
}

function clearAuthCookies(res: NextResponse) {
  const cookieDomain =
    process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

  expireCookie(res, "authToken", { domain: cookieDomain });
  expireCookie(res, "producerAuthToken", { domain: cookieDomain });
  expireCookie(res, "adminAuthToken", { domain: cookieDomain });
}

/* =========================
   Types
========================= */
type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: "admin" | "producer" | "client" | "user" | "staff";
  hasPaid?: boolean;
  isTrial?: boolean;

  // impersonation flags
  impersonated?: boolean;
  impersonatedBy?: string;
  impersonatedByAdmin?: boolean;
  adminId?: string;

  // legacy/new impersonation role values
  impersonationRole?: "admin" | "producer" | "producer_staff" | "staff_producer";

  iat?: number;
  exp?: number;
};

/* =========================
   GET /api/auth/me
========================= */
export async function GET() {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing");
      return NextResponse.json(
        { success: false, user: null },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const cookieStore = await cookies();

    const producerToken = cookieStore.get("producerAuthToken")?.value ?? null;
    const authToken = cookieStore.get("authToken")?.value ?? null;
    const adminToken = cookieStore.get("adminAuthToken")?.value ?? null;

    // סדר עדיפויות: auth -> producer -> admin
    const token = authToken || producerToken || adminToken;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    } catch (err) {
      console.error("❌ JWT לא תקין:", err);

      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
      clearAuthCookies(res);
      return res;
    }

    const baseUserId = decoded.userId || decoded.id || decoded._id || null;

    if (!baseUserId) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
      clearAuthCookies(res);
      return res;
    }

    const user = await User.findById(baseUserId).lean();

    if (!user) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
      clearAuthCookies(res);
      return res;
    }

    const safeRole =
      (user.role as "admin" | "producer" | "client" | "user" | "staff") ?? "user";

    const staffType = (user.staffType as string | null) ?? null;
    const impersonationRole = decoded.impersonationRole ?? null;

    // Producer-like resolution
    const isProducer = safeRole === "producer" || impersonationRole === "producer";

    const isProducerStaff =
      (safeRole === "staff" && staffType === "producer_staff") ||
      impersonationRole === "producer_staff" ||
      impersonationRole === "staff_producer"; // backward compatibility

    const isProducerLike = isProducer || isProducerStaff;

    const effectiveRole: "producer" | "producer_staff" | "client" | "admin" | "user" =
      isProducer
        ? "producer"
        : isProducerStaff
        ? "producer_staff"
        : safeRole === "client"
        ? "client"
        : safeRole === "admin"
        ? "admin"
        : "user";

    // סימון התחזות (תומך גם בפורמט החדש וגם בישן)
    const isImpersonated =
      !!decoded.impersonated || !!decoded.impersonatedByAdmin || !!decoded.impersonatedBy;

    console.log(
      "✅ ME:",
      user.email,
      "| role:",
      safeRole,
      "| hasPaid:",
      user.hasPaid === true,
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

          staffType,
          assignedProducerId: user.assignedProducerId
            ? String(user.assignedProducerId)
            : null,
          createdByProducer: !!user.createdByProducer,

          isProducerLike,
          isProducerStaff,

          // Access / payment status
          isActive: user.isActive === true,
          hasPaid: user.hasPaid === true,
          isTrial: user.isTrial === true,
          trialExpiresAt: user.trialExpiresAt ?? null,
          hasDashboardAccess: user.hasDashboardAccess === true,

          // Plan/package fields
          plan: user.plan ?? "basic",
          guests: user.guests ?? 0,
          paidAmount: user.paidAmount ?? 0,
          billingSource: user.billingSource ?? null,
          planLimits: user.planLimits ?? {},

          includeCalls: !!user.includeCalls,
          callsAddonPrice: user.callsAddonPrice ?? 0,

          includeCreditGifts: !!user.includeCreditGifts,
          creditGiftsAddonPrice: user.creditGiftsAddonPrice ?? 0,

          smsPerRecord: user.smsPerRecord ?? 0,
          maxMessages: user.maxMessages ?? 0,

          // usage
          smsUsed: user.smsUsed ?? 0,
          smsBalance: user.smsBalance ?? 0,
          whatsappBalance: user.whatsappBalance ?? 0,
          whatsappUsed: user.whatsappUsed ?? 0,

          producerPricePerRecord: user.producerPricePerRecord ?? 0,

          // impersonation meta
          impersonated: isImpersonated,
          impersonatedBy: decoded.impersonatedBy ?? null,
          impersonatedByAdmin: !!decoded.impersonatedByAdmin,
          adminId: decoded.adminId ?? null,
          impersonationRole,

          createdAt: user.createdAt,
          updatedAt: user.updatedAt ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("❌ ME API ERROR:", err);
    return NextResponse.json(
      { success: false, user: null },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
