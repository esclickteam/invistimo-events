import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LiveArrival from "@/models/LiveArrival";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

type PatchBody = {
  invitationId: string;
  guestId: string;
  arrivedCount: number;
};

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    // 🔐 אימות
    const auth = await getUserIdFromRequest(req);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ⭐ מי באמת מעדכן (מפיק באימפרסונציה)
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

    // 🔄 עדכון / יצירה
    await LiveArrival.findOneAndUpdate(
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
        setDefaultsOnInsert: true,
      }
    );

    // 📊 שליפה מחודשת של כל ההגעות (סנכרון שולחנות)
    const rows = await LiveArrival.find({ invitationId })
      .select("guestId arrivedCount -_id")
      .lean();

    // ✅ Map מוכן ל־UI
    const arrivalMap: Record<string, number> = {};
    for (const r of rows) {
      arrivalMap[String(r.guestId)] =
        typeof r.arrivedCount === "number" ? r.arrivedCount : 0;
    }

    return NextResponse.json({
      success: true,
      arrivalMap,
    });
  } catch (e) {
    console.error("❌ PATCH /api/live-arrivals failed:", e);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
