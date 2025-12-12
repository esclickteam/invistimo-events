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
       0️⃣ params
    =============================== */
    const { invitationId } = await context.params;

    const { tables } = await req.json();

    if (!Array.isArray(tables)) {
      return NextResponse.json(
        { success: false, error: "No tables provided" },
        { status: 400 }
      );
    }

    /* ===============================
       1️⃣ UPDATE הושבה (לא CREATE חדש)
       ✔ מסמך אחד לכל invitationId
    =============================== */
    const saved = await SeatingTable.findOneAndUpdate(
      { invitationId },              // 🔑 מזהה יחיד
      {
        $set: {
          tables,
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,                // ← נוצר רק אם לא קיים בכלל
      }
    );

    /* =================================================
       ⚠️ חשוב מאוד – הערה עקרונית
       
       האמת של ההושבה נמצאת ב־SeatingTable בלבד.
       אם את משתמשת ב־tableNumber בדשבורד רק לתצוגה –
       עדיף לחשב אותו בזמן שליפה ולא לשמור כאן.
       
       אם בכל זאת את רוצה לשמור snapshot → זה הקוד:
    ================================================= */

    /* ===============================
       2️⃣ איפוס שולחן לאורחים (snapshot בלבד)
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

      for (const guestId of table.seatedGuests) {
        await InvitationGuest.findByIdAndUpdate(
          guestId,
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
