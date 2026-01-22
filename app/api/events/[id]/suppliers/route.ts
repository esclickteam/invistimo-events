import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import EventSupplier from "@/models/EventSupplier";
import Supplier from "@/models/Supplier";
import SupplierCategory from "@/models/SupplierCategory";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   GET /events/[id]/suppliers
   שליפת כל הספקים של אירוע
========================================================= */

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;

  try {
    await db();

    const auth = await getUserIdFromRequest();
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const suppliers = await EventSupplier.find({ eventId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      suppliers,
    });
  } catch (err) {
    console.error("❌ GET /events/[id]/suppliers failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST /events/[id]/suppliers
   הוספת ספק / תחום לאירוע
========================================================= */

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;

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
      categoryId,
      sub,
      supplierId,
      price,
      advance,
      notes,
    } = body;

    /* =========================
       Validation
    ========================= */

    if (!categoryId || !sub) {
      return NextResponse.json(
        { success: false, error: "MISSING_CATEGORY_OR_SUB" },
        { status: 400 }
      );
    }

    /* =========================
       Category snapshot
    ========================= */

    const category = await SupplierCategory.findById(categoryId).lean();
    if (!category) {
      return NextResponse.json(
        { success: false, error: "CATEGORY_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Supplier snapshot (optional)
    ========================= */

    let supplierName: string | undefined;
    let supplierPhone: string | undefined;
    let basePrice: number | null | undefined;

    if (supplierId) {
      const supplier = await Supplier.findById(supplierId).lean();
      if (!supplier) {
        return NextResponse.json(
          { success: false, error: "SUPPLIER_NOT_FOUND" },
          { status: 404 }
        );
      }

      supplierName = supplier.name;
      supplierPhone = supplier.phone;
      basePrice = supplier.basePrice ?? null;
    }

    /* =========================
       Create EventSupplier row
    ========================= */

    const row = await EventSupplier.create({
      eventId,
      categoryId,
      categoryName: category.name,
      sub,

      supplierId: supplierId || null,
      supplierName,
      supplierPhone,

      price: price ?? basePrice ?? null,
      advance: advance ?? 0,
      notes: notes ?? "",

      createdBy: auth.userId,
    });

    return NextResponse.json(
      { success: true, row },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST /events/[id]/suppliers failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
