import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt, { JwtPayload } from "jsonwebtoken";

import { connectDB } from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =====================================================
   חילוץ userId מתוך JWT בצורה גמישה
===================================================== */
function extractUserIdFromPayload(payload: string | JwtPayload): string | null {
  if (!payload || typeof payload === "string") return null;

  return (
    (payload.userId as string) ||
    (payload._id as string) ||
    (payload.id as string) ||
    (payload.sub as string) ||
    null
  );
}

/* =====================================================
   חילוץ userId מתוך getUserIdFromRequest
   אצלך הפונקציה יכולה להחזיר string או AuthResult
===================================================== */
function extractUserIdFromAuthResult(authResult: any): string | null {
  if (!authResult) return null;

  if (typeof authResult === "string") {
    return authResult;
  }

  return (
    authResult.userId ||
    authResult._id ||
    authResult.id ||
    authResult.sub ||
    authResult.user?._id ||
    authResult.user?.id ||
    authResult.user?.userId ||
    null
  );
}

/* =====================================================
   חילוץ userId ישירות מהעוגיות כ־fallback
===================================================== */
function extractUserIdFromCookies(req: NextRequest): string | null {
  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

  if (!jwtSecret) return null;

  const possibleTokens = [
    req.cookies.get("authToken")?.value,
    req.cookies.get("token")?.value,
    req.cookies.get("adminAuthToken")?.value,
    req.cookies.get("adminToken")?.value,
  ].filter(Boolean) as string[];

  for (const token of possibleTokens) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      const userId = extractUserIdFromPayload(decoded);

      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        return userId;
      }
    } catch {
      // ממשיכים לטוקן הבא
    }
  }

  return null;
}

/* =====================================================
   בדיקת הרשאת אדמין:
   1. המשתמש המחובר הוא admin
   2. או אדמין שנכנס בהתחזות ויש לו adminToken/adminAuthToken
===================================================== */
async function resolveAdminAccess(req: NextRequest, currentUserId: string) {
  const currentUser = await User.findById(currentUserId).lean<any>();

  if (currentUser?.role === "admin") {
    return {
      allowed: true,
      adminUser: currentUser,
      source: "current-user",
    };
  }

  const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "";

  if (!jwtSecret) {
    return {
      allowed: false,
      adminUser: null,
      source: "missing-secret",
    };
  }

  const possibleAdminTokens = [
    req.cookies.get("adminToken")?.value,
    req.cookies.get("adminAuthToken")?.value,
  ].filter(Boolean) as string[];

  for (const token of possibleAdminTokens) {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      const adminUserId = extractUserIdFromPayload(decoded);

      if (!adminUserId || !mongoose.Types.ObjectId.isValid(adminUserId)) {
        continue;
      }

      const adminUser = await User.findById(adminUserId).lean<any>();

      if (adminUser?.role === "admin") {
        return {
          allowed: true,
          adminUser,
          source: "admin-token",
        };
      }
    } catch (error) {
      console.warn("⚠️ Invalid admin token while deleting guests:", error);
    }
  }

  return {
    allowed: false,
    adminUser: null,
    source: "not-admin",
  };
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    /* =====================================================
       1. בדיקת התחברות
    ===================================================== */
    const authResult = await getUserIdFromRequest(req);

    const userId =
      extractUserIdFromAuthResult(authResult) || extractUserIdFromCookies(req);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "משתמש לא תקין",
        },
        { status: 401 }
      );
    }

    /* =====================================================
       2. בדיקת הרשאת אדמין / אדמין בהתחזות
    ===================================================== */
    const adminAccess = await resolveAdminAccess(req, userId);

    if (!adminAccess.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "אין הרשאת אדמין",
        },
        { status: 403 }
      );
    }

    /* =====================================================
       3. קבלת invitationId מהפרונט
    ===================================================== */
    const body = await req.json().catch(() => ({}));

    const invitationId =
      typeof body?.invitationId === "string" ? body.invitationId : "";

    if (!invitationId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר invitationId",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(invitationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "invitationId לא תקין",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       4. מחיקת כל המוזמנים של ההזמנה בלבד
       חשוב: מוחקים גם אם invitationId נשמר כסטרינג וגם אם כ־ObjectId
    ===================================================== */
    const invitationObjectId = new mongoose.Types.ObjectId(invitationId);

    const result = await InvitationGuest.deleteMany({
      invitationId: {
        $in: [invitationObjectId, invitationId],
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: `נמחקו ${result.deletedCount || 0} מוזמנים בהצלחה`,
    });
  } catch (error) {
    console.error("❌ Delete all guests error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "שגיאה במחיקת כל המוזמנים",
      },
      { status: 500 }
    );
  }
}