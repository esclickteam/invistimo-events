import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
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

function normalizeDocumentType(value: string | null): EmployeeDocumentType {
  const raw = String(value || "").trim();

  if (raw === "idCard") return "idCard";
  if (raw === "form101") return "form101";

  return "form101";
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

    status: document.status || "uploaded",
    rejectionReason: document.rejectionReason || "",

    uploadedAt: document.uploadedAt,
    approvedAt: document.approvedAt || null,
    rejectedAt: document.rejectedAt || null,

    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
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

    const { searchParams } = new URL(req.url);

    const documentType = normalizeDocumentType(
      searchParams.get("documentType") || searchParams.get("type")
    );

    const taxYearFromQuery = Number(searchParams.get("taxYear"));
    const taxYear =
      Number.isFinite(taxYearFromQuery) && taxYearFromQuery > 2000
        ? taxYearFromQuery
        : new Date().getFullYear();

    /**
     * כרגע מקור האמת הוא המשתמש המחובר.
     * גם אם הפרונט שולח employeeId, לא נסמוך עליו כדי שעובד לא יוכל לשלוף מסמך של עובד אחר.
     */
    const employeeObjectId = new mongoose.Types.ObjectId(userId);

    /**
     * לטופס 101:
     * תומך גם במסמכים ישנים שאין להם documentType,
     * כי לפני העדכון כל הרשומות היו בעצם form101.
     */
    const query =
      documentType === "form101"
        ? {
            employeeId: employeeObjectId,
            taxYear,
            $or: [
              { documentType: "form101" },
              { documentType: { $exists: false } },
              { documentType: null },
            ],
          }
        : {
            employeeId: employeeObjectId,
            taxYear,
            documentType: "idCard",
          };

    const document = await EmployeeForm101.findOne(query)
      .sort({ createdAt: -1 })
      .lean();

    const serialized = serializeEmployeeDocument(document);

    return NextResponse.json({
      success: true,

      document: serialized,

      // תאימות לקומפוננטות ישנות
      form101: documentType === "form101" ? serialized : null,
      idCard: documentType === "idCard" ? serialized : null,
    });
  } catch (error) {
    console.error("GET CURRENT EMPLOYEE DOCUMENT FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בטעינת המסמך" },
      { status: 500 }
    );
  }
}