import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import { writeAdminAuditLog } from "@/lib/admin/auditLog";
import { getAuthCookieDomain } from "@/lib/env/appEnv";
import { beginAdminCustomerSession } from "@/lib/admin/customerAccountSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function cookieOptions(maxAge: number) {
  const domain = getAuthCookieDomain();
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
    ...(domain ? { domain } : {}),
  };
}

function readRequestCookie(req: Request, name: string) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    const raw = trimmed.slice(name.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return "";
}

function verifyToken(token: string) {
  try {
    if (!token || !process.env.JWT_SECRET) return null;
    return jwt.verify(token, process.env.JWT_SECRET) as {
      userId?: string;
      id?: string;
      _id?: string;
      role?: string;
      impersonated?: boolean;
      impersonatedBy?: string;
      impersonatedByAdmin?: boolean;
      impersonationSourceRole?: string;
      adminId?: string;
      authVersion?: number;
    };
  } catch {
    return null;
  }
}

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) {
    return null;
  }
  return auth;
}

/**
 * Real admin session, including while already inside a customer account.
 * Switching customers must not keep the previous customer's identity.
 */
async function resolveAdminActor(req: NextRequest) {
  await connectDB();

  const names = [
    "adminAuthToken",
    "adminToken",
    "authToken",
    "token",
    "impersonationToken",
  ];
  const tokens: string[] = [];
  for (const name of names) {
    const value = readRequestCookie(req, name);
    if (value && !tokens.includes(value)) tokens.push(value);
  }

  let impersonationAdminId = "";

  for (const token of tokens) {
    const decoded = verifyToken(token);
    if (!decoded) continue;
    const tokenUserId = cleanString(
      decoded.userId || decoded.id || decoded._id
    );
    if (
      decoded.impersonatedByAdmin === true ||
      decoded.impersonationSourceRole === "admin"
    ) {
      impersonationAdminId = cleanString(
        decoded.impersonatedBy || decoded.adminId || impersonationAdminId
      );
    }

    if (!tokenUserId || decoded.impersonated === true) continue;
    if (cleanString(decoded.role) !== "admin") continue;

    const admin = await User.findById(tokenUserId).select("role authVersion").lean();
    if (!admin || (admin as any).role !== "admin") continue;

    return { adminUserId: tokenUserId, adminToken: token };
  }

  if (!impersonationAdminId || !mongoose.Types.ObjectId.isValid(impersonationAdminId)) {
    return null;
  }

  const admin = await User.findById(impersonationAdminId)
    .select("role authVersion")
    .lean();
  if (!admin || (admin as any).role !== "admin" || !process.env.JWT_SECRET) {
    return null;
  }

  const adminToken = jwt.sign(
    {
      userId: impersonationAdminId,
      role: "admin",
      hasPaid: true,
      isTrial: false,
      authVersion: Number((admin as any).authVersion ?? 0),
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { adminUserId: impersonationAdminId, adminToken };
}

/**
 * POST — enter the selected customer account with that customer's own session.
 * Same screens and queries as the customer. The actor stays recorded as admin.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = await resolveAdminActor(req);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const userId = cleanString(body?.userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: "מזהה משתמש לא תקין" },
        { status: 400 }
      );
    }

    if (userId === actor.adminUserId) {
      return NextResponse.json(
        { success: false, error: "לא ניתן להיכנס לחשבון האדמין עצמו" },
        { status: 400 }
      );
    }

    return beginAdminCustomerSession({
      adminUserId: actor.adminUserId,
      adminToken: actor.adminToken,
      targetUserId: userId,
    });
  } catch (err: any) {
    console.error("admin manage-user POST:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה" },
      { status: 500 }
    );
  }
}

/** DELETE — exit admin manage mode */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    const managedId = cleanString(auth.adminManagingUserId);
    if (managedId) {
      await connectDB();
      const target = await User.findById(managedId).select("name email").lean();
      const admin = await User.findById(auth.userId).select("name email").lean();
      await writeAdminAuditLog({
        adminUserId: String(auth.userId),
        adminName: cleanString((admin as any)?.name),
        adminEmail: cleanString((admin as any)?.email),
        managedUserId: managedId,
        managedUserName: cleanString((target as any)?.name),
        managedUserEmail: cleanString((target as any)?.email),
        action: "admin_manage_stop",
        summary: `אדמין יצא ממצב ניהול של ${(target as any)?.name || managedId}`,
      });
    }

    const res = NextResponse.json({ success: true });
    const opts = cookieOptions(0);
    res.cookies.set("adminManageUserId", "", opts);
    res.cookies.set("adminManageUserName", "", { ...opts, httpOnly: false });
    return res;
  } catch (err: any) {
    console.error("admin manage-user DELETE:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה" },
      { status: 500 }
    );
  }
}

/** GET — current manage context */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return NextResponse.json({
        success: true,
        isManaging: false,
        managedUser: null,
      });
    }

    const managedId = cleanString(auth.adminManagingUserId);
    if (!managedId) {
      return NextResponse.json({
        success: true,
        isManaging: false,
        managedUser: null,
      });
    }

    await connectDB();
    const target = await User.findById(managedId)
      .select("name email phone role")
      .lean();

    if (!target) {
      return NextResponse.json({
        success: true,
        isManaging: false,
        managedUser: null,
      });
    }

    return NextResponse.json({
      success: true,
      isManaging: true,
      managedUser: {
        _id: String(target._id),
        name: (target as any).name || "",
        email: (target as any).email || "",
        phone: (target as any).phone || "",
        role: (target as any).role || "",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה" },
      { status: 500 }
    );
  }
}
