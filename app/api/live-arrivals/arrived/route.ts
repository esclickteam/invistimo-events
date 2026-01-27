import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LiveArrival from "@/models/LiveArrival";
import SeatingTable from "@/models/SeatingTable";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

type PatchBody = {
  invitationId: string;
  guestId: string;
  arrivedCount: number;
};

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    // 🔐 אימות – חייב להיות מחובר
    const auth = await getUserIdFromRequest(req);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ⭐ מי באמת מעדכן (אימפרסונציה → מפיק)
    const updatedBy =
      auth.impersonated && auth.impersonatedBy
        ? auth.impersonatedBy
        : auth.userId;

    const body = (await req.json()) as PatchBody;
    const { invitationId, guestId, arrivedCount } = body;

    if (!invitationId || !guestId) {
      return NextResponse.json(
        { error: "Missing invitationId or guestId" },
        { status: 400 }
      );
    }

    const count = Math.max(0, Number(arrivedCount || 0));

    // 1️⃣ עדכון הגיעו בפועל
    const doc = await LiveArrival.findOneAndUpdate(
      { invitationId, guestId },
      {
        $set: {
          arrivedCount: count,
          arrivedAt: count > 0 ? new Date() : null,
          updatedBy,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    // 2️⃣ שליפת כל ההגעות להזמנה
    const arrivals = await LiveArrival.find({ invitationId }).lean();

    // 3️⃣ בניית arrivalMap (guestId → arrivedCount)
    const arrivalMap = new Map<string, number>();
    for (const a of arrivals) {
      arrivalMap.set(String(a.guestId), a.arrivedCount || 0);
    }

    // 4️⃣ שליפת כל השולחנות
    const tables = await SeatingTable.find({ invitationId }).lean();

    // 5️⃣ סינון הכיסאות לפי הגיעו בפועל
    const updates = tables.map((table) => {
      if (!Array.isArray(table.seatedGuests)) return null;

      const counter = new Map<string, number>();
      const newSeatedGuests = [];

      for (const seat of table.seatedGuests) {
        const gId = String(seat.guestId);
        const allowed = arrivalMap.get(gId) ?? 0;
        const current = counter.get(gId) ?? 0;

        if (current < allowed) {
          newSeatedGuests.push(seat);
          counter.set(gId, current + 1);
        }
      }

      return {
        tableId: table._id,
        seatedGuests: newSeatedGuests,
      };
    });

    // 6️⃣ עדכון DB – ❗ לא נוגעים ב־capacity
    await Promise.all(
      updates
        .filter(Boolean)
        .map((u: any) =>
          SeatingTable.findByIdAndUpdate(u.tableId, {
            seatedGuests: u.seatedGuests,
          })
        )
    );

    return NextResponse.json({
      success: true,
      arrivedCount: doc?.arrivedCount ?? 0,
    });
  } catch (e) {
    console.error("❌ PATCH /api/live-arrivals/arrived failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
