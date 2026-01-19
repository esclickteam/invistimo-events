import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import SeatingTable from "@/models/SeatingTable";

/**
 * ייבוא מוזמנים + הושבה
 * snapshot ללייב הושבה (צד מפיק)
 */
export async function POST(req: Request) {
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

    const invitationObjectId = new mongoose.Types.ObjectId(invitationId);

    /* ======================================================
       1️⃣ שליפת ההזמנה → eventId
    ====================================================== */
    const invitation = await Invitation.findById(invitationObjectId).lean();

    if (!invitation || !invitation.eventId) {
      return NextResponse.json(
        { guests: [], tables: [] },
        { status: 200 }
      );
    }

    const eventObjectId = new mongoose.Types.ObjectId(invitation.eventId);

    /* ======================================================
       2️⃣ שליפת מפת הושבה לפי eventId
    ====================================================== */
    const seating = await SeatingTable.findOne({
      eventId: eventObjectId,
    }).lean();

    /* ======================================================
       3️⃣ שליפת כל המוזמנים
    ====================================================== */
    const guests = await InvitationGuest.find({
      invitationId: invitationObjectId,
    }).lean();

    /* ======================================================
       4️⃣ בניית טבלאות ללייב (מותאם ל-UI)
    ====================================================== */
    const tables =
      seating?.tables?.map((t: any) => {
        const tableCanvasId = t.id; // מזהה קנבס (string)

        return {
          _id: tableCanvasId,                 // ✅ תאימות ל-UI
          id: tableCanvasId,                  // אחורה
          label: t.name || "שולחן",           // מה שה-UI מציג
          name: t.name || "שולחן",
          capacity: t.seats || 0,             // ✅ חשוב
          x: t.x ?? 0,
          y: t.y ?? 0,
        };
      }) || [];

    /* ======================================================
       5️⃣ בניית מוזמנים ללייב (מותאם ל-UI)
    ====================================================== */
    const liveGuests = guests.map((g: any) => ({
      _id: g._id.toString(),                  // ✅ UI first
      id: g._id.toString(),
      name: g.name,
      phone: g.phone || "",
      tableId: g.tableId ? g.tableId.toString() : null,
      approvedCount: g.guestsCount ?? 1,      // ✅ UI משתמש בזה
      approved: g.guestsCount ?? 1,           // תאימות אחורה
      arrived: g.arrivedCount ?? 0,
      rsvp: g.rsvp,
    }));

    /* ======================================================
       6️⃣ החזרת snapshot ל־UI
    ====================================================== */
    return NextResponse.json({
      guests: liveGuests,
      tables,
    });
  } catch (err) {
    console.error("LIVE SEATING IMPORT ERROR:", err);

    // 🛡️ לא מפילים UI גם בשגיאה
    return NextResponse.json(
      { guests: [], tables: [] },
      { status: 200 }
    );
  }
}
