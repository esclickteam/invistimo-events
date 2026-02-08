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
}

/* =========================
   Types
========================= */
type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: "admin" | "producer" | "client" | "user" | "staff";

  impersonated?: boolean;
  impersonatedBy?: string;
  impersonationRole?: "admin" | "producer";
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

   

    // ✅ אם יש authToken – תמיד הוא האמת (גם בהתחזות)
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



    console.log(
      "✅ ME:",
      user.email,
      "| role:",
      safeRole,
      decoded.impersonated ? "| impersonated" : ""
    );

    return NextResponse.json(
      {
        success: true,
        user: {
  _id: String(user._id),
  name: user.name ?? "",
  email: user.email ?? "",

  role: safeRole,

  /* ===== STAFF ===== */
  staffType: user.staffType ?? null,
  assignedProducerId: user.assignedProducerId
    ? String(user.assignedProducerId)
    : null,

  createdByProducer: !!user.createdByProducer,

  // נתונים עסקיים
  plan: user.plan,
  guests: user.guests,
  paidAmount: user.paidAmount,
  planLimits: user.planLimits,

  producerPricePerRecord: user.producerPricePerRecord ?? 0,

  // impersonation
  impersonated: !!decoded.impersonated,
  impersonatedBy: decoded.impersonatedBy ?? null,
  impersonationRole: decoded.impersonationRole ?? null,

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
