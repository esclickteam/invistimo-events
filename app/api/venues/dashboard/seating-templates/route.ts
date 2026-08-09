import { NextRequest, NextResponse } from "next/server";

import VenueSeatingTemplate from "@/models/VenueSeatingTemplate";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function stringifyDocs<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getUserHallIds(user: any) {
  return [
    cleanString(user?.venueClientHallId),
    cleanString(user?.hallId),
    cleanString(user?.venueHallId),
    cleanString(user?.assignedHallId),
    cleanString(user?.venueSeatingService?.hallId),
  ].filter(Boolean);
}

function isVenueClientUser(user: any) {
  return (
    user?.venueClientSource === true ||
    user?.venueClientPackageType === "seating_only" ||
    user?.venueClientPackageType === "rsvp_seating" ||
    user?.venueClientPackageType === "rsvp_and_seating" ||
    user?.accessModules?.seatingTemplates === true ||
    user?.accessModules?.digitalSeating === true ||
    user?.includeSeating === true ||
    user?.includeDigitalSeating === true
  );
}

/* ============================================================
   GET templates
   בעל אולם: לפי ownerId + hallId
   לקוח אולם: לפי hallId ששמור עליו במשתמש
============================================================ */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const hallId = cleanString(searchParams.get("hallId"));

    if (!hallId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה אולם" },
        { status: 400 }
      );
    }

    const user = await User.findById(auth.userId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    const currentUser = user as any;

    const isAdmin =
      currentUser?.role === "admin" || currentUser?.impersonated === true;

    const isVenueOwner = currentUser?.role === "venue_owner";

    const allowedHallIds = getUserHallIds(currentUser);
    const isClientAllowedForHall =
      isVenueClientUser(currentUser) && allowedHallIds.includes(hallId);

    /*
      אבטחה:
      - אדמין יכול לראות
      - בעל אולם יכול לראות תבניות שהוא יצר
      - לקוח אולם יכול לראות רק hallId ששמור עליו
    */
    if (!isAdmin && !isVenueOwner && !isClientAllowedForHall) {
      return NextResponse.json(
        {
          success: false,
          error: "אין הרשאה לצפות בתבניות של האולם הזה",
        },
        { status: 403 }
      );
    }

    const query: any = {
      hallId,
      isActive: true,
    };

    /*
      בעל אולם רגיל רואה רק את התבניות שהוא יצר.
      לקוח אולם לא מסנן לפי ownerId כי ownerId הוא של בעל האולם,
      לא של הלקוח.
    */
    if (isVenueOwner && !isAdmin) {
      query.ownerId = auth.userId;
    }

    const templates = await VenueSeatingTemplate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      templates: stringifyDocs(templates),
    });
  } catch (error: any) {
    console.error("GET venue seating templates error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשליפת תבניות הושבה",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   POST create template
   מיועד לבעל אולם / אדמין ששומר תבנית
============================================================ */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const user = await User.findById(auth.userId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    const currentUser = user as any;

    const canCreateTemplate =
      currentUser?.role === "venue_owner" ||
      currentUser?.role === "admin" ||
      currentUser?.impersonated === true;

    if (!canCreateTemplate) {
      return NextResponse.json(
        { success: false, error: "אין הרשאה לשמור תבנית אולם" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const {
      hallId,
      hallName,
      name,
      description,
      tables,
      canvas,
      settings,
    } = body || {};

    const cleanHallId = cleanString(hallId);
    const cleanName = cleanString(name);

    if (!cleanHallId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה אולם" },
        { status: 400 }
      );
    }

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { success: false, error: "חסר שם תבנית" },
        { status: 400 }
      );
    }

    const template = await VenueSeatingTemplate.create({
      ownerId: auth.userId,
      hallId: cleanHallId,
      hallName: hallName ? String(hallName) : "",
      name: cleanName,
      description: description ? String(description) : "",
      tables: Array.isArray(tables) ? tables : [],
      canvas: canvas || {},
      settings: settings || {},
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      template: stringifyDocs(template),
    });
  } catch (error: any) {
    console.error("POST venue seating template error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בשמירת תבנית הושבה",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   PUT update / duplicate template
============================================================ */
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const templateId = cleanString(body.templateId || body.id || body._id);
    const action = cleanString(body.action || "update");

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה תבנית" },
        { status: 400 }
      );
    }

    const existing = await VenueSeatingTemplate.findOne({
      _id: templateId,
      ownerId: auth.userId,
      isActive: true,
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "תבנית לא נמצאה או שאין הרשאה" },
        { status: 404 }
      );
    }

    if (action === "duplicate") {
      const copy = await VenueSeatingTemplate.create({
        ownerId: auth.userId,
        hallId: existing.hallId,
        hallName: existing.hallName,
        name: `${existing.name} (עותק)`,
        description: existing.description,
        tables: existing.tables || [],
        canvas: existing.canvas || {},
        settings: existing.settings || {},
        isActive: true,
      });

      return NextResponse.json({
        success: true,
        template: stringifyDocs(copy),
      });
    }

    if (body.name !== undefined) {
      const cleanName = cleanString(body.name);
      if (cleanName.length < 2) {
        return NextResponse.json(
          { success: false, error: "שם תבנית קצר מדי" },
          { status: 400 }
        );
      }
      existing.name = cleanName;
    }
    if (body.description !== undefined) {
      existing.description = String(body.description || "");
    }
    if (Array.isArray(body.tables)) existing.tables = body.tables;
    if (body.canvas !== undefined) existing.canvas = body.canvas || {};
    if (body.settings !== undefined) existing.settings = body.settings || {};

    await existing.save();

    return NextResponse.json({
      success: true,
      template: stringifyDocs(existing),
    });
  } catch (error: any) {
    console.error("PUT venue seating template error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה בעדכון תבנית",
      },
      { status: 500 }
    );
  }
}

/* ============================================================
   DELETE soft-delete template
============================================================ */
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "לא מחובר" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const templateId = cleanString(
      url.searchParams.get("templateId") || url.searchParams.get("id")
    );

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה תבנית" },
        { status: 400 }
      );
    }

    const existing = await VenueSeatingTemplate.findOneAndUpdate(
      {
        _id: templateId,
        ownerId: auth.userId,
        isActive: true,
      },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "תבנית לא נמצאה או שאין הרשאה" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedTemplateId: templateId,
    });
  } catch (error: any) {
    console.error("DELETE venue seating template error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "שגיאה במחיקת תבנית",
      },
      { status: 500 }
    );
  }
}