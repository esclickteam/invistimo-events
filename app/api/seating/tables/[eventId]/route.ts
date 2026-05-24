import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import { requireSeating } from "@/lib/guards/requireSeating";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ eventId: string }>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function createIdQueries({
  eventId,
  invitationId,
}: {
  eventId: string;
  invitationId?: string | null;
}) {
  const queries: any[] = [];

  const cleanEventId = cleanString(eventId);
  const cleanInvitationId = cleanString(invitationId);

  const eventObjectId = toObjectId(cleanEventId);
  const invitationObjectId = toObjectId(cleanInvitationId);

  if (cleanEventId) {
    queries.push({ eventId: cleanEventId });
    queries.push({ invitationId: cleanEventId });

    if (eventObjectId) {
      queries.push({ eventId: eventObjectId });
      queries.push({ invitationId: eventObjectId });
    }
  }

  if (cleanInvitationId) {
    queries.push({ invitationId: cleanInvitationId });
    queries.push({ eventId: cleanInvitationId });

    if (invitationObjectId) {
      queries.push({ invitationId: invitationObjectId });
      queries.push({ eventId: invitationObjectId });
    }
  }

  return queries;
}

function createUserFallbackQueries({
  userId,
  eventId,
  invitationId,
}: {
  userId: string;
  eventId: string;
  invitationId?: string | null;
}) {
  const queries: any[] = [];

  const userObjectId = toObjectId(userId);
  const eventObjectId = toObjectId(eventId);
  const invitationObjectId = toObjectId(invitationId);

  const userValues = [
    cleanString(userId),
    ...(userObjectId ? [userObjectId] : []),
  ].filter(Boolean);

  if (!userValues.length) {
    return queries;
  }

  /*
    fallback ללקוח:
    לקוח אולם עם אותו userId + אותו eventId.
  */
  if (eventObjectId) {
    queries.push({
      userId: { $in: userValues },
      eventId: eventObjectId,
    });
  }

  if (eventId) {
    queries.push({
      userId: { $in: userValues },
      eventId,
    });
  }

  /*
    fallback ללקוח לפי invitationId.
  */
  if (invitationObjectId) {
    queries.push({
      userId: { $in: userValues },
      invitationId: invitationObjectId,
    });
  }

  if (invitationId) {
    queries.push({
      userId: { $in: userValues },
      invitationId,
    });
  }

  /*
    fallback לבעל אולם:
    בעל האולם צריך לראות את אותו מסמך seatingtables
    שנוצר ללקוח, לפי venueOwnerId.
  */
  if (eventObjectId) {
    queries.push({
      venueOwnerId: { $in: userValues },
      eventId: eventObjectId,
    });
  }

  if (eventId) {
    queries.push({
      venueOwnerId: { $in: userValues },
      eventId,
    });
  }

  if (invitationObjectId) {
    queries.push({
      venueOwnerId: { $in: userValues },
      invitationId: invitationObjectId,
    });
  }

  if (invitationId) {
    queries.push({
      venueOwnerId: { $in: userValues },
      invitationId,
    });
  }

  /*
    fallback אחרון:
    לקוח אולם / בעל אולם שההושבה שלו נוצרה מתבנית אולם.
    זה לא נוגע בהושבה רגילה ולא בלייב.
  */
  queries.push({
    userId: { $in: userValues },
    source: "venue_seating_template",
  });

  queries.push({
    venueOwnerId: { $in: userValues },
    source: "venue_seating_template",
  });

  return queries;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const isVenueView = searchParams.get("venueView") === "1";

    /*
      הרשאת הושבה רגילה:
      - לקוח רגיל חייב לעבור requireSeating.
      - אולם שנכנס עם venueView=1 לא נחסם כאן,
        כי בהמשך אנחנו מחפשים רק מסמכים שבהם הוא venueOwnerId.
    */
    const guard = await requireSeating();

    if (!guard.ok && !isVenueView) {
      return guard.response!;
    }

    /*
      חשוב:
      אם החיפוש לפי eventId מחזיר מסמך ריק,
      נוכל למצוא את ההושבה האמיתית לפי המשתמש המחובר:
      - לקוח: userId
      - אולם: venueOwnerId
    */
    const auth = await getUserIdFromRequest(req).catch(() => null);
    const currentUserId = cleanString((auth as any)?.userId);

    if (isVenueView && !currentUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED_VENUE_VIEW",
        },
        { status: 401 }
      );
    }

    /* ===============================
       1️⃣ params
    =============================== */
    const { eventId } = await context.params;

    const cleanEventId = cleanString(eventId);

    if (!cleanEventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId" },
        { status: 400 }
      );
    }

    const invitationId = cleanString(searchParams.get("invitationId"));

    console.log("📤 LOAD SEATING TABLES:", {
      eventId: cleanEventId,
      invitationId: invitationId || null,
      currentUserId: currentUserId || null,
      isVenueView,
    });

    /* ===============================
       2️⃣ שליפת הושבה
       קודם לפי eventId / invitationId רגיל.
       אם לא נמצא, או שנמצא מסמך ריק — fallback לפי userId/venueOwnerId.
    =============================== */

    const idQueries = createIdQueries({
      eventId: cleanEventId,
      invitationId,
    });

    let record = await SeatingTable.findOne({
      $or: idQueries,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const recordHasTables =
      Array.isArray(record?.tables) && record.tables.length > 0;

    /*
      ✅ fallback:
      אם לא נמצא record, או שנמצא record ריק בלי שולחנות,
      נחפש מסמך אמיתי עם שולחנות לפי:
      - userId של הלקוח
      - venueOwnerId של האולם
    */
    if ((!record || !recordHasTables) && currentUserId) {
      const fallbackQueries = createUserFallbackQueries({
        userId: currentUserId,
        eventId: cleanEventId,
        invitationId,
      });

      if (fallbackQueries.length) {
        const fallbackRecord = await SeatingTable.findOne({
          $or: fallbackQueries,
          "tables.0": { $exists: true },
        })
          .sort({ updatedAt: -1, createdAt: -1 })
          .lean();

        if (fallbackRecord) {
          record = fallbackRecord;
        }
      }
    }

    /*
      🔒 אבטחה למצב אולם:
      אם זה venueView=1, לא מספיק שמצאנו record לפי eventId.
      חייבים לוודא שבעל האולם המחובר הוא באמת venueOwnerId של ההושבה.
    */
    if (isVenueView) {
      const recordVenueOwnerId = cleanString((record as any)?.venueOwnerId);

      if (!record || !recordVenueOwnerId || recordVenueOwnerId !== currentUserId) {
        return NextResponse.json(
          {
            success: false,
            error: "VENUE_VIEW_FORBIDDEN",
          },
          { status: 403 }
        );
      }
    }

    console.log("📦 RECORD FOUND:", {
      hasRecord: !!record,
      recordId: record?._id ? String(record._id) : null,
      source: record?.source ?? null,
      sourceTemplateId: record?.sourceTemplateId
        ? String(record.sourceTemplateId)
        : null,
      eventId: record?.eventId ? String(record.eventId) : null,
      invitationId: record?.invitationId ? String(record.invitationId) : null,
      userId: record?.userId ? String(record.userId) : null,
      venueOwnerId: record?.venueOwnerId ? String(record.venueOwnerId) : null,
      tables: Array.isArray(record?.tables) ? record.tables.length : 0,
      zones: Array.isArray(record?.zones) ? record.zones.length : 0,
      hasBackground: !!record?.background,
      canvasView: record?.canvasView ?? null,
      isVenueView,
    });

    /* ===============================
       3️⃣ החזרה מלאה לפרונט
    =============================== */
    return NextResponse.json({
      success: true,

      seatingRecordId: record?._id ? String(record._id) : null,
      source: record?.source ?? null,
      sourceTemplateId: record?.sourceTemplateId
        ? String(record.sourceTemplateId)
        : null,

      eventId: record?.eventId ? String(record.eventId) : cleanEventId,
      invitationId: record?.invitationId
        ? String(record.invitationId)
        : invitationId,

      userId: record?.userId ? String(record.userId) : null,
      venueOwnerId: record?.venueOwnerId ? String(record.venueOwnerId) : null,

      tables: Array.isArray(record?.tables) ? record.tables : [],
      background: record?.background ?? null,
      zones: Array.isArray(record?.zones) ? record.zones : [],
      canvasView: record?.canvasView ?? null,
    });
  } catch (err: any) {
    console.error("❌ Load seating tables error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}