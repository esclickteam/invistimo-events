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
  return {
    $or: [
      { userId },
      { ownerId: userId },
      { clientId: userId },
      { createdByUserId: userId },
    ],
    status: { $ne: "deleted" },
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
      חשוב:
      מחפשים Event עצמאי, לא Invitation.
      ניהול אירוע לא תלוי בהזמנה.
    */
    let event: any = await Event.findOne(buildEventOwnerQuery(userId))
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .lean();

    /*
      אם אין אירוע — יוצרים אירוע בסיסי אוטומטית.
      זה מאפשר ללקוח שקנה רק ניהול אירוע להיכנס בלי הזמנה.
    */
    if (!event) {
      const createdEvent: any = await Event.create({
        userId,
        ownerId: userId,

        email: user.email || "",
        title: "האירוע שלך",
        name: "האירוע שלך",

        eventType: "event",
        status: "active",

        date: null,
        eventDate: null,
        time: "00:00",
        eventTime: "00:00",

        maxGuests: 0,
        guests: 0,

        location: {
          name: "",
          address: "",
          lat: null,
          lng: null,
        },

        budget: {
          total: 0,
          paid: 0,
          remaining: 0,
        },

        suppliers: [],
        tasks: [],
        timeline: [],
        logistics: [],
        notes: "",

        productionOnly: true,
        createdFrom: "eventProduction",
      });

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
      const createdEvent: any = await Event.create({
        userId,
        ownerId: userId,
        title: "האירוע שלך",
        name: "האירוע שלך",
        eventType: "event",
        status: "active",
        date: null,
        eventDate: null,
        time: "00:00",
        eventTime: "00:00",
        location: {
          name: "",
          address: "",
          lat: null,
          lng: null,
        },
        budget: {
          total: 0,
          paid: 0,
          remaining: 0,
        },
        suppliers: [],
        tasks: [],
        timeline: [],
        logistics: [],
        notes: "",
        productionOnly: true,
        createdFrom: "eventProduction",
      });

      event = createdEvent.toObject();
    }

    const nextTitle =
      normalizeText(body.title) ||
      normalizeText(body.name) ||
      normalizeText(body.eventName) ||
      undefined;

    const update: any = cleanUndefined({
      title: nextTitle,
      name: nextTitle,

      eventType: body.eventType !== undefined ? body.eventType : undefined,
      status: body.status !== undefined ? body.status : undefined,

      date: body.date !== undefined ? body.date : undefined,
      eventDate: body.eventDate !== undefined ? body.eventDate : body.date,

      time: body.time !== undefined ? body.time : undefined,
      eventTime: body.eventTime !== undefined ? body.eventTime : body.time,

      maxGuests:
        body.maxGuests !== undefined ? Number(body.maxGuests || 0) : undefined,

      guests: body.guests !== undefined ? Number(body.guests || 0) : undefined,

      location:
        body.location !== undefined
          ? {
              name: normalizeText(body.location?.name),
              address: normalizeText(body.location?.address),
              lat: body.location?.lat ?? null,
              lng: body.location?.lng ?? null,
            }
          : undefined,

      budget: body.budget !== undefined ? body.budget : undefined,
      suppliers: Array.isArray(body.suppliers) ? body.suppliers : undefined,
      tasks: Array.isArray(body.tasks) ? body.tasks : undefined,
      timeline: Array.isArray(body.timeline) ? body.timeline : undefined,
      logistics: Array.isArray(body.logistics) ? body.logistics : undefined,
      notes: body.notes !== undefined ? String(body.notes || "") : undefined,

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
      },
      { status: 500 }
    );
  }
}