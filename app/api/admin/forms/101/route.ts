import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
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

async function requireAdmin(req: NextRequest) {
  const authResult = await getUserIdFromRequest(req);
  const userId = extractUserId(authResult);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await User.findById(userId).lean();

  if (!user) return null;

  const role = String((user as any).role || "").toLowerCase();

  if (role !== "admin") {
    return null;
  }

  return user;
}

function serializeForm(form: any, employee?: any) {
  return {
    _id: String(form._id),
    id: String(form._id),

    employeeId: form.employeeId ? String(form.employeeId) : "",
    businessId: form.businessId ? String(form.businessId) : "",

    employeeName:
      employee?.name ||
      employee?.fullName ||
      [employee?.firstName, employee?.lastName].filter(Boolean).join(" ") ||
      "עובד ללא שם",

    employeeEmail: employee?.email || "",
    employeePhone: employee?.phone || "",

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

    const admin = await requireAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { error: "אין הרשאת אדמין" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const status = String(searchParams.get("status") || "").trim();
    const taxYear = String(searchParams.get("taxYear") || "").trim();

    const query: Record<string, any> = {};

    if (status && ["uploaded", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    if (taxYear && !Number.isNaN(Number(taxYear))) {
      query.taxYear = Number(taxYear);
    }

    const forms = await EmployeeForm101.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const employeeIds = forms
      .map((form: any) => form.employeeId)
      .filter(Boolean);

    const employees = await User.find({
      _id: { $in: employeeIds },
    })
      .select("_id name fullName firstName lastName email phone")
      .lean();

    const employeeMap = new Map(
      employees.map((employee: any) => [
        String(employee._id),
        employee,
      ])
    );

    const data = forms.map((form: any) => {
      const employee = employeeMap.get(String(form.employeeId));
      return serializeForm(form, employee);
    });

    return NextResponse.json({
      success: true,
      forms: data,
    });
  } catch (error) {
    console.error("ADMIN GET FORMS 101 FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בטעינת טפסי 101" },
      { status: 500 }
    );
  }
}