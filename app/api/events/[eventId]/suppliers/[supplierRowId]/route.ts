import { NextResponse } from "next/server";
import db from "@/lib/db";
import EventSupplier from "@/models/EventSupplier";

/* =========================================================
   PATCH – עדכון ספק לאירוע
   מאפשר:
   - supplierId
   - price
   - advance
   - balance
   - files
========================================================= */

export async function PATCH(
  req: Request,
  { params }: { params: { eventId: string; supplierRowId: string } }
) {
  try {
    await db();

    const body = await req.json();

    // חסימת עדכון שדות אסורים (ביטחון בסיסי)
    const allowedFields = [
      "supplierId",
      "price",
      "advance",
      "balance",
      "files",
    ];

    const updateData: Record<string, any> = {};

    for (const key of allowedFields) {
      if (key in body) {
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
      {
        _id: params.supplierRowId,
        eventId: params.eventId,
      },
      { $set: updateData },
      { new: true }
    ).populate("supplierId");

    if (!updated) {
      return NextResponse.json(
        { error: "Event supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH event supplier error:", err);
    return NextResponse.json(
      { error: "Failed to update event supplier" },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE – הסרת ספק מהאירוע
   ⚠️ לא מוחק את הספק הגלובלי
========================================================= */

export async function DELETE(
  _req: Request,
  { params }: { params: { eventId: string; supplierRowId: string } }
) {
  try {
    await db();

    const deleted = await EventSupplier.findOneAndDelete({
      _id: params.supplierRowId,
      eventId: params.eventId,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Event supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE event supplier error:", err);
    return NextResponse.json(
      { error: "Failed to delete event supplier" },
      { status: 500 }
    );
  }
}
