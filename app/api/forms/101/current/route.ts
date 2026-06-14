import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractUserId(authResult: any) {
  if (!authResult) return "";

  if (typeof authResult === "string") {
    return authResult;
  }

  return String(
    authResult.userId ||
      authResult.id ||
      authResult._id ||
      authResult.sub ||
      ""
  );
}

function serializeForm101(form: any) {
  if (!form) return null;

  return {
    _id: String(form._id),
    id: String(form._id),
    employeeId: form.employeeId ? String(form.employeeId) : "",
    businessId: form.businessId ? String(form.businessId) : "",
    originalFileName: form.originalFileName || "",
    storedFileName: form.storedFileName || "",
    r2Key: form.r2Key || "",
    fileUrl: form.fileUrl || "",
    fileType: form.fileType || "",
    fileSize: Number(form.fileSize || 0),
    taxYear: Number(form.taxYear || new Date().getFullYear()),
    status: form.status || "uploaded",
    uploadedAt: form.uploadedAt,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const authResult = await getUserIdFromRequest(req);
    const userId = extractUserId(authResult);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "לא מחובר" },
        { status: 401 }
      );
    }

    const taxYear = new Date().getFullYear();

    const form101 = await EmployeeForm101.findOne({
      employeeId: new mongoose.Types.ObjectId(userId),
      taxYear,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      form101: serializeForm101(form101),
    });
  } catch (error) {
    console.error("GET CURRENT FORM 101 FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בטעינת טופס 101" },
      { status: 500 }
    );
  }
}