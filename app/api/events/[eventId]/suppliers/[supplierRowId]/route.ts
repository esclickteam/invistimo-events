import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

/**
 * ⚠️ Side-effect imports
 * חובה בשביל populate ב-Next.js
 */
import "@/models/Supplier";
import "@/models/EventSupplier";

import EventSupplier from "@/models/EventSupplier";

/* =========================================================
   PATCH – עדכון ספק לאירוע
========================================================= */
export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
      supplierRowId: string;
    }>;
  }
) {
  try {
    await db();

    const { eventId, supplierRowId } = await context.params;
    const body = await request.json();

    const allowedFields = [
      "supplierId",
      "price",
      "advance",
      "balance",
      "files",
    ] as const;

    const updateData: Partial<
      Record<(typeof allowedFields)[number], any>
    > = {};

    for (const key of allowedFields) {
      if (!(key in body)) continue;

      // 🔐 CAST NUMBERS SAFELY
      if (key === "price" || key === "advance" || key === "balance") {
        const value = Number(body[key]);
        updateData[key] = Number.isFinite(value) ? value : 0;
      } else {
        updateData[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await EventSupplier.findOneAndUpdate(
      { _id: supplierRowId, eventId },
      { $set: updateData },
      { new: true }
    )
      .populate("supplierId")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { error: "Event supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH event supplier error:", error);
    return NextResponse.json(
      { error: "Failed to update event supplier" },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE – הסרת ספק מהאירוע
========================================================= */
export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      eventId: string;
      supplierRowId: string;
    }>;
  }
) {
  try {
    await db();

    const { eventId, supplierRowId } = await context.params;

    const deleted = await EventSupplier.findOneAndDelete({
      _id: supplierRowId,
      eventId,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Event supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE event supplier error:", error);
    return NextResponse.json(
      { error: "Failed to delete event supplier" },
      { status: 500 }
    );
  }
}
