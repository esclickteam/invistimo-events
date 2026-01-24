import { NextRequest, NextResponse } from "next/server";
import Supplier from "@/models/Supplier";
import db from "@/lib/db";

/* =========================================================
   GET – ספקים לפי תחום ותת־תחום
   /api/suppliers?categoryId=...&sub=...
========================================================= */

export async function GET(request: NextRequest) {
  await db();

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const sub = searchParams.get("sub");

  if (!categoryId || !sub) {
    return NextResponse.json(
      { error: "categoryId and sub are required" },
      { status: 400 }
    );
  }

  const suppliers = await Supplier.find({ categoryId, sub }).lean();
  return NextResponse.json(suppliers);
}

/* =========================================================
   POST – הוספת ספק חדש למאגר
========================================================= */

export async function POST(request: NextRequest) {
  await db();

  const body = await request.json();

  const supplier = await Supplier.create(body);
  return NextResponse.json(supplier);
}
