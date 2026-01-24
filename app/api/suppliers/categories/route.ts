// app/api/suppliers/categories/route.ts
import { NextResponse } from "next/server";
import SupplierCategory from "@/models/SupplierCategory";
import db from "@/lib/db";

export async function GET() {
  await db();
  const categories = await SupplierCategory.find().lean();
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  await db();
  const body = await req.json();
  const cat = await SupplierCategory.create(body);
  return NextResponse.json(cat);
}
