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

function objectIdOrString(value: unknown) {
  const clean = cleanString(value);
  const objectId = toObjectId(clean);

  if (objectId) {
    return [objectId, clean];
  }

  return clean ? [clean] : [];
}

function uniqueValues(values: any[]) {
  return Array.from(
    new Map(
      values
        .filter((value) => value !== undefined && value !== null && String(value).trim())
        .map((value) => [String(value), value])
    ).values()
  );
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

  const eventValues = uniqueValues(objectIdOrString(cleanEventId));
  const invitationValues = uniqueValues(objectIdOrString(cleanInvitationId));

  /*
    חשוב מאוד:
    לא מערבבים eventId עם invitationId.
    eventId מחפש רק בשדה eventId.
    invitationId מחפש רק בשדה invitationId.
  */
  if (eventValues.length) {
    queries.push({
      eventId: { $in: eventValues },
    });
  }

  if (invitationValues.length) {
    queries.push({
      invitationId: { $in: invitationValues },
    });
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

  const userValues = uniqueValues(objectIdOrString(userId));
  const eventValues = uniqueValues(objectIdOrString(eventId));
  const invitationValues = uniqueValues(objectIdOrString(invitationId));

  if (!userValues.length) {
    return queries;
  }

  /*
    fallback מדויק ללקוח לפי eventId בלבד.
    לא מחפשים eventId בתוך invitationId.
  */
  if (eventValues.length) {
    queries.push({
      userId: { $in: userValues },
      eventId: { $in: eventValues },
    });
  }

  /*
    fallback מדויק ללקוח לפי invitationId בלבד.
  */
  if (invitationValues.length) {
    queries.push({
      userId: { $in: userValues },
      invitationId: { $in: invitationValues },
    });
  }

  /*
    fallback מדויק לבעל אולם לפי eventId בלבד.
  */
  if (eventValues.length) {
    queries.push({
      venueOwnerId: { $in: userValues },
      eventId: { $in: eventValues },
    });
  }

  /*
    fallback מדויק לבעל אולם לפי invitationId בלבד.
  */
  if (invitationValues.length) {
    queries.push({
      venueOwnerId: { $in: userValues },
      invitationId: { $in: invitationValues },
    });
  }

  /*
    לא מוסיפים כאן:
    source: "venue_seating_template"

    כי זה עלול לטעון תבנית אולם ישנה אחרי רענון,
    במקום את ההושבה האמיתית של האירוע.
  */

  return queries;
}

function normalizeTablesForClient(tables: any[]) {
  if (!Array.isArray(tables)) return [];

  return tables.map((table) => {
    const seats = Math.max(
      0,
      Math.floor(Number(table?.seats ?? table?.capacity ?? 0))
    );

    return {
      ...table,
      seats,
      capacity: seats,
      seatedGuests: Array.isArray(table?.seatedGuests)
        ? table.seatedGuests
            .map((seat: any) => {
              const guestId = cleanString(
                seat?.guestId ?? seat?._id ?? seat?.id ?? ""
              );

              const seatIndex = Number(seat?.seatIndex);

              if (!guestId || !Number.isFinite(seatIndex)) {
                return null;
              }

              return {
                ...seat,
                guestId,
                seatIndex,
              };
            })
            .filter(Boolean)
        : [],
    };
  });
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
       2️⃣ שליפת הושבה מדויקת
       קודם לפי eventId / invitationId בלי ערבוב ביניהם.
    =============================== */

    const idQueries = createIdQueries({
      eventId: cleanEventId,
      invitationId,
    });

    let record =
      idQueries.length > 0
        ? await SeatingTable.findOne({
            $or: idQueries,
          })
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean()
        : null;

    const recordHasTables =
      Array.isArray(record?.tables) && record.tables.length > 0;

    /*
      fallback:
      רק אם לא נמצא record או שהוא ריק.
      גם כאן מחפשים מדויק:
      userId + eventId
      userId + invitationId
      venueOwnerId + eventId
      venueOwnerId + invitationId
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
      אבטחה למצב אולם:
      אם זה venueView=1, חייבים לוודא שבעל האולם המחובר הוא venueOwnerId של ההושבה.
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

    const normalizedTables = normalizeTablesForClient(
      Array.isArray(record?.tables) ? record.tables : []
    );

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
      tables: normalizedTables.length,
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

      tables: normalizedTables,
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