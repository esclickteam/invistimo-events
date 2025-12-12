import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

/* ⭐ POST — שמירת הושבה + סנכרון לאורחים */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* ⭐ פתרון params */
    const { invitationId } = await context.params;

    const body = await req.json();
    const { tables } = body;

    if (!Array.isArray(tables)) {
      return NextResponse.json(
        { success: false, error: "No tables provided" },
        { status: 400 }
      );
    }

    /* ===============================
       1️⃣ שמירת ההושבה
    =============================== */
    const saved = await SeatingTable.findOneAndUpdate(
      { invitationId },
      { tables },
      { new: true, upsert: true }
    );

    /* ===============================
       2️⃣ איפוס שולחן לכל האורחים
    =============================== */
    await InvitationGuest.updateMany(
      { invitationId },
      { $set: { tableNumber: null } }
    );

    /* ===============================
       3️⃣ סנכרון שולחן ← אורח
    =============================== */
    for (const table of tables) {
      if (!Array.isArray(table.seatedGuests)) continue;

      for (const guestId of table.seatedGuests) {
        await InvitationGuest.findByIdAndUpdate(guestId, {
          tableNumber: table.name || table.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      saved,
    });
  } catch (err) {
    console.error("❌ Save seating error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
