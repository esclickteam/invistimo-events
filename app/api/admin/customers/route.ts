import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();

    const filter: any = {};

    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const customers = await CustomerFile.find(filter)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה בטעינת לקוחות" },
      { status: 500 }
    );
  }
}