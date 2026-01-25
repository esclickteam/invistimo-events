import { NextResponse } from "next/server";
import db from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { Types } from "mongoose";

export const dynamic = "force-dynamic";

/* ============================================================
   טיפוסים מקומיים
============================================================ */
type SeatedGuest = {
  guestId: Types.ObjectId;
  seatIndex: number;
};

type TableItem = {
  id: string;
  name?: string;
  number?: number;
  seatedGuests?: SeatedGuest[];
};

type SeatingDoc = {
  invitationId: Types.ObjectId;
  tables?: TableItem[];
};

export async function GET(request: Request) {
  try {
    console.log("🟢 /api/guests GET called");

    await db();
    console.log("🟢 DB connected");

    /* ===============================
       Auth
    =============================== */
    const auth = await getUserIdFromRequest();

    if (!auth?.userId) {
      console.warn("🟠 No auth user");
      return NextResponse.json({ guests: [] });
    }

    const userId = auth.userId;
    console.log("🟢 userId:", userId);

    /* ===============================
       Query params
    =============================== */
    const { searchParams } = new URL(request.url);
    const invitationParam = searchParams.get("invitation");

    console.log("🟢 invitation param:", invitationParam);

    let invitationIds: Types.ObjectId[] = [];

    if (invitationParam) {
      // 👈 מצב לייב / מסך ספציפי
      invitationIds = [new Types.ObjectId(invitationParam)];
      console.log("🟢 Using single invitationId");
    } else {
      // 👈 מצב כללי (לקוח / מפיק)
      const invitations = await Invitation.find({
        $or: [{ ownerId: userId }, { producerId: userId }],
      })
        .select("_id")
        .lean();

      invitationIds = invitations.map((i) => i._id);
      console.log("🟢 Invitations found:", invitationIds.length);
    }

    if (!invitationIds.length) {
      console.warn("🟠 No invitationIds resolved");
      return NextResponse.json({ guests: [] });
    }

    /* ===============================
       Guests
    =============================== */
    const guests = await InvitationGuest.find({
      invitationId: { $in: invitationIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log("🟢 Guests loaded:", guests.length);

    /* ===============================
       Seating tables
    =============================== */
    const seatings = (await SeatingTable.find({
      invitationId: { $in: invitationIds },
    }).lean()) as SeatingDoc[];

    console.log("🟢 Seating docs loaded:", seatings.length);

    /* ===============================
       Attach table name to guest
    =============================== */
    const guestsWithTable = guests.map((guest) => {
      let tableName: string | null = null;

      const seating = seatings.find(
        (s) => s.invitationId.toString() === guest.invitationId.toString()
      );

      if (seating?.tables?.length) {
        const table = seating.tables.find((t) =>
          t.seatedGuests?.some(
            (sg) => sg.guestId.toString() === guest._id.toString()
          )
        );

        tableName =
          table?.name ??
          (table?.number != null ? `שולחן ${table.number}` : null);
      }

      if (!tableName) {
        console.log("🟠 Guest without table:", guest._id.toString());
      }

      return {
        ...guest,
        tableName,
      };
    });

    console.log(
      "🟢 Guests with table:",
      guestsWithTable.filter((g) => g.tableName).length
    );

    return NextResponse.json({ guests: guestsWithTable });
  } catch (err) {
    console.error("🔥 ERROR in GET /api/guests:", err);
    return NextResponse.json({ guests: [] });
  }
}
