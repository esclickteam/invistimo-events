import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

/**
 * ייבוא מוזמנים + הושבה מהלקוח
 * יצירת snapshot ללייב הושבה עבור המפיק
 */
export async function POST(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { guests: [], tables: [] },
        { status: 200 }
      );
    }

    /* ======================================================
       1️⃣ שליפת מפת הושבה של הלקוח
    ====================================================== */
    const seating = await SeatingTable.findOne({ invitationId });

    /* ======================================================
       2️⃣ שליפת מוזמנים שאישרו הגעה
    ====================================================== */
    const guests = await InvitationGuest.find({
      invitationId,
      rsvp: "yes",
    });

    /* ======================================================
       3️⃣ בניית טבלאות ללייב
    ====================================================== */
    const tables =
      seating?.tables?.map((t) => {
        const tableId = t._id.toString();

        return {
          _id: tableId,
          label: t.name ?? "שולחן",
          capacity: t.capacity ?? 0,
          position: t.position ?? { x: 200, y: 200 },
          guestIds: guests
            .filter(
              (g) => g.tableId?.toString() === tableId
            )
            .map((g) => g._id.toString()),
        };
      }) || [];

    /* ======================================================
       4️⃣ בניית מוזמנים ללייב
    ====================================================== */
    const liveGuests = guests.map((g) => ({
      _id: g._id.toString(),
      fullName: g.name,
      phone: g.phone ?? "",
      tableId: g.tableId?.toString() ?? null,
      approvedCount: g.count ?? 1,
      arrived: 0, // לייב מתחיל מאפס
    }));

    /* ======================================================
       5️⃣ החזרת snapshot בטוח ל־UI
    ====================================================== */
    return NextResponse.json({
      guests: liveGuests,
      tables,
    });
  } catch (err) {
    console.error("LIVE SEATING IMPORT ERROR:", err);

    // גם בשגיאה – לא מפילים את ה־UI
    return NextResponse.json(
      { guests: [], tables: [] },
      { status: 200 }
    );
  }
}
