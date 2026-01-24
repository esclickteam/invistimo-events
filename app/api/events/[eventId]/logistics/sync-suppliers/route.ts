import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

import "@/models/EventSupplier";
import "@/models/EventLogisticsStep";

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

    const suppliers = await EventSupplier.find({ eventId }).lean();

    const existing = await EventLogisticsStep.find({
      eventId,
      source: "supplier",
    }).lean();

    const existingSupplierIds = new Set(
      existing.map((s) => String(s.supplierId))
    );

    const baseOrder = await EventLogisticsStep.countDocuments({ eventId });

    const toInsert = suppliers
      .filter((s) => s.supplierId && !existingSupplierIds.has(String(s.supplierId)))
      .map((s, i) => ({
        eventId,
        title: s.supplierName || "ספק",
        phone: s.phone || "",
        source: "supplier",
        supplierId: s.supplierId,
        status: "pending",
        order: baseOrder + i,
      }));

    if (toInsert.length) {
      await EventLogisticsStep.insertMany(toInsert);
    }

    const steps = await EventLogisticsStep.find({ eventId })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ success: true, steps });
  } catch (err) {
    console.error("❌ sync suppliers failed:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
