import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   HELPERS
========================================================= */

function canUseEventProduction(user: any) {
  return (
    user?.role === "admin" ||
    user?.role === "producer" ||
    user?.accessModules?.eventProduction === true ||
    user?.includeEventManagement === true ||
    user?.selfManageEnabled === true
  );
}

function normalizeText(value: any) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanUndefined(obj: Record<string, any>) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });

  return obj;
}

function buildEventOwnerQuery(userId: string) {
  /*
    חשוב:
    כדי לא לפגוע בלוגיקה קיימת של Event,
    משתמשים קודם כל בשדה המרכזי userId.
  */
  return {
    userId,
    status: { $ne: "deleted" },
  };
}

function buildMinimalProductionEvent(userId: string, user: any) {
  /*
    Event מינימלי ובטוח לפי המבנה הכי בסיסי:
    לא מוסיפים כאן Invitation,
    לא מוסיפים budget/tasks/suppliers,
    ולא שמים date:null כדי לא להפיל validation.
  */
  return {
    userId,

    email: user?.email || "",
    title: "האירוע שלך",

    eventType: "wedding",
    status: "active",

    date: new Date(),
    time: "00:00",

    maxGuests: 100,
    location: {},

    productionOnly: true,
    createdFrom: "eventProduction",
  };
}

/* =========================================================
   GET – get or create production event
   /api/events/my-production
========================================================= */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const user: any = await User.findById(userId)
      .select(`
        name
        email
        role
        accessModules
        includeEventManagement
        selfManageEnabled
      `)
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "משתמש לא נמצא",
        },
        { status: 404 }
      );
    }

    if (!canUseEventProduction(user)) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_EVENT_PRODUCTION_ACCESS",
          message: "אין לך גישה למערכת ניהול אירוע",
        },
        { status: 403 }
      );
    }

    /*
      מחפשים Event עצמאי.
      לא מחפשים Invitation.
    */
    let event: any = await Event.findOne(buildEventOwnerQuery(userId))
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .lean();

    /*
      אם אין Event — יוצרים Event בסיסי בלבד.
    */
    if (!event) {
      const createdEvent: any = await Event.create(
        buildMinimalProductionEvent(userId, user)
      );

      event = createdEvent.toObject();
    }

    return NextResponse.json(
      {
        success: true,
        event,
        eventId: String(event._id),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("MY PRODUCTION EVENT GET ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בטעינת ניהול האירוע",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH – update my production event
   /api/events/my-production
========================================================= */
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const user: any = await User.findById(userId)
      .select(`
        name
        email
        role
        accessModules
        includeEventManagement
        selfManageEnabled
      `)
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "משתמש לא נמצא",
        },
        { status: 404 }
      );
    }

    if (!canUseEventProduction(user)) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_EVENT_PRODUCTION_ACCESS",
          message: "אין לך גישה למערכת ניהול אירוע",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    let event: any = await Event.findOne(buildEventOwnerQuery(userId))
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .lean();

    if (!event) {
      const createdEvent: any = await Event.create(
        buildMinimalProductionEvent(userId, user)
      );

      event = createdEvent.toObject();
    }

    const nextTitle =
      normalizeText(body.title) ||
      normalizeText(body.name) ||
      normalizeText(body.eventName) ||
      undefined;

    /*
      עדכון זהיר בלבד:
      לא מכניסים מערכים/אובייקטים שלא בטוח קיימים במודל.
      אם הטאבים שלך שומרים budget/suppliers/tasks דרך API אחרים —
      לא נוגעים בזה כאן.
    */
    const update: any = cleanUndefined({
      title: nextTitle,

      eventType:
        body.eventType !== undefined ? String(body.eventType || "wedding") : undefined,

      status:
        body.status !== undefined ? String(body.status || "active") : undefined,

      date: body.date !== undefined ? body.date : undefined,

      time:
        body.time !== undefined
          ? String(body.time || "00:00")
          : body.eventTime !== undefined
            ? String(body.eventTime || "00:00")
            : undefined,

      maxGuests:
        body.maxGuests !== undefined
          ? Number(body.maxGuests || 0)
          : body.guests !== undefined
            ? Number(body.guests || 0)
            : undefined,

      location:
        body.location !== undefined
          ? body.location && typeof body.location === "object"
            ? body.location
            : {}
          : undefined,

      productionOnly: true,
      updatedAt: new Date(),
    });

    const updatedEvent = await Event.findByIdAndUpdate(
      event._id,
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    return NextResponse.json(
      {
        success: true,
        event: updatedEvent,
        eventId: String(updatedEvent?._id || event._id),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("MY PRODUCTION EVENT PATCH ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בעדכון ניהול האירוע",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}