import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Supplier from "@/models/Supplier";
import SupplierCategory from "@/models/SupplierCategory";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

/* =========================================================
   POST /suppliers
   יצירת ספק חדש (מתוך SupplierPicker)
========================================================= */

export async function POST(req: NextRequest) {
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
      name,
      phone,
      email,
      link,
      notes,
      categoryId,
      sub,
      basePrice,
    } = body;

    /* =========================
       Validation
    ========================= */

    if (!name || !categoryId || !sub) {
      return NextResponse.json(
        { success: false, error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 }
      );
    }

    /* =========================
       Category validation
    ========================= */

    const category = await SupplierCategory.findById(categoryId).lean();
    if (!category) {
      return NextResponse.json(
        { success: false, error: "CATEGORY_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* =========================
       Duplicate prevention
    ========================= */

    const exists = await Supplier.findOne({
      name: name.trim(),
      phone: phone?.trim(),
      createdBy: auth.userId,
    });

    if (exists) {
      return NextResponse.json(
        { success: false, error: "SUPPLIER_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    /* =========================
       Create Supplier
    ========================= */

    const supplier = await Supplier.create({
      name: name.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      link: link?.trim(),
      notes: notes?.trim(),

      categoryId,
      sub,
      basePrice: basePrice ?? null,

      createdBy: auth.userId,
    });

    return NextResponse.json(
      { success: true, supplier },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ POST /suppliers failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
