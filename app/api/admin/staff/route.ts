import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

export async function GET(_req: NextRequest) {
  try {
    await db();

    const staff = await User.find({
      $or: [
        { role: "staff" },
        { role: "employee" },
        { staffType: { $exists: true, $ne: "" } },
      ],
    })
      .select("_id name email role staffType")
      .sort({ name: 1, email: 1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        staff,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET ADMIN STAFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת עובדים",
      },
      { status: 500 }
    );
  }
}