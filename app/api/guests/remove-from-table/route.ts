import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import { seatingAssignmentFromGuest, emptySeatingAssignment, seatingAssignmentsEqual, instrumentGuestWrite } from "@/lib/invitationGuestWrites";

export async function POST(req: Request) {
  await dbConnect();

  const { guestId } = await req.json();

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

  return NextResponse.json({ success: true });
}
