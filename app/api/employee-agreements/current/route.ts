import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

/**
 * GET /api/employee-agreements/current?employeeId=...&businessId=...
 *
 * מחזיר את ההסכם האחרון של העובד בעסק.
 * אם אין הסכם — מחזיר agreement: null ולא שגיאה.
 */
export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);

    const employeeId = cleanStr(searchParams.get("employeeId"));
    const businessId = cleanStr(searchParams.get("businessId"));

    /**
     * חשוב:
     * בעמוד העובד לפעמים user נטען רגע אחרי הקריאה.
     * לכן אם חסר מזהה — לא מפילים את העמוד, מחזירים null.
     */
    if (!employeeId || !businessId) {
      return NextResponse.json(
        {
          success: true,
          agreement: null,
          message: "לא נשלחו מזהי עובד/עסק",
        },
        { status: 200 }
      );
    }

    if (!isValidObjectId(employeeId) || !isValidObjectId(businessId)) {
      return NextResponse.json(
        {
          success: true,
          agreement: null,
          message: "מזהה עובד או עסק לא תקין",
        },
        { status: 200 }
      );
    }

    const agreement = await EmployeeAgreement.findOne({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      businessId: new mongoose.Types.ObjectId(businessId),
    })
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .lean();

    return NextResponse.json(
      {
        success: true,
        agreement: agreement || null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET CURRENT EMPLOYEE AGREEMENT ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        agreement: null,
        error: "שגיאה בטעינת הסכם העבודה",
      },
      { status: 500 }
    );
  }
}

/**
 * כדי למנוע 405 אם הדפדפן/שרת עושה HEAD.
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
  });
}

/**
 * כדי למנוע 405 במקרים של preflight / בדיקות דפדפן.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, HEAD, OPTIONS",
    },
  });
}