import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ===============================
   TYPES
=============================== */

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

type BackgroundPayload = {
  url: string;
  opacity?: number;
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
  const stringValue = cleanString(value);
  const objectIdValue = toObjectId(stringValue);

  return objectIdValue ? [objectIdValue, stringValue] : [stringValue];
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
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

function getEventIdValues(eventId: string) {
  return uniqueValues(objectIdOrString(eventId));
}

function getInvitationIdValues(invitationId: string) {
  return uniqueValues(objectIdOrString(invitationId));
}

function getAuthUserIdValues(userId: string) {
  return uniqueValues(objectIdOrString(userId));
}

async function findInvitationForSeating({
  eventId,
  invitationId,
}: {
  eventId: string;
  invitationId?: string;
}) {
  const eventIdValues = getEventIdValues(eventId);

  if (invitationId) {
    const invitationObjectId = toObjectId(invitationId);

    if (invitationObjectId) {
      const directInvitation = await Invitation.findById(invitationObjectId)
        .select(
          "_id ownerId userId producerId producers eventId venueClientEventId productionEventId linkedEventId guests"
        )
        .lean();

      if (directInvitation) return directInvitation;
    }
  }

  return Invitation.findOne({
    $or: [
      { eventId: { $in: eventIdValues } },
      { venueClientEventId: { $in: eventIdValues } },
      { productionEventId: { $in: eventIdValues } },
      { linkedEventId: { $in: eventIdValues } },
      { event: { $in: eventIdValues } },
      { event_id: { $in: eventIdValues } },
    ],
  })
    .select(
      "_id ownerId userId producerId producers eventId venueClientEventId productionEventId linkedEventId guests"
    )
    .lean();
}

async function findLinkedVenueEvent({
  authUserId,
  eventId,
  invitationId,
  invitation,
}: {
  authUserId: string;
  eventId: string;
  invitationId?: string;
  invitation?: any;
}) {
  const events = getCollection("events");

  if (!events) return null;

  const ownerValues = getAuthUserIdValues(authUserId);
  const eventIdValues = getEventIdValues(eventId);

  const invitationValues: any[] = [];

  if (invitationId) {
    invitationValues.push(...getInvitationIdValues(invitationId));
  }

  if (invitation?._id) {
    invitationValues.push(...objectIdOrString(invitation._id));
  }

  const orQuery: any[] = [
    { _id: { $in: eventIdValues } },
    { eventId: { $in: eventIdValues } },
    { venueClientEventId: { $in: eventIdValues } },
    { productionEventId: { $in: eventIdValues } },
    { linkedEventId: { $in: eventIdValues } },
  ];

  const uniqueInvitationValues = uniqueValues(invitationValues);

  if (uniqueInvitationValues.length) {
    orQuery.push({ venueClientInvitationId: { $in: uniqueInvitationValues } });
    orQuery.push({ invitationId: { $in: uniqueInvitationValues } });
  }

  return events.findOne({
    venueOwnerId: { $in: ownerValues },
    venueAccessStatus: "linked",
    $or: orQuery,
  });
}

async function canSaveSeating({
  userId,
  eventId,
  invitationId,
  invitation,
}: {
  userId: string;
  eventId: string;
  invitationId?: string;
  invitation: any;
}) {
  const ownerId = invitation?.ownerId ? String(invitation.ownerId) : "";
  const invitationUserId = invitation?.userId ? String(invitation.userId) : "";
  const producerId = invitation?.producerId ? String(invitation.producerId) : "";

  const isOwner =
    ownerId === userId ||
    invitationUserId === userId ||
    producerId === userId;

  const isProducer =
    Array.isArray(invitation?.producers) &&
    invitation.producers.some((producer: any) => {
      const currentProducerId = String(producer?.userId ?? producer ?? "");
      return currentProducerId === userId;
    });

  if (isOwner || isProducer) {
    return true;
  }

  const linkedVenueEvent = await findLinkedVenueEvent({
    authUserId: userId,
    eventId,
    invitationId,
    invitation,
  });

  return Boolean(linkedVenueEvent);
}

function normalizeBackground(rawBackground: any): BackgroundPayload | null {
  if (typeof rawBackground === "string" && rawBackground.trim()) {
    return {
      url: rawBackground.trim(),
      opacity: 0.28,
    };
  }

  if (rawBackground?.url) {
    return {
      url: String(rawBackground.url).trim(),
      opacity:
        typeof rawBackground.opacity === "number"
          ? rawBackground.opacity
          : 0.28,
    };
  }

  return null;
}

function normalizeCanvasView(rawCanvasView: any) {
  if (
    rawCanvasView &&
    typeof rawCanvasView.scale === "number" &&
    typeof rawCanvasView.x === "number" &&
    typeof rawCanvasView.y === "number"
  ) {
    return {
      scale: rawCanvasView.scale,
      x: rawCanvasView.x,
      y: rawCanvasView.y,
    };
  }

  return null;
}

async function normalizeTablesWithGroups({
  rawTables,
  invitationId,
}: {
  rawTables: any[];
  invitationId: any;
}) {
  const groupIds: string[] = Array.from(
    new Set(
      rawTables
        .map((table: any) => table?.group)
        .filter((group: unknown): group is string => {
          return (
            typeof group === "string" &&
            mongoose.Types.ObjectId.isValid(group)
          );
        })
    )
  );

  const groups =
    groupIds.length > 0
      ? await Group.find({
          _id: {
            $in: groupIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          invitationId,
        }).lean()
      : [];

  const groupsById = new Map(groups.map((group: any) => [String(group._id), group]));

  return rawTables.map((table: any) => {
    if (typeof table.group === "string") {
      const group = groupsById.get(table.group);

      return {
        ...table,
        group: group
          ? {
              id: group._id,
              name: group.name ?? "",
              expectedCount: group.expectedCount ?? 0,
            }
          : null,
      };
    }

    return table;
  });
}

/* ===============================
   POST /api/seating/save/[eventId]
=============================== */

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

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
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_EVENT_ID",
          message: "חסר מזהה אירוע",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const invitationIdFromRequest = cleanString(
      body?.invitationId ||
        body?.venueClientInvitationId ||
        req.nextUrl.searchParams.get("invitationId") ||
        req.nextUrl.searchParams.get("invitation") ||
        ""
    );

    const rawTables = Array.isArray(body.tables) ? body.tables : [];
    const zones = Array.isArray(body.zones) ? body.zones : [];
    const background = normalizeBackground(body.background);
    const canvasView = normalizeCanvasView(body.canvasView);

    console.log("📥 SAVE SEATING BODY:", {
      eventId,
      invitationId: invitationIdFromRequest,
      tables: rawTables.length,
      zones: zones.length,
    });

    const invitation = await findInvitationForSeating({
      eventId,
      invitationId: invitationIdFromRequest,
    });

    if (!invitation?._id) {
      return NextResponse.json(
        {
          success: false,
          error: "INVITATION_NOT_FOUND",
          message: "ההזמנה לא נמצאה לפי האירוע או לפי invitationId",
        },
        { status: 404 }
      );
    }

    const allowed = await canSaveSeating({
      userId,
      eventId,
      invitationId: invitationIdFromRequest || String(invitation._id),
      invitation,
    });

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "אין הרשאה לשמור הושבה לאירוע הזה",
        },
        { status: 403 }
      );
    }

    const invitationId = invitation._id;
    const eventIdForDb = toObjectId(eventId) || eventId;

    const tables = await normalizeTablesWithGroups({
      rawTables,
      invitationId,
    });

    /*
      חשוב:
      במודל SeatingTable הקיים אין invitationId/shareId,
      ולכן לא שומרים אותם כאן כדי לא לקבל StrictModeError.
      השמירה עצמה נשארת לפי eventId כמו שהיה אצלך קודם.
      invitationId משמש רק להרשאות ולעדכון InvitationGuest.
    */
    const saved = await SeatingTable.findOneAndUpdate(
      {
        eventId: eventIdForDb,
      },
      {
        $set: {
          userId: invitation.userId || invitation.ownerId || userId,

          eventId: eventIdForDb,

          tables,
          zones,
          background,
          canvasView,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const updatedGuestIds = new Set<string>();

    for (const table of tables) {
      if (!Array.isArray(table.seatedGuests)) continue;

      const tableNumber =
        typeof table.name === "string"
          ? Number(table.name.replace(/\D/g, "")) || null
          : null;

      for (const seated of table.seatedGuests) {
        if (!seated?.guestId) continue;

        const guestId = String(seated.guestId);
        const guestObjectId = toObjectId(guestId);

        updatedGuestIds.add(guestId);

        await InvitationGuest.findOneAndUpdate(
          {
            _id: guestObjectId || guestId,
            invitationId,
          },
          {
            $set: {
              tableId: cleanString(table.id || table._id || ""),
              tableNumber,
              tableName: table.name ?? "",
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    const updatedGuestObjectIds = Array.from(updatedGuestIds)
      .map((id) => toObjectId(id))
      .filter(Boolean) as mongoose.Types.ObjectId[];

    await InvitationGuest.updateMany(
      {
        invitationId,
        ...(updatedGuestObjectIds.length
          ? { _id: { $nin: updatedGuestObjectIds } }
          : {}),
      },
      {
        $set: {
          tableId: null,
          tableNumber: null,
          tableName: "",
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      seatingId: String(saved._id),
      eventId,
      invitationId: String(invitationId),
      tablesCount: tables.length,
      zonesCount: zones.length,
    });
  } catch (err: any) {
    console.error("❌ Save seating error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: err?.message || "שגיאת שרת בשמירת הושבה",
      },
      { status: 500 }
    );
  }
}
