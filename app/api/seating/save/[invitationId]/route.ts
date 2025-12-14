import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SeatingTable from "@/models/SeatingTable";
import InvitationGuest from "@/models/InvitationGuest";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ invitationId: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await dbConnect();

    const { invitationId } = await context.params;
    const body = await req.json();

    const tables = Array.isArray(body.tables) ? body.tables : [];

    // ⭐⭐⭐ FIX קריטי – תמיכה גם ב־string וגם באובייקט
    let background = null;

    if (typeof body.background === "string") {
      background = {
        url: body.background,
        opacity: 0.28,
      };
    } else if (
      body.background &&
      typeof body.background.url === "string"
    ) {
      background = {
        url: body.background.url,
        opacity:
          typeof body.background.opacity === "number"
            ? body.background.opacity
            : 0.28,
      };
    }

    const saved = await SeatingTable.findOneAndUpdate(
      { invitationId },
      {
        $set: {
          tables,
          background, // ⭐ עכשיו תמיד בפורמט נכון או null
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    // איפוס snapshot
    await InvitationGuest.updateMany(
      { invitationId },
      { $set: { tableNumber: null } }
    );

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
