import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmployeeDocumentType =
  | "form101"
  | "idCard"
  | "idCardAppendix"
  | "accountManagement"
  | "payslip";

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
      "",
  );
}

function isAdminUser(user: any) {
  const role = String(user?.role || "").toLowerCase();

  return (
    role === "admin" ||
    role === "super_admin" ||
    role === "owner" ||
    user?.isAdmin === true
  );
}

function normalizeDocumentType(value: string | null): EmployeeDocumentType {
  const raw = String(value || "").trim();

  if (raw === "idCard") return "idCard";
  if (raw === "idCardAppendix") return "idCardAppendix";
  if (raw === "accountManagement") return "accountManagement";
  if (raw === "payslip") return "payslip";
  if (raw === "form101") return "form101";

  return "form101";
}

function normalizePayrollMonth(value: string | null) {
  const raw = String(value || "").trim();

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  return "";
}

function serializeEmployeeDocument(document: any) {
  if (!document) return null;

  return {
    _id: String(document._id),
    id: String(document._id),

    employeeId: document.employeeId ? String(document.employeeId) : "",
    businessId: document.businessId ? String(document.businessId) : "",

    documentType: document.documentType || "form101",

    originalFileName: document.originalFileName || "",
    storedFileName: document.storedFileName || "",
    r2Key: document.r2Key || "",
    fileUrl: document.fileUrl || "",
    fileType: document.fileType || "",
    fileSize: Number(document.fileSize || 0),

    taxYear: Number(document.taxYear || new Date().getFullYear()),

    /**
     * חשוב לתלושי שכר
     */
    payrollMonth: document.payrollMonth || "",

    status: document.status || "uploaded",
    rejectionReason: document.rejectionReason || "",

    uploadedAt: document.uploadedAt,
    approvedAt: document.approvedAt || null,
    rejectedAt: document.rejectedAt || null,

    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

function buildCurrentDocumentQuery({
  employeeObjectId,
  taxYear,
  documentType,
  payrollMonth,
}: {
  employeeObjectId: mongoose.Types.ObjectId;
  taxYear: number;
  documentType: EmployeeDocumentType;
  payrollMonth?: string;
}) {
  if (documentType === "form101") {
    return {
      employeeId: employeeObjectId,
      taxYear,
      $or: [
        { documentType: "form101" },
        { documentType: { $exists: false } },
        { documentType: null },
      ],
    };
  }

  if (documentType === "payslip") {
    const query: Record<string, any> = {
      employeeId: employeeObjectId,
      documentType: "payslip",
    };

    /**
     * אם נשלח חודש — מחזיר תלושים של אותו חודש.
     * אם לא נשלח חודש — מחזיר את כל התלושים של העובד.
     */
    if (payrollMonth) {
      query.payrollMonth = payrollMonth;
    }

    return query;
  }

  return {
    employeeId: employeeObjectId,
    taxYear,
    documentType,
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const authResult = await getUserIdFromRequest(req);
    const userId = extractUserId(authResult);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    const admin = isAdminUser(user);

    const { searchParams } = new URL(req.url);

    const documentType = normalizeDocumentType(
      searchParams.get("documentType") || searchParams.get("type"),
    );

    const requestedEmployeeId = String(
      searchParams.get("employeeId") || "",
    ).trim();

    const finalEmployeeId =
      admin && requestedEmployeeId ? requestedEmployeeId : userId;

    if (!mongoose.Types.ObjectId.isValid(finalEmployeeId)) {
      return NextResponse.json(
        { error: "מזהה עובד לא תקין" },
        { status: 400 },
      );
    }

    const taxYearFromQuery = Number(searchParams.get("taxYear"));
    const taxYear =
      Number.isFinite(taxYearFromQuery) && taxYearFromQuery > 2000
        ? taxYearFromQuery
        : new Date().getFullYear();

    const payrollMonth = normalizePayrollMonth(
      searchParams.get("payrollMonth") || searchParams.get("month"),
    );

    const employeeObjectId = new mongoose.Types.ObjectId(finalEmployeeId);

    const query = buildCurrentDocumentQuery({
      employeeObjectId,
      taxYear,
      documentType,
      payrollMonth,
    });

    /**
     * תלושי שכר:
     * מחזירים רשימה, כי אדמין יכול להעלות כמה תלושים שרוצה.
     */
    if (documentType === "payslip") {
      const payslips = await EmployeeForm101.find(query)
        .sort({ payrollMonth: -1, createdAt: -1 })
        .lean();

      const serializedPayslips = payslips.map((item: any) =>
        serializeEmployeeDocument(item),
      );

      return NextResponse.json({
        success: true,

        document: serializedPayslips[0] || null,

        payslip: serializedPayslips[0] || null,
        payslips: serializedPayslips,

        form101: null,
        idCard: null,
        idCardAppendix: null,
        accountManagement: null,
      });
    }

    /**
     * מסמכים רגילים:
     * מחזירים רק את האחרון.
     */
    const document = await EmployeeForm101.findOne(query)
      .sort({ createdAt: -1 })
      .lean();

    const serialized = serializeEmployeeDocument(document);

    return NextResponse.json({
      success: true,

      document: serialized,

      form101: documentType === "form101" ? serialized : null,
      idCard: documentType === "idCard" ? serialized : null,
      idCardAppendix: documentType === "idCardAppendix" ? serialized : null,
      accountManagement:
        documentType === "accountManagement" ? serialized : null,

      payslip: null,
      payslips: [],
    });
  } catch (error) {
    console.error("GET CURRENT EMPLOYEE DOCUMENT FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בטעינת המסמך" },
      { status: 500 },
    );
  }
}