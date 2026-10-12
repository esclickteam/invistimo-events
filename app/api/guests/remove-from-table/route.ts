import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { seatingAssignmentFromGuest, emptySeatingAssignment, seatingAssignmentsEqual, instrumentGuestWrite } from "@/lib/invitationGuestWrites";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  bumpSeatingMapVersion,
  customerExclusiveLockRequired,
  guardSeatingEditWrite,
  readSeatingWriteCredentials,
} from "@/lib/seating/editLockServer";
import { findInvitationForSeating } from "@/lib/seating/seatingAccess";

export async function POST(req: Request) {
  await dbConnect();

  const body = await req.json();
  const { guestId } = body;

  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  if (!guestId) {
    return NextResponse.json(
      { success: false, error: "MISSING_GUEST_ID" },
      { status: 400 }
    );
  }

  const guest = await InvitationGuest.findById(guestId).select(
    "_id tableId tableNumber tableName invitationId"
  ).lean();

  if (!guest) {
    return NextResponse.json(
      { success: false, error: "GUEST_NOT_FOUND" },
      { status: 404 }
    );
  }

  const unchanged = seatingAssignmentsEqual(
    seatingAssignmentFromGuest(guest),
    emptySeatingAssignment()
  );

  instrumentGuestWrite({
    source: "guests.remove-from-table",
    guestId: String(guestId),
    invitationId: guest.invitationId ? String(guest.invitationId) : null,
    fieldsAttempted: ["tableId", "tableName", "seatIndex"],
    changedFields: unchanged ? [] : ["tableId", "tableName", "tableNumber"],
    valuesChanged: !unchanged,
    skipped: unchanged,
    skipReason: unchanged ? "unchanged" : undefined,
    recentAttempts: 0,
  });

  if (unchanged) {
    return NextResponse.json({ success: true, skippedWrite: true });
  }

  const invitation = guest.invitationId
    ? await findInvitationForSeating({
        eventId: "",
        invitationId: String(guest.invitationId),
      })
    : null;
  const eventId = invitation?.eventId ? String(invitation.eventId) : "";
  const exclusiveLock = await customerExclusiveLockRequired(auth, eventId);
  let mapVersion: number | null = null;
  if (exclusiveLock) {
    const gate = await guardSeatingEditWrite({
      eventId,
      credentials: readSeatingWriteCredentials(body),
    });
    if (!gate.ok) {
      return NextResponse.json(gate.body, { status: gate.status });
    }
  } else if (eventId) {
    mapVersion = await bumpSeatingMapVersion(eventId);
  }

  await InvitationGuest.updateOne(
    { _id: guestId },
    {
      $unset: {
        tableId: "",
        tableName: "",
        seatIndex: "",
      },
    }
  );

  return NextResponse.json({
    success: true,
    ...(mapVersion != null ? { mapVersion } : {}),
  });
}
