import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    formId: string;
  }>;
};

type EmployeeDocumentStatus = "uploaded" | "approved" | "rejected";

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

function documentTypeLabel(documentType?: string) {
  if (documentType === "idCard") return "תעודת זהות";
  if (documentType === "form101") return "טופס 101";

  return "מסמך עובד";
}

function serializeEmployeeDocument(document: any) {
  if (!document) return null;

  const documentType = String(document.documentType || "form101");

  return {
    _id: String(document._id),
    id: String(document._id),

    employeeId: document.employeeId ? String(document.employeeId) : "",
    businessId: document.businessId ? String(document.businessId) : "",

    documentType,
    documentTypeLabel: documentTypeLabel(documentType),

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

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const admin = await requireAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { error: "אין הרשאת אדמין" },
        { status: 403 }
      );
    }

    const { formId } = await context.params;

    if (!formId || !mongoose.Types.ObjectId.isValid(formId)) {
      return NextResponse.json(
        { error: "מזהה מסמך לא תקין" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);

    const status = String(body?.status || "").trim() as EmployeeDocumentStatus;
    const rejectionReason = String(body?.rejectionReason || "").trim();

    if (!["uploaded", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "סטטוס לא תקין" },
        { status: 400 }
      );
    }

    const now = new Date();

    const updateData: Record<string, any> = {
      status,
      updatedAt: now,
    };

    if (status === "approved") {
      updateData.approvedAt = now;
      updateData.rejectedAt = null;
      updateData.rejectionReason = "";
    }

    if (status === "rejected") {
      updateData.rejectedAt = now;
      updateData.approvedAt = null;
      updateData.rejectionReason = rejectionReason;
    }

    if (status === "uploaded") {
      updateData.approvedAt = null;
      updateData.rejectedAt = null;
      updateData.rejectionReason = "";
    }

    const updated = await EmployeeForm101.findByIdAndUpdate(
      formId,
      updateData,
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { error: "מסמך לא נמצא" },
        { status: 404 }
      );
    }

    const serialized = serializeEmployeeDocument(updated);

    return NextResponse.json({
      success: true,

      document: serialized,

      // תאימות אחורה לקוד קיים באדמין שמצפה ל-form
      form: serialized,
    });
  } catch (error) {
    console.error("ADMIN UPDATE EMPLOYEE DOCUMENT STATUS FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בעדכון סטטוס המסמך" },
      { status: 500 }
    );
  }
}