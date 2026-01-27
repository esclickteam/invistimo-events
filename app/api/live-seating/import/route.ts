import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import SeatingTable from "@/models/SeatingTable";
import LiveArrival from "@/models/LiveArrival";

/**
 * 📸 Snapshot מלא של הושבה (כמו אצל הלקוח)
 * לשימוש בלייב הושבה – צד מפיק (readOnly)
 */
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
          liveArrivals: {}, // ⭐ חדש
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
          liveArrivals: {}, // ⭐ חדש
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

    /* ======================================================
       3️⃣.5 שליפת הגעות בפועל (LiveArrival) + בניית map
    ====================================================== */
    const arrivals = await LiveArrival.find({
      invitationId: invitationObjectId,
    })
      .select("guestId arrivedCount")
      .lean();

    const liveArrivals = Object.fromEntries(
      (arrivals || []).map((a: any) => [
        String(a.guestId),
        Math.max(0, Number(a.arrivedCount || 0)),
      ])
    );

    console.log("🚶 liveArrivals keys:", Object.keys(liveArrivals).length);

    /* ======================================================
       4️⃣ snapshot – AS IS (⭐ קריטי)
    ====================================================== */
    const tables = seating?.tables ?? [];
    const zones = seating?.zones ?? [];
    const background = seating?.background ?? null;
    const canvasView = seating?.canvasView ?? null;

    console.log("📦 Snapshot tables returned:", tables.length);
    console.log("🧱 Snapshot zones returned:", zones.length);
    console.log("🧭 canvasView returned:", canvasView);

    /* ======================================================
       5️⃣ מיפוי מוזמנים (לא חלק מהקנבס)
    ====================================================== */
    const liveGuests = guests.map((g: any) => ({
      _id: g._id.toString(),
      id: g._id.toString(),
      name: g.name,
      phone: g.phone || "",
      tableId: g.tableId ? g.tableId.toString() : null,

      guestsCount: g.guestsCount ?? 1,
      arrivedCount: g.arrivedCount ?? 0,
      rsvp: g.rsvp,
    }));

    console.log("👤 liveGuests sample:", liveGuests[0] ?? "NO GUESTS");

    /* ======================================================
       6️⃣ החזרת snapshot מלא (1:1 לקוח) + liveArrivals
    ====================================================== */
    console.log("✅ LIVE SEATING SNAPSHOT – SUCCESS");

    return NextResponse.json({
      guests: liveGuests,
      tables,
      zones,
      background,
      canvasView,
      eventId: invitation.eventId,
      liveArrivals, // ⭐ חדש
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
        liveArrivals: {}, // ⭐ חדש
      },
      { status: 200 }
    );
  }
}
