import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import Group from "@/models/Group";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =====================================================
   HELPERS
===================================================== */

function isValidObjectId(value?: string | null) {
  return Boolean(value && mongoose.Types.ObjectId.isValid(value));
}

function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
}

function buildIdValues(value?: string | null) {
  const clean = String(value || "").trim();
  if (!clean) return [];

  const values: any[] = [clean];

  if (mongoose.Types.ObjectId.isValid(clean)) {
    values.push(new mongoose.Types.ObjectId(clean));
  }

  return values;
}

function buildRelatedOrFilter({
  invitationId,
  eventId,
  shareId,
}: {
  invitationId: string;
  eventId?: string;
  shareId?: string;
}) {
  const invitationValues = buildIdValues(invitationId);
  const eventValues = buildIdValues(eventId || "");
  const shareValue = String(shareId || "").trim();

  const or: any[] = [];

  for (const value of invitationValues) {
    or.push({ invitationId: value });
    or.push({ invitation: value });
    or.push({ inviteId: value });
  }

  for (const value of eventValues) {
    or.push({ eventId: value });
    or.push({ event: value });
  }

  if (shareValue) {
    or.push({ shareId: shareValue });
  }

  return or.length ? { $or: or } : null;
}

async function deleteFromCollectionIfExists(
  collectionName: string,
  filter: Record<string, unknown>
) {
  try {
    const database = mongoose.connection.db;

    if (!database) {
      return {
        collection: collectionName,
        deletedCount: 0,
        skipped: true,
        reason: "Database connection is not ready",
      };
    }

    const exists = await database
      .listCollections({ name: collectionName })
      .hasNext();

    if (!exists) {
      return {
        collection: collectionName,
        deletedCount: 0,
        skipped: true,
      };
    }

    const result = await database.collection(collectionName).deleteMany(filter);

    return {
      collection: collectionName,
      deletedCount: result.deletedCount || 0,
      skipped: false,
    };
  } catch (err) {
    console.warn(`Delete skipped for collection ${collectionName}:`, err);

    return {
      collection: collectionName,
      deletedCount: 0,
      skipped: true,
      error: true,
    };
  }
}

async function pullGuestsFromSeatingCollections(
  guestIds: string[],
  relatedFilter: any
) {
  if (!guestIds.length || !relatedFilter) {
    return [];
  }

  const guestIdValues: any[] = [];

  for (const id of guestIds) {
    guestIdValues.push(id);

    if (mongoose.Types.ObjectId.isValid(id)) {
      guestIdValues.push(new mongoose.Types.ObjectId(id));
    }
  }

  const pullFilter = {
    guestId: { $in: guestIdValues },
  };

  const updates: any[] = [];

  const database = mongoose.connection.db;
  if (!database) return updates;

  const collections = ["seatings", "seatingtables", "seatingTables"];

  for (const collectionName of collections) {
    try {
      const exists = await database
        .listCollections({ name: collectionName })
        .hasNext();

      if (!exists) continue;

      const collection = database.collection(collectionName);

      const nested = await collection.updateMany(
        relatedFilter as any,
        {
          $pull: {
            "tables.$[].seatedGuests": pullFilter,
          },
        } as any
      );

      const flat = await collection.updateMany(
        relatedFilter as any,
        {
          $pull: {
            seatedGuests: pullFilter,
          },
        } as any
      );

      updates.push({
        collection: collectionName,
        nestedModified: nested.modifiedCount || 0,
        flatModified: flat.modifiedCount || 0,
      });
    } catch (err) {
      console.warn(`Seating cleanup skipped for ${collectionName}:`, err);

      updates.push({
        collection: collectionName,
        error: true,
      });
    }
  }

  return updates;
}

/* =====================================================
   DELETE — מחיקת הזמנה של משתמש
===================================================== */

