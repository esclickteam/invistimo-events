import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import EventSupplier from "@/models/EventSupplier";
import Supplier from "@/models/Supplier";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   PATCH /event-suppliers/:id
   עדכון שורת ספק באירוע
========================================================= */

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rowId } = await context.params;

  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      supplierId,
      price,
      advance,
      status,
      notes,
      files,
    } = body;

    const row = await EventSupplier.findById(rowId);
    if (!row) {
      return NextResponse.json(
        { success: false, error: "ROW_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Supplier update (optional)
    ========================= */

    if (supplierId !== undefined) {
      if (supplierId === null) {
        row.supplierId = null;
        row.supplierName = undefined;
        row.supplierPhone = undefined;
      } else {
        const supplier = await Supplier.findById(supplierId).lean();
        if (!supplier) {
          return NextResponse.json(
            { success: false, error: "SUPPLIER_NOT_FOUND" },
            { status: 404 }
          );
        }

        row.supplierId = supplier._id;
        row.supplierName = supplier.name;
        row.supplierPhone = supplier.phone;
      }
    }

    /* =========================
       Financial fields
    ========================= */

    if (price !== undefined) {
      row.price = price;
    }

    if (advance !== undefined) {
      row.advance = advance;
    }

    /* =========================
       Status
    ========================= */

    if (status !== undefined) {
      row.status = status;
    }

    /* =========================
       Notes & Files
    ========================= */

    if (notes !== undefined) {
      row.notes = notes;
    }

    if (files !== undefined) {
      row.files = files;
    }

    await row.save(); // מפעיל middleware לחישוב balance

    return NextResponse.json({
      success: true,
      row,
    });
  } catch (err) {
    console.error("❌ PATCH /event-suppliers/:id failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
