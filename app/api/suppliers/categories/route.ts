import { NextRequest, NextResponse } from "next/server";
import SupplierCategory from "@/models/SupplierCategory";
import db from "@/lib/db";

/* =========================================================
   GET – כל תחומי הספקים
========================================================= */

export async function GET(_request: NextRequest) {
  await db();

  const categories = await SupplierCategory.find().lean();
  return NextResponse.json(categories);
}

/* =========================================================
   POST – הוספת תחום חדש
========================================================= */

export async function POST(request: NextRequest) {
  await db();

  const body = await request.json();
  const cat = await SupplierCategory.create(body);

  return NextResponse.json(cat);
}
