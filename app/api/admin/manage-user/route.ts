import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import { writeAdminAuditLog } from "@/lib/admin/auditLog";
import { getAuthCookieDomain } from "@/lib/env/appEnv";
import { pickPrimaryInvitation } from "@/lib/pickPrimaryInvitation";

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

async function requireAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId || auth.role !== "admin" || auth.impersonated) {
    return null;
  }
  return auth;
}

/** POST — start admin manage mode for a customer user */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
    }

    await connectDB();
    const body = await req.json().catch(() => ({}));
    const userId = cleanString(body?.userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: "מזהה משתמש לא תקין" },
        { status: 400 }
      );
    }

    const target = await User.findById(userId)
      .select("name email role")
      .lean();

    if (!target) {
      return NextResponse.json(
        { success: false, error: "המשתמש לא נמצא" },
        { status: 404 }
      );
    }

    const admin = await User.findById(auth.userId)
      .select("name email")
      .lean();

    const event = await Event.findOne({ userId: target._id, status: "active" })
      .sort({ date: -1 })
      .select("_id title")
      .lean();

    const invitations = await Invitation.find({
      $or: [{ userId: target._id }, { ownerId: String(target._id) }],
    })
      .select("_id shareId title eventId")
      .lean();

    const invitation =
      pickPrimaryInvitation(invitations as any[]) || invitations[0] || null;

    await writeAdminAuditLog({
      adminUserId: String(auth.userId),
      adminName: cleanString((admin as any)?.name),
      adminEmail: cleanString((admin as any)?.email),
      managedUserId: String(target._id),
      managedUserName: cleanString((target as any).name),
      managedUserEmail: cleanString((target as any).email),
      eventId: event ? String((event as any)._id) : null,
      invitationId: invitation ? String((invitation as any)._id) : null,
      action: "admin_manage_start",
      summary: `אדמין נכנס למצב ניהול עבור ${(target as any).name || (target as any).email}`,
    });

    const res = NextResponse.json({
      success: true,
      managedUser: {
        _id: String(target._id),
        name: (target as any).name || "",
        email: (target as any).email || "",
      },
      eventId: event ? String((event as any)._id) : null,
      invitationId: invitation ? String((invitation as any)._id) : null,
      redirectTo: "/dashboard",
    });

    res.cookies.set(
      "adminManageUserId",
      String(target._id),
      cookieOptions(60 * 60 * 8)
    );
    res.cookies.set(
      "adminManageUserName",
      encodeURIComponent(cleanString((target as any).name) || "משתמש"),
      {
        ...cookieOptions(60 * 60 * 8),
        httpOnly: false,
      }
    );

    return res;
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
      return NextResponse.json(
        { success: false, error: "אין הרשאה" },
        { status: 403 }
      );
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
