import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmployeeDocumentType = "form101" | "idCard";

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

function normalizeDocumentType(value: string | null) {
  const raw = String(value || "").trim();

  if (raw === "form101") return "form101";
  if (raw === "idCard") return "idCard";

  return "";
}

function documentTypeLabel(documentType?: string) {
  if (documentType === "idCard") return "תעודת זהות";
  if (documentType === "form101") return "טופס 101";

  return "טופס 101";
}

function serializeForm(form: any, employee?: any) {
  const documentType = String(form.documentType || "form101") as EmployeeDocumentType;

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

    documentType,
    documentTypeLabel: documentTypeLabel(documentType),

    originalFileName: form.originalFileName || "",
    storedFileName: form.storedFileName || "",
    r2Key: form.r2Key || "",
    fileUrl: form.fileUrl || "",

    fileType: form.fileType || "",
    fileSize: Number(form.fileSize || 0),

    taxYear: Number(form.taxYear || new Date().getFullYear()),
    status: form.status || "uploaded",

    rejectionReason: form.rejectionReason || "",

    uploadedAt: form.uploadedAt,
    approvedAt: form.approvedAt || null,
    rejectedAt: form.rejectedAt || null,

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

    /**
     * חדש:
     * documentType=form101
     * documentType=idCard
     * אם לא נשלח documentType — מחזיר את כל המסמכים.
     */
    const documentType = normalizeDocumentType(
      searchParams.get("documentType") || searchParams.get("type")
    );

    const query: Record<string, any> = {};

    if (status && ["uploaded", "approved", "rejected"].includes(status)) {
      query.status = status;
    }

    if (taxYear && !Number.isNaN(Number(taxYear))) {
      query.taxYear = Number(taxYear);
    }

    if (documentType === "idCard") {
      query.documentType = "idCard";
    }

    /**
     * תמיכה במסמכים ישנים:
     * לפני שהוספנו documentType, כל הרשומות הישנות הן בעצם טופס 101.
     */
    if (documentType === "form101") {
      query.$or = [
        { documentType: "form101" },
        { documentType: { $exists: false } },
        { documentType: null },
      ];
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
      employees.map((employee: any) => [String(employee._id), employee])
    );

    const data = forms.map((form: any) => {
      const employee = employeeMap.get(String(form.employeeId));
      return serializeForm(form, employee);
    });

    const stats = {
      total: data.length,
      form101: data.filter((item: any) => item.documentType === "form101").length,
      idCard: data.filter((item: any) => item.documentType === "idCard").length,
      uploaded: data.filter((item: any) => item.status === "uploaded").length,
      approved: data.filter((item: any) => item.status === "approved").length,
      rejected: data.filter((item: any) => item.status === "rejected").length,
    };

    return NextResponse.json({
      success: true,

      forms: data,

      // שם נוסף אם תרצי בהמשך לקרוא לזה documents
      documents: data,

      stats,
    });
  } catch (error) {
    console.error("ADMIN GET EMPLOYEE DOCUMENTS FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בטעינת מסמכי עובדים" },
      { status: 500 }
    );
  }
}