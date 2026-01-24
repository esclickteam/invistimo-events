import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";

import EventSupplier from "@/models/EventSupplier";
import EventLogisticsStep from "@/models/EventLogisticsStep";

/* =========================================================
   POST – סנכרון ספקים ללוז
========================================================= */
export async function POST(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    await db();

    const { eventId } = params;

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

    /* =========================
       Existing logistics steps
    ========================= */
    const existingSteps = await EventLogisticsStep.find({
      eventId,
      source: "supplier",
    }).lean();

    const existingSupplierIds = new Set(
      existingSteps
        .filter((s) => s.supplierId)
        .map((s) => String(s.supplierId))
    );

    const baseOrder = await EventLogisticsStep.countDocuments({ eventId });

    /* =========================
       Build new steps
    ========================= */
    const toInsert = suppliers
      .filter(
        (s) =>
          s._id && !existingSupplierIds.has(String(s._id))
      )
      .map((s, index) => ({
        eventId,
        title: s.name || s.supplierName || "ספק",
        phone: s.phone || "",
        source: "supplier",
        supplierId: s._id,
        status: "pending",
        order: baseOrder + index,
      }));

    if (toInsert.length > 0) {
      await EventLogisticsStep.insertMany(toInsert);
    }

    /* =========================
       Return updated timeline
    ========================= */
    const steps = await EventLogisticsStep.find({ eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      steps,
    });
  } catch (err) {
    console.error("❌ POST /logistics/sync-suppliers failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