export async function DELETE(req: NextRequest) {
  try {
    await db();

    const auth: any = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    const userId = body?.userId ? String(body.userId).trim() : "";
    const invitationId = body?.invitationId
      ? String(body.invitationId).trim()
      : "";

    if (!userId || !invitationId) {
      return NextResponse.json(
        {
          success: false,
          message: "חסר מזהה משתמש או מזהה הזמנה",
        },
        { status: 400 }
      );
    }

    if (!isValidObjectId(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה משתמש לא תקין",
        },
        { status: 400 }
      );
    }

    const authUser = await User.findById(auth.userId).select("_id role").lean();

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "משתמש מחובר לא נמצא",
        },
        { status: 401 }
      );
    }

    const effectiveRole =
      auth?.impersonationRole === "producer_staff"
        ? "producer"
        : auth?.impersonationRole || authUser.role || auth?.role;

    const isAdmin = effectiveRole === "admin";
    const isVenueOwner = effectiveRole === "venue_owner";

    if (!isAdmin && !isVenueOwner) {
      return NextResponse.json(
        {
          success: false,
          message: "אין הרשאה לביצוע הפעולה",
        },
        { status: 403 }
      );
    }

    const userObjectId = toObjectId(userId);

    const invitationIdValues = buildIdValues(invitationId);

    const invitationQuery: any = {
      $and: [
        {
          $or: [
            ...invitationIdValues.map((value) => ({ _id: value })),
            ...invitationIdValues.map((value) => ({ invitationId: value })),
            ...invitationIdValues.map((value) => ({ id: value })),
          ],
        },
        {
          $or: [
            { ownerId: userObjectId },
            { ownerId: userId },
            { userId: userObjectId },
            { userId },
          ],
        },
      ],
    };

    const invitation: any = await Invitation.findOne(invitationQuery)
      .select(
        "_id ownerId userId eventId shareId venueOwnerId venueHallId hallId venueHallName"
      )
      .lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          message: "לא נמצאה הזמנה מתאימה למשתמש הזה",
        },
        { status: 404 }
      );
    }

    if (isVenueOwner) {
      const authUserId = String(auth.userId);

      const invitationVenueOwnerId = invitation.venueOwnerId
        ? String(invitation.venueOwnerId)
        : "";

      if (invitationVenueOwnerId && invitationVenueOwnerId !== authUserId) {
        return NextResponse.json(
          {
            success: false,
            message: "אין הרשאה של בעל אולם למחיקת ההזמנה הזו",
          },
          { status: 403 }
        );
      }
    }

    const eventId = invitation.eventId ? String(invitation.eventId) : "";
    const shareId = invitation.shareId ? String(invitation.shareId) : "";

    const relatedFilter = buildRelatedOrFilter({
      invitationId: String(invitation._id || invitationId),
      eventId,
      shareId,
    });

    const directInvitationFilter = buildRelatedOrFilter({
      invitationId,
      eventId,
      shareId,
    });

    const finalRelatedFilter =
      relatedFilter && directInvitationFilter
        ? {
            $or: [
              ...(Array.isArray((relatedFilter as any).$or)
                ? (relatedFilter as any).$or
                : []),
              ...(Array.isArray((directInvitationFilter as any).$or)
                ? (directInvitationFilter as any).$or
                : []),
            ],
          }
        : relatedFilter || directInvitationFilter;

    if (!finalRelatedFilter) {
      return NextResponse.json(
        {
          success: false,
          message: "לא ניתן לבנות פילטר מחיקה",
        },
        { status: 400 }
      );
    }

    const guestsBeforeDelete = await InvitationGuest.find(finalRelatedFilter)
      .select("_id groupId")
      .lean();

    const guestIds = guestsBeforeDelete.map((guest: any) => String(guest._id));

    const seatingPullResults = await pullGuestsFromSeatingCollections(
      guestIds,
      finalRelatedFilter
    );

    const [guestsDeleteResult, groupsDeleteResult] = await Promise.all([
      InvitationGuest.deleteMany(finalRelatedFilter),
      Group.deleteMany(finalRelatedFilter),
    ]);

    const extraDeletes = await Promise.all([
      deleteFromCollectionIfExists("guests", finalRelatedFilter),
      deleteFromCollectionIfExists("invitationguests", finalRelatedFilter),
      deleteFromCollectionIfExists("invitationGuests", finalRelatedFilter),

      deleteFromCollectionIfExists("groups", finalRelatedFilter),
      deleteFromCollectionIfExists("guestgroups", finalRelatedFilter),
      deleteFromCollectionIfExists("guestGroups", finalRelatedFilter),

      deleteFromCollectionIfExists("scheduledmessages", finalRelatedFilter),
      deleteFromCollectionIfExists("scheduledMessages", finalRelatedFilter),

      deleteFromCollectionIfExists("whatsappqueues", finalRelatedFilter),
      deleteFromCollectionIfExists("whatsappQueues", finalRelatedFilter),
      deleteFromCollectionIfExists("whatsappqueue", finalRelatedFilter),
      deleteFromCollectionIfExists("WhatsappQueue", finalRelatedFilter),
    ]);

    const invitationDeleteResult = await Invitation.deleteOne({
      _id: invitation._id,
    });

    if (!invitationDeleteResult.deletedCount) {
      return NextResponse.json(
        {
          success: false,
          message: "ההזמנה לא נמחקה בפועל",
        },
        { status: 500 }
      );
    }

    await User.updateOne(
      {
        _id: userObjectId,
      },
      {
        $unset: {
          invitationId: "",
        },
      }
    ).catch((err) => {
      console.warn("User invitationId cleanup skipped:", err);
    });

    return NextResponse.json({
      success: true,
      message: "ההזמנה נמחקה בהצלחה",
      deleted: {
        invitations: invitationDeleteResult.deletedCount || 0,
        guests: guestsDeleteResult.deletedCount || 0,
        groups: groupsDeleteResult.deletedCount || 0,
        seatingPullResults,
        extraCollections: extraDeletes,
      },
    });
  } catch (err) {
    console.error("❌ Delete invitation error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "שגיאת שרת במחיקת ההזמנה",
      },
      { status: 500 }
    );
  }
}