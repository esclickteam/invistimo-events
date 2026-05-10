import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";

import EventSupplier from "@/models/EventSupplier";
import EventLogisticsStep from "@/models/EventLogisticsStep";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   POST – Sync suppliers into logistics timeline
========================================================= */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
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
    const { eventId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    /* =========================
       Load suppliers
    ========================= */
    const suppliers = await EventSupplier.find({ eventId }).lean();

    const existingSteps = await EventLogisticsStep.find({
      eventId,
      source: "supplier",
    }).lean();

    const existingSupplierIds = new Set(
      existingSteps.map((s) => String(s.supplierId))
    );

    const baseOrder = await EventLogisticsStep.countDocuments({ eventId });

    const toInsert = suppliers
      .filter(
        (s) =>
          s.supplierId &&
          !existingSupplierIds.has(String(s.supplierId))
      )
      .map((s, index) => ({
        eventId,
        title: s.supplierName || "ספק",
        phone: "",
        source: "supplier",
        supplierId: s.supplierId,
        status: "pending",
        order: baseOrder + index,
      }));

    if (toInsert.length > 0) {
      await EventLogisticsStep.insertMany(toInsert);
    }

    const steps = await EventLogisticsStep.find({ eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      steps,
    });
  } catch (err) {
    console.error("❌ POST sync-suppliers failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
