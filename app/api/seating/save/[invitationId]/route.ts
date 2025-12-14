import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

/* ⭐ Next.js 16 — params הוא Promise */
type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    /* ===============================
       0️⃣ params + body
    =============================== */
    const { invitationId } = await context.params;
    const { tables, background } = await req.json();

    if (!Array.isArray(tables)) {
      return NextResponse.json(
        { success: false, error: "No tables provided" },
        { status: 400 }
      );
    }

    /* ===============================
       1️⃣ UPDATE הושבה + רקע אולם
       מסמך אחד להזמנה (upsert)
    =============================== */
    const saved = await SeatingTable.findOneAndUpdate(
      { invitationId },
      {
        $set: {
          tables,
          background: background || null, // ⭐ חדש – שמירת רקע אולם
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    /* =================================================
       ⚠️ snapshot לאורחים (אופציונלי)
       נשאר כמו שהוא – לא נוגעים
    ================================================= */

    /* ===============================
       2️⃣ איפוס tableNumber לכל האורחים
    =============================== */
    await InvitationGuest.updateMany(
      { invitationId },
      { $set: { tableNumber: null } }
    );

    /* ===============================
       3️⃣ סנכרון snapshot: שולחן ← אורח
    =============================== */
    for (const table of tables) {
      if (!Array.isArray(table.seatedGuests)) continue;

      for (const seated of table.seatedGuests) {
        if (!seated?.guestId) continue;

        await InvitationGuest.findByIdAndUpdate(
          seated.guestId,
          {
            tableNumber: table.name ?? table.id,
          },
          { new: false }
        );
      }
    }

    return NextResponse.json({
      success: true,
      seatingId: saved._id,
    });
  } catch (err) {
    console.error("❌ Save seating error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
