import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

import "@/models/EventLogisticsStep";
import EventLogisticsStep from "@/models/EventLogisticsStep";

/* =========================================================
   PATCH – עדכון שלב (time / title / status / order / phone)
========================================================= */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { stepId: string } }
) {
  try {
    await db();

    const body = await req.json();

    const updated = await EventLogisticsStep.findByIdAndUpdate(
      params.stepId,
      { $set: body },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    return NextResponse.json({ success: true, step: updated });
  } catch (err) {
    console.error("❌ PATCH logistics failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/* =========================================================
   DELETE – מחיקת שלב
========================================================= */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { stepId: string } }
) {
  try {
    await db();

    await EventLogisticsStep.findByIdAndDelete(params.stepId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ DELETE logistics failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
