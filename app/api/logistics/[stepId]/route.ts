import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";

import EventLogisticsStep from "@/models/EventLogisticsStep";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   PATCH – Update logistics step
========================================================= */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ stepId: string }> }
) {
  try {
    await db();

    /* =========================
       Auth
    ========================= */
    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    /* =========================
       Params
    ========================= */
    const { stepId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(stepId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_STEP_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Body
    ========================= */
    const body = await req.json();

    const allowedFields = [
      "time",
      "title",
      "phone",
      "status",
      "order",
    ] as const;

    const update: Record<string, any> = {};

    for (const key of allowedFields) {
      if (key in body) {
        update[key] = body[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: true });
    }

    /* =========================
       Update
    ========================= */
    const step = await EventLogisticsStep.findByIdAndUpdate(
      stepId,
      { $set: update },
      { new: true }
    ).lean();

    if (!step) {
      return NextResponse.json(
        { success: false, error: "STEP_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      step,
    });
  } catch (err) {
    console.error("❌ PATCH logistics step failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
