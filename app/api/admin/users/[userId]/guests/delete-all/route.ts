import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/auth";

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

function getIdFromAuthResult(authResult: any) {
  if (!authResult) return null;

  if (typeof authResult === "string") {
    return authResult;
  }

  return (
    authResult.userId ||
    authResult._id ||
    authResult.id ||
    authResult.user?._id ||
    authResult.user?.id ||
    null
  );
}

function toObjectId(value?: string | null) {
  if (!value) return null;

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
}

function objectIdOrString(value?: string | null) {
  const objectId = toObjectId(value);

  if (!value) return [];

  return objectId ? [objectId, value] : [value];
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    const { userId } = await context.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה משתמש לא תקין",
        },
        { status: 400 }
      );
    }

    const authResult = await getUserIdFromRequest(req);
    const adminUserId = getIdFromAuthResult(authResult);

    if (!adminUserId || !mongoose.Types.ObjectId.isValid(adminUserId)) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const adminUser = await User.findById(adminUserId)
      .select("_id role")
      .lean();

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "אין הרשאת אדמין",
        },
        { status: 403 }
      );
    }

    const targetUser = await User.findById(userId)
      .select("_id invitationId")
      .lean();

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: "המשתמש לא נמצא",
        },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const bodyInvitationId =
      typeof body?.invitationId === "string" ? body.invitationId : null;

    const targetInvitationId =
      bodyInvitationId ||
      (typeof (targetUser as any).invitationId === "string"
        ? (targetUser as any).invitationId
        : null);

    let deleteFilter: any = null;

    if (targetInvitationId) {
      deleteFilter = {
        invitationId: {
          $in: objectIdOrString(targetInvitationId),
        },
      };
    } else {
      const targetObjectId = new mongoose.Types.ObjectId(userId);

      const invitations = await Invitation.find({
        $or: [
          { userId: targetObjectId },
          { userId },
          { ownerId: targetObjectId },
          { ownerId: userId },
          { clientId: targetObjectId },
          { clientId: userId },
        ],
      })
        .select("_id eventId")
        .lean();

      const invitationIds = invitations.flatMap((invitation: any) => [
        invitation._id,
        String(invitation._id),
      ]);

      const eventIds = invitations
        .filter((invitation: any) => invitation.eventId)
        .flatMap((invitation: any) => [
          invitation.eventId,
          String(invitation.eventId),
        ]);

      deleteFilter = {
        $or: [
          { userId: targetObjectId },
          { userId },
          { ownerId: targetObjectId },
          { ownerId: userId },
          { clientId: targetObjectId },
          { clientId: userId },
          ...(invitationIds.length
            ? [{ invitationId: { $in: invitationIds } }]
            : []),
          ...(eventIds.length ? [{ eventId: { $in: eventIds } }] : []),
        ],
      };
    }

    const result = await InvitationGuest.deleteMany(deleteFilter);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    console.error("Admin delete all guests failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "מחיקת המוזמנים נכשלה",
      },
      { status: 500 }
    );
  }
}