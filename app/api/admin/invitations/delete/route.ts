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

function isValidObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

function toObjectId(value: string) {
  return new mongoose.Types.ObjectId(value);
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

export async function DELETE(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const adminUser = await User.findById(auth.userId)
      .select("_id role")
      .lean();

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "אין הרשאת אדמין לביצוע הפעולה",
        },
        { status: 403 }
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

    if (!isValidObjectId(userId) || !isValidObjectId(invitationId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה משתמש או מזהה הזמנה לא תקין",
        },
        { status: 400 }
      );
    }

    const userObjectId = toObjectId(userId);
    const invitationObjectId = toObjectId(invitationId);

    const invitation = await Invitation.findOne({
      _id: invitationObjectId,
      $or: [
        { ownerId: userObjectId },
        { ownerId: userId },
        { userId: userObjectId },
        { userId },
      ],
    })
      .select("_id ownerId userId eventId shareId")
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

    const eventId = invitation.eventId ? String(invitation.eventId) : "";
    const shareId = invitation.shareId ? String(invitation.shareId) : "";

    const eventObjectId =
      eventId && isValidObjectId(eventId) ? toObjectId(eventId) : null;

    const relatedFilter = {
      $or: [
        { invitationId: invitationObjectId },
        { invitationId },

        { inviteId: invitationObjectId },
        { inviteId: invitationId },

        { ownerId: userObjectId },
        { ownerId: userId },

        ...(eventId
          ? [
              { eventId },
              ...(eventObjectId ? [{ eventId: eventObjectId }] : []),
            ]
          : []),

        ...(shareId ? [{ shareId }] : []),
      ],
    };

    const guestFilter = {
      $or: [
        { invitationId: invitationObjectId },
        { invitationId },

        ...(eventId
          ? [
              { eventId },
              ...(eventObjectId ? [{ eventId: eventObjectId }] : []),
            ]
          : []),

        ...(shareId ? [{ shareId }] : []),
      ],
    };

    const groupFilter = {
      $or: [
        { invitationId: invitationObjectId },
        { invitationId },

        ...(eventId
          ? [
              { eventId },
              ...(eventObjectId ? [{ eventId: eventObjectId }] : []),
            ]
          : []),

        ...(shareId ? [{ shareId }] : []),
      ],
    };

    const [guestsDeleteResult, groupsDeleteResult] = await Promise.all([
      InvitationGuest.deleteMany(guestFilter),
      Group.deleteMany(groupFilter),
    ]);

    const extraDeletes = await Promise.all([
      deleteFromCollectionIfExists("guests", relatedFilter),
      deleteFromCollectionIfExists("invitationguests", relatedFilter),
      deleteFromCollectionIfExists("invitationGuests", relatedFilter),

      deleteFromCollectionIfExists("groups", relatedFilter),
      deleteFromCollectionIfExists("guestgroups", relatedFilter),
      deleteFromCollectionIfExists("guestGroups", relatedFilter),

      deleteFromCollectionIfExists("seatingtables", relatedFilter),
      deleteFromCollectionIfExists("seatingTables", relatedFilter),
      deleteFromCollectionIfExists("seatings", relatedFilter),

      deleteFromCollectionIfExists("scheduledmessages", relatedFilter),
      deleteFromCollectionIfExists("scheduledMessages", relatedFilter),

      deleteFromCollectionIfExists("whatsappqueues", relatedFilter),
      deleteFromCollectionIfExists("whatsappQueues", relatedFilter),
      deleteFromCollectionIfExists("whatsappqueue", relatedFilter),
      deleteFromCollectionIfExists("WhatsappQueue", relatedFilter),
    ]);

    const invitationDeleteResult = await Invitation.deleteOne({
      _id: invitationObjectId,
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
        extraCollections: extraDeletes,
      },
    });
  } catch (err) {
    console.error("❌ Delete invitation admin error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "שגיאת שרת במחיקת ההזמנה",
      },
      { status: 500 }
    );
  }
}