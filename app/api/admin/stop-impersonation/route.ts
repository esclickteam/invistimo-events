import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DecodedToken = {
  userId?: string;
  role?: string;

  // ישן
  impersonatedByAdmin?: boolean;
  adminId?: string;

  // חדש
  impersonated?: boolean;
  impersonationRole?: string; // "admin" | ...
  impersonatedBy?: string;

  iat?: number;
  exp?: number;
};

function getCookieDomain() {
  return process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;
}

function setExpiredCookie(
  res: NextResponse,
  name: string,
  opts?: { domain?: string; httpOnly?: boolean }
) {
  const base = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  // מחיקה עם domain
  res.cookies.set(name, "", {
    ...base,
    ...(opts?.domain ? { domain: opts.domain } : {}),
    httpOnly: opts?.httpOnly ?? true,
  });

  // מחיקה גם בלי domain (fallback חשוב)
  res.cookies.set(name, "", {
    ...base,
    httpOnly: opts?.httpOnly ?? true,
  });
}

export async function POST() {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: "JWT_SECRET missing" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get("authToken")?.value || null;
    const producerToken = cookieStore.get("producerAuthToken")?.value || null;
    const adminCookieToken = cookieStore.get("adminAuthToken")?.value || null;

    // authToken קודם, אחרת fallback
    const token = authToken || producerToken || adminCookieToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // תומך גם בישן וגם בחדש
    const legacyImpersonation = !!decoded.impersonatedByAdmin && !!decoded.adminId;
    const modernImpersonation =
      decoded.impersonated === true &&
      String(decoded.impersonationRole || "").toLowerCase() === "admin" &&
      !!decoded.impersonatedBy;

    if (!legacyImpersonation && !modernImpersonation) {
      return NextResponse.json(
        { success: false, error: "Not impersonating" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const adminId = decoded.adminId || decoded.impersonatedBy;
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: "Missing admin reference" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const admin = await User.findById(adminId).lean();
    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // JWT חדש לאדמין
    const adminToken = jwt.sign(
      {
        userId: String(admin._id),
        role: "admin",
        hasPaid: true, // לא חובה, אבל מונע חסימות Paid guard בטעות
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );

    const domain = getCookieDomain();

    // ניקוי מוחלט של כל טוקני מצב קודם
    setExpiredCookie(res, "authToken", { domain, httpOnly: true });
    setExpiredCookie(res, "producerAuthToken", { domain, httpOnly: true });

    // (אופציונלי) לנקות גם קוקיות client-readable אם אצלך בשימוש
    setExpiredCookie(res, "role", { domain, httpOnly: false });
    setExpiredCookie(res, "hasPaid", { domain, httpOnly: false });

    // כתיבת טוקן אדמין חדש
    const baseCookie = {
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      domain,
      maxAge: 60 * 60, // 1h
    };

    // authToken הראשי
    res.cookies.set("authToken", adminToken, {
      ...baseCookie,
      httpOnly: true,
    });

    // גיבוי אדמין ייעודי (שימושי לזרימות אדמין)
    res.cookies.set("adminAuthToken", adminToken, {
      ...baseCookie,
      httpOnly: true,
    });

    // client-readable role (אם UI שלך נשען על זה)
    res.cookies.set("role", "admin", {
      ...baseCookie,
      httpOnly: false,
    });

    res.cookies.set("hasPaid", "true", {
      ...baseCookie,
      httpOnly: false,
    });

    return res;
  } catch (err) {
    console.error("❌ Stop impersonation error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
