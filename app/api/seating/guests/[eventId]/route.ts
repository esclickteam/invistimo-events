import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import { requireSeating } from "@/lib/guards/requireSeating";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  return objectId ? [objectId, clean] : [clean];
}

async function findInvitation({
  eventId,
  invitationId,
}: {
  eventId: string;
  invitationId: string;
}) {
  const eventIdValues = objectIdOrString(eventId);
  const invitationObjectId = toObjectId(invitationId);

  /*
    הכי מדויק:
    אם הגיע invitationId מהאולם/לקוח — נטען לפיו.
  */
  if (invitationObjectId) {
    const byInvitationId = await Invitation.findById(invitationObjectId)
      .select("_id eventId venueClientEventId productionEventId linkedEventId")
      .lean();

    if (byInvitationId) {
      return byInvitationId;
    }
  }

  /*
    fallback רגיל:
    הזמנה לפי eventId.
  */
  return Invitation.findOne({
    $or: [
      { eventId: { $in: eventIdValues } },
      { venueClientEventId: { $in: eventIdValues } },
      { productionEventId: { $in: eventIdValues } },
      { linkedEventId: { $in: eventIdValues } },
    ],
  })
    .select("_id eventId venueClientEventId productionEventId linkedEventId")
    .lean();
}

async function verifyVenueCanView({
  eventId,
  invitationId,
  currentUserId,
}: {
  eventId: string;
  invitationId: string;
  currentUserId: string;
}) {
  const eventIdValues = objectIdOrString(eventId);
  const invitationIdValues = invitationId ? objectIdOrString(invitationId) : [];
  const ownerValues = objectIdOrString(currentUserId);

  const orQuery: any[] = [
    {
      venueOwnerId: { $in: ownerValues },
      eventId: { $in: eventIdValues },
    },
  ];

  if (invitationIdValues.length) {
    orQuery.push({
      venueOwnerId: { $in: ownerValues },
      invitationId: { $in: invitationIdValues },
    });
  }

  const seatingRecord = await SeatingTable.findOne({
    $or: orQuery,
  })
    .select("_id venueOwnerId eventId invitationId")
    .lean();

  return !!seatingRecord;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);

    const isVenueView = searchParams.get("venueView") === "1";
    const invitationIdFromQuery = cleanString(searchParams.get("invitationId"));

    /*
      הרשאה:
      - לקוח רגיל חייב חבילת הושבה.
      - אולם עם venueView=1 לא נחסם כאן, כי נבדוק אותו לפי venueOwnerId.
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
          guests: [],
          error: "UNAUTHORIZED_VENUE_VIEW",
        },
        { status: 401 }
      );
    }

    const { eventId } = await context.params;
    const cleanEventId = cleanString(eventId);

    if (!cleanEventId) {
      return NextResponse.json(
        {
          success: false,
          guests: [],
          error: "Missing eventId",
        },
        { status: 400 }
      );
    }

    /*
      אם זה אולם — מוודאים שהוא באמת בעל האולם של ההושבה הזאת.
    */
    if (isVenueView) {
      const allowed = await verifyVenueCanView({
        eventId: cleanEventId,
        invitationId: invitationIdFromQuery,
        currentUserId,
      });

      if (!allowed) {
        return NextResponse.json(
          {
            success: false,
            guests: [],
            error: "VENUE_VIEW_FORBIDDEN",
          },
          { status: 403 }
        );
      }
    }

    /*
      מציאת ההזמנה:
      במצב אולם חייבים להעדיף invitationId מה-query,
      כדי שהאולם יקבל את רשימת האורחים של הלקוח ולא של עצמו.
    */
    const invitation = await findInvitation({
      eventId: cleanEventId,
      invitationId: invitationIdFromQuery,
    });

    if (!invitation?._id) {
      return NextResponse.json({
        success: true,
        guests: [],
        invitationId: "",
      });
    }

    const guests = await InvitationGuest.find({
      invitationId: invitation._id,
    })
      .lean()
      .exec();

    /*
      Read-only overlay: expose table assignment from seatingtables so live
      ushers see the couple's plan even when InvitationGuest.tableName is empty.
      Never writes to guests or arrivals.
    */
    const eventIdValues = objectIdOrString(cleanEventId);
    const seating = await SeatingTable.findOne({
      $or: [
        { eventId: { $in: eventIdValues } },
        { invitationId: invitation._id },
      ],
    })
      .select("tables")
      .lean();

    const guestToTable = new Map<
      string,
      { tableId: string; tableName: string }
    >();

    for (const table of (seating as any)?.tables || []) {
      const tableId = cleanString(table?.id || table?._id);
      const tableName = cleanString(table?.name) || tableId;
      for (const seat of table?.seatedGuests || []) {
        const guestId = cleanString(seat?.guestId);
        if (!guestId) continue;
        guestToTable.set(guestId, { tableId, tableName });
      }
    }

    const guestsWithTables = (Array.isArray(guests) ? guests : []).map(
      (guest: any) => {
        const guestId = cleanString(guest?._id || guest?.id);
        const fromMap = guestToTable.get(guestId);
        return {
          ...guest,
          tableId: fromMap?.tableId || guest.tableId || null,
          tableName: fromMap?.tableName || guest.tableName || null,
        };
      }
    );

    return NextResponse.json({
      success: true,
      invitationId: String(invitation._id),
      guests: guestsWithTables,
    });
  } catch (err) {
    console.error("❌ Error loading seating guests:", err);

    return NextResponse.json(
      {
        success: false,
        guests: [],
        error: "Server error",
      },
      { status: 500 }
    );
  }
}