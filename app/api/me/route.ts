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

  // מחיקה עם domain
  res.cookies.set(name, "", {
    ...base,
    ...(opts?.domain ? { domain: opts.domain } : {}),
    httpOnly: true,
  });

  // מחיקה גם בלי domain
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
}

/* =========================
   Types
========================= */
type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;

  role?: "admin" | "producer" | "client" | "user" | "staff";
  staffType?: string | null;
  producerId?: string | null;

  impersonated?: boolean;
  impersonatedBy?: string;

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
      return NextResponse.json(
        { success: false, user: null },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const cookieStore = await cookies();

    const authToken = cookieStore.get("authToken")?.value ?? null;
    const producerToken = cookieStore.get("producerAuthToken")?.value ?? null;

    // ✅ authToken תמיד קודם (כולל התחזות)
    const token = authToken || producerToken;

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
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
      clearAuthCookies(res);
      return res;
    }

    const baseUserId =
      decoded.userId || decoded.id || decoded._id || null;

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

    /* =========================
       ⭐ ROLE אפקטיבי
       בהתחזות → הטוקן גובר
    ========================= */
    const effectiveRole =
      decoded.impersonated && decoded.role
        ? decoded.role
        : (user.role as
            | "admin"
            | "producer"
            | "client"
            | "user"
            | "staff") ?? "user";

    const isImpersonatedUser =
      decoded.impersonated && effectiveRole === "user";

    console.log(
      "✅ ME:",
      user.email,
      "| role:",
      effectiveRole,
      decoded.impersonated ? "| impersonated" : ""
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          _id: String(user._id),
          name: user.name ?? "",
          email: user.email ?? "",

          /* ===== ROLE ===== */
          role: effectiveRole,

          /* ===== STAFF / PRODUCER (מנוטרל בהתחזות ללקוח) ===== */
          staffType: isImpersonatedUser ? null : user.staffType ?? null,
          assignedProducerId: isImpersonatedUser
            ? null
            : user.assignedProducerId
              ? String(user.assignedProducerId)
              : null,

          createdByProducer: !isImpersonatedUser && !!user.createdByProducer,

          /* ===== BUSINESS ===== */
          plan: user.plan,
          guests: user.guests,
          paidAmount: user.paidAmount,
          planLimits: user.planLimits,

          includeCalls: !!user.includeCalls,
          callsAddonPrice: user.callsAddonPrice ?? 0,
          includeCreditGifts: !!user.includeCreditGifts,

          producerPricePerRecord:
            isImpersonatedUser ? 0 : user.producerPricePerRecord ?? 0,

          /* ===== IMPERSONATION ===== */
          impersonated: !!decoded.impersonated,
          impersonatedBy: decoded.impersonatedBy ?? null,

          createdAt: user.createdAt,
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
