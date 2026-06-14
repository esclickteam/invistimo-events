import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);

    const employeeId = cleanStr(searchParams.get("employeeId"));
    const businessId = cleanStr(searchParams.get("businessId"));

    if (!employeeId || !businessId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה עובד או עסק" },
        { status: 400 }
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(employeeId) ||
      !mongoose.Types.ObjectId.isValid(businessId)
    ) {
      return NextResponse.json(
        { success: false, error: "מזהה עובד או עסק לא תקין" },
        { status: 400 }
      );
    }

    const agreement = await EmployeeAgreement.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      businessId: new mongoose.Types.ObjectId(businessId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      agreement: agreement || null,
    });
  } catch (err) {
    console.error("GET EMPLOYEE AGREEMENT ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת הסכם העבודה",
      },
      { status: 500 }
    );
  }
}