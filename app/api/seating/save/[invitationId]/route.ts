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
    const body = await req.json();

    const tables = Array.isArray(body.tables) ? body.tables : [];
    const background =
      body.background && typeof body.background.url === "string"
        ? {
            url: body.background.url,
            opacity:
              typeof body.background.opacity === "number"
                ? body.background.opacity
                : 0.28,
          }
        : null;

    /* ===============================
       1️⃣ UPDATE הושבה + רקע אולם
       מסמך אחד להזמנה (upsert)
    =============================== */
    const saved = await SeatingTable.findOneAndUpdate(
      { invitationId },
      {
        $set: {
          tables,
          background, // ⭐ נשמר רק אם תקין
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

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

        await InvitationGuest.findByIdAndUpdate(seated.guestId, {
          tableNumber: table.name ?? table.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      seatingId: saved._id,
      hasBackground: !!background,
    });
  } catch (err) {
    console.error("❌ Save seating error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
