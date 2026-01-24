// app/api/suppliers/route.ts
import { NextResponse } from "next/server";
import Supplier from "@/models/Supplier";
import db from "@/lib/db";

export async function GET(req: Request) {
  await db();
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const sub = searchParams.get("sub");

  const suppliers = await Supplier.find({ categoryId, sub });
  return NextResponse.json(suppliers);
}

export async function POST(req: Request) {
  await db();
  const body = await req.json();
  const supplier = await Supplier.create(body);
  return NextResponse.json(supplier);
}
