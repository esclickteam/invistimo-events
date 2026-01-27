import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import SeatingTable from "@/models/SeatingTable";
import LiveArrival from "@/models/LiveArrival";

function sanitizeTablesByArrivals(
  tables: any[],
  arrivalMap: Map<string, number>
) {
  return tables.map((table) => {
    if (!Array.isArray(table.seatedGuests)) return table;

    const counter = new Map<string, number>();
    const newSeatedGuests = [];

    for (const sg of table.seatedGuests) {
      const guestId = String(sg.guestId);
      const allowed = arrivalMap.get(guestId) ?? 0;

      if (allowed <= 0) continue;

      const current = counter.get(guestId) ?? 0;

      if (current < allowed) {
        newSeatedGuests.push(sg);
        counter.set(guestId, current + 1);
      }
      // אחרת: מדלגים → הכיסא העודף נמחק
    }

    return {
      ...table,
      seatedGuests: newSeatedGuests,
    };
  });
}



export async function POST(req: Request) {
  try {
    console.log("🟡 LIVE SEATING SNAPSHOT – START");

    await connectDB();
    console.log("🟢 DB connected");

    const url = new URL(req.url);
    const invitationId = url.searchParams.get("invitationId");

    console.log("📥 invitationId:", invitationId);

    /* ======================================================
       0️⃣ אין invitationId → snapshot ריק
    ====================================================== */
    if (!invitationId) {
      console.warn("⚠️ No invitationId provided");
      return NextResponse.json(
        {
          guests: [],
          tables: [],
          zones: [],
          background: null,
          canvasView: null,
        },
        { status: 200 }
      );
    }

    const invitationObjectId = new mongoose.Types.ObjectId(invitationId);

    /* ======================================================
       1️⃣ שליפת Invitation
    ====================================================== */
    const invitation = await Invitation.findById(invitationObjectId).lean();

    if (!invitation || !invitation.eventId) {
      console.warn("⚠️ Invitation not found or missing eventId");
      return NextResponse.json(
        {
          guests: [],
          tables: [],
          zones: [],
          background: null,
          canvasView: null,
        },
        { status: 200 }
      );
    }

    console.log("🟢 Invitation found, eventId:", invitation.eventId.toString());

    const eventObjectId = new mongoose.Types.ObjectId(invitation.eventId);

    /* ======================================================
       2️⃣ שליפת Seating snapshot לפי eventId
    ====================================================== */
    const seating = await SeatingTable.findOne({
      eventId: eventObjectId,
    }).lean();

    if (!seating) {
      console.warn("⚠️ No seating snapshot found for event");
    } else {
      console.log("🟢 Seating snapshot found");
      console.log("📐 tables count:", seating.tables?.length ?? 0);
      console.log("🧱 zones count:", seating.zones?.length ?? 0);
      console.log("🎨 background:", seating.background ? "YES" : "NO");
      console.log("🔍 canvasView:", seating.canvasView);
    }

    /* ======================================================
       3️⃣ שליפת מוזמנים
    ====================================================== */
    const guests = await InvitationGuest.find({
      invitationId: invitationObjectId,
    }).lean();

    console.log("👥 guests found:", guests.length);

    const liveArrivals = await LiveArrival.find({
  invitationId: invitationObjectId,
}).lean();

const arrivalMap = new Map(
  liveArrivals.map((a: any) => [
    String(a.guestId),
    a.arrivedCount,
  ])
);


    /* ======================================================
       4️⃣ snapshot – AS IS (⭐ קריטי)
    ====================================================== */
    const rawTables = seating?.tables ?? [];

const tables = sanitizeTablesByArrivals(
  rawTables,
  arrivalMap
);

    const zones = seating?.zones ?? [];
    const background = seating?.background ?? null;
    const canvasView = seating?.canvasView ?? null;

    console.log("📦 Snapshot tables returned:", tables.length);
    console.log("🧱 Snapshot zones returned:", zones.length);
    console.log("🧭 canvasView returned:", canvasView);

    /* ======================================================
       5️⃣ מיפוי מוזמנים (לא חלק מהקנבס)
    ====================================================== */
    const liveGuests = guests.map((g: any) => {
  const arrivedCount =
    arrivalMap.get(String(g._id)) ?? 0;

  return {
    _id: g._id.toString(),
    id: g._id.toString(),
    name: g.name,
    phone: g.phone || "",
    tableId: g.tableId ? g.tableId.toString() : null,

    guestsCount: arrivedCount,   // ⭐ קובע כיסאות
    arrivedCount: arrivedCount,  // ⭐ אמת אחת
    rsvp: g.rsvp,
  };
});

    console.log("👤 liveGuests sample:", liveGuests[0] ?? "NO GUESTS");

    /* ======================================================
       6️⃣ החזרת snapshot מלא (1:1 לקוח)
    ====================================================== */
    console.log("✅ LIVE SEATING SNAPSHOT – SUCCESS");

    return NextResponse.json({
      guests: liveGuests,
      tables,
      zones,
      background,
      canvasView,
      eventId: invitation.eventId,
    });
  } catch (err) {
    console.error("❌ LIVE SEATING SNAPSHOT ERROR:", err);

    // 🛡️ לא מפילים UI גם בשגיאה
    return NextResponse.json(
      {
        guests: [],
        tables: [],
        zones: [],
        background: null,
        canvasView: null,
      },
      { status: 200 }
    );
  }
}
