import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmployeeDocumentType = "form101" | "idCard" | "accountManagement";

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
      authResult.user?._id ||
      authResult.user?.id ||
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

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeDocumentType(value: string | null) {
  const raw = cleanString(value);

  if (raw === "form101") return "form101";
  if (raw === "idCard") return "idCard";
  if (raw === "accountManagement") return "accountManagement";

  return "";
}

function documentTypeLabel(documentType?: string) {
  if (documentType === "idCard") return "תעודת זהות";
  if (documentType === "accountManagement") return "אישור ניהול חשבון";
  if (documentType === "form101") return "טופס 101";

  return "טופס 101";
}

function normalizeFormFieldValues(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, item])
  );
}

function normalizeTemplateSnapshot(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const fieldsSource =
    value.fields instanceof Map
      ? Object.fromEntries(value.fields)
      : value.fields && typeof value.fields === "object"
      ? value.fields
      : {};

  return {
    ...value,
    fields: fieldsSource,
    pageWidth: Number(value.pageWidth || 900),
    pageHeight: Number(value.pageHeight || 1280),
  };
}

function serializeForm(form: any, employee?: any) {
  const documentType = String(
    form.documentType || "form101"
  ) as EmployeeDocumentType;

  const templateSnapshot = normalizeTemplateSnapshot(form.templateSnapshot);

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

    // חשוב לתיק עובד / צפייה חוזרת / ייצוא חוזר לפי אותה תבנית בדיוק
    formFieldValues: normalizeFormFieldValues(form.formFieldValues),
    templateSnapshot,
    templateId: form.templateId ? String(form.templateId) : "",
    templateUpdatedAt: form.templateUpdatedAt || null,
    templateApprovedAt: form.templateApprovedAt || null,

    hasTemplateSnapshot: Boolean(templateSnapshot?.fields),
    hasFormFieldValues: Boolean(
      form.formFieldValues && Object.keys(form.formFieldValues || {}).length
    ),
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const admin = await requireAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "אין הרשאת אדמין" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    const status = cleanString(searchParams.get("status"));
    const taxYear = cleanString(searchParams.get("taxYear"));

    /**
     * documentType=form101
     * documentType=idCard
     * documentType=accountManagement
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

    if (documentType === "accountManagement") {
      query.documentType = "accountManagement";
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
      form101: data.filter((item: any) => item.documentType === "form101")
        .length,
      idCard: data.filter((item: any) => item.documentType === "idCard")
        .length,
      accountManagement: data.filter(
        (item: any) => item.documentType === "accountManagement"
      ).length,
      uploaded: data.filter((item: any) => item.status === "uploaded").length,
      approved: data.filter((item: any) => item.status === "approved").length,
      rejected: data.filter((item: any) => item.status === "rejected").length,
    };

    return NextResponse.json({
      success: true,
      forms: data,
      documents: data,
      stats,
    });
  } catch (error) {
    console.error("ADMIN GET EMPLOYEE DOCUMENTS FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת מסמכי עובדים",
      },
      { status: 500 }
    );
  }
}
