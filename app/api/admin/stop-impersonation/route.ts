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
  impersonationRole?: string;
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

  // מחיקה גם בלי domain
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
    const adminToken = cookieStore.get("adminToken")?.value || null;
    const impersonationToken =
      cookieStore.get("impersonationToken")?.value || null;
    const legacyToken = cookieStore.get("token")?.value || null;

    const token =
      impersonationToken || authToken || adminToken || legacyToken;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    let decoded: DecodedToken;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const legacyImpersonation =
      !!decoded.impersonatedByAdmin && !!decoded.adminId;

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

    const newAdminToken = jwt.sign(
      {
        userId: String(admin._id),
        role: "admin",
        hasPaid: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const res = NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );

    const domain = getCookieDomain();

    // ניקוי כל הקוקיז שרואים אצלך בפועל
    setExpiredCookie(res, "adminToken", { domain, httpOnly: true });
    setExpiredCookie(res, "authToken", { domain, httpOnly: true });
    setExpiredCookie(res, "impersonationToken", { domain, httpOnly: true });
    setExpiredCookie(res, "token", { domain, httpOnly: true });
    setExpiredCookie(res, "hasPaid", { domain, httpOnly: false });

    const baseCookie = {
      path: "/",
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      ...(domain ? { domain } : {}),
      maxAge: 60 * 60,
    };

    // כתיבה מחדש של מצב אדמין
    res.cookies.set("adminToken", newAdminToken, {
      ...baseCookie,
      httpOnly: true,
    });

    res.cookies.set("authToken", newAdminToken, {
      ...baseCookie,
      httpOnly: true,
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