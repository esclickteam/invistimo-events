import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import path from "path";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import db from "@/lib/db";
import User from "@/models/User";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

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
      ""
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

function getSafeExtension(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase();

  if (ext === ".pdf") return ".pdf";
  if (ext === ".jpg") return ".jpg";
  if (ext === ".jpeg") return ".jpeg";
  if (ext === ".png") return ".png";

  return "";
}

function normalizeDocumentType(
  value: FormDataEntryValue | null
): EmployeeDocumentType {
  const raw = String(value || "").trim();

  if (raw === "idCard") return "idCard";
  if (raw === "accountManagement") return "accountManagement";
  if (raw === "form101") return "form101";

  return "form101";
}

function getDocumentFolder(documentType: EmployeeDocumentType) {
  if (documentType === "idCard") return "id-card";
  if (documentType === "accountManagement") return "account-management";
  return "101";
}

function getDocumentLabel(documentType: EmployeeDocumentType) {
  if (documentType === "idCard") return "תעודת זהות";
  if (documentType === "accountManagement") return "אישור ניהול חשבון";
  return "טופס 101";
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

function buildExistingDocumentQuery({
  employeeId,
  taxYear,
  documentType,
}: {
  employeeId: mongoose.Types.ObjectId;
  taxYear: number;
  documentType: EmployeeDocumentType;
}) {
  if (documentType === "form101") {
    return {
      employeeId,
      taxYear,
      $or: [
        { documentType: "form101" },
        { documentType: { $exists: false } },
        { documentType: null },
      ],
    };
  }

  return {
    employeeId,
    taxYear,
    documentType,
  };
}

function getRequestedEmployeeId({
  formDataEmployeeId,
  loggedInUserId,
  admin,
}: {
  formDataEmployeeId: string;
  loggedInUserId: string;
  admin: boolean;
}) {
  /**
   * באדמין:
   * לוקחים את employeeId שהגיע מהעמוד של העובד.
   *
   * עובד רגיל:
   * תמיד מעלה לעצמו בלבד לפי המשתמש המחובר.
   */
  if (admin && formDataEmployeeId) {
    return formDataEmployeeId;
  }

  return loggedInUserId;
}

function getRequestedBusinessId({
  formDataBusinessId,
  userBusinessId,
}: {
  formDataBusinessId: string;
  userBusinessId: unknown;
}) {
  /**
   * businessId לא חובה.
   * אם יש — נשמור.
   * אם אין — המסמך עדיין נשמר לפי employeeId.
   */
  if (
    formDataBusinessId &&
    mongoose.Types.ObjectId.isValid(formDataBusinessId)
  ) {
    return new mongoose.Types.ObjectId(formDataBusinessId);
  }

  const userBusinessIdString = String(userBusinessId || "");

  if (
    userBusinessIdString &&
    mongoose.Types.ObjectId.isValid(userBusinessIdString)
  ) {
    return new mongoose.Types.ObjectId(userBusinessIdString);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const authResult = await getUserIdFromRequest(req);
    const loggedInUserId = extractUserId(authResult);

    if (
      !loggedInUserId ||
      !mongoose.Types.ObjectId.isValid(loggedInUserId)
    ) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const user = await User.findById(loggedInUserId).lean();

    if (!user) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    const admin = isAdminUser(user);

    const formData = await req.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "לא נשלח קובץ" }, { status: 400 });
    }

    const documentType = normalizeDocumentType(
      formData.get("documentType") || formData.get("type")
    );

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "אפשר להעלות רק PDF, JPG או PNG" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "הקובץ גדול מדי. מקסימום 10MB" },
        { status: 400 }
      );
    }

    const ext = getSafeExtension(file.name);

    if (!ext) {
      return NextResponse.json(
        { error: "סיומת קובץ לא תקינה" },
        { status: 400 }
      );
    }

    const formDataEmployeeId = String(formData.get("employeeId") || "").trim();
    const formDataBusinessId = String(formData.get("businessId") || "").trim();

    const finalEmployeeIdString = getRequestedEmployeeId({
      formDataEmployeeId,
      loggedInUserId,
      admin,
    });

    if (
      !finalEmployeeIdString ||
      !mongoose.Types.ObjectId.isValid(finalEmployeeIdString)
    ) {
      return NextResponse.json(
        { error: "חסר מזהה עובד תקין" },
        { status: 400 }
      );
    }

    const employeeId = new mongoose.Types.ObjectId(finalEmployeeIdString);

    /**
     * אבטחה:
     * אם זה לא אדמין, העובד לא יכול להעלות עבור עובד אחר.
     */
    if (!admin && String(employeeId) !== String(loggedInUserId)) {
      return NextResponse.json(
        { error: "אין הרשאה להעלות מסמך לעובד אחר" },
        { status: 403 }
      );
    }

    const businessId = getRequestedBusinessId({
      formDataBusinessId,
      userBusinessId: (user as any).businessId,
    });

    const taxYearFromForm = Number(formData.get("taxYear"));
    const taxYear =
      Number.isFinite(taxYearFromForm) && taxYearFromForm > 2000
        ? taxYearFromForm
        : new Date().getFullYear();

    const existingDocument = await EmployeeForm101.findOne(
      buildExistingDocumentQuery({
        employeeId,
        taxYear,
        documentType,
      })
    )
      .sort({ createdAt: -1 })
      .lean();

    const existingStatus = String((existingDocument as any)?.status || "");

    /**
     * עובד רגיל לא יכול להחליף מסמך uploaded/approved.
     * אדמין כן יכול להעלות מסמך לתיק עובד גם בלי businessId.
     *
     * אם את רוצה שגם אדמין יהיה חסום כשקיים מסמך,
     * תחליפי את התנאי ל:
     * if (existingDocument && existingStatus !== "rejected") { ... }
     */
    if (!admin && existingDocument && existingStatus !== "rejected") {
      const label = getDocumentLabel(documentType);

      return NextResponse.json(
        {
          success: false,
          error: `${label} כבר הועלה וננעל לבדיקה. ניתן להעלות מחדש רק לאחר פתיחה על ידי האדמין.`,
          locked: true,
          documentType,
          status: existingStatus || "uploaded",
          document: serializeEmployeeDocument(existingDocument),

          form101:
            documentType === "form101"
              ? serializeEmployeeDocument(existingDocument)
              : null,
          idCard:
            documentType === "idCard"
              ? serializeEmployeeDocument(existingDocument)
              : null,
          accountManagement:
            documentType === "accountManagement"
              ? serializeEmployeeDocument(existingDocument)
              : null,
        },
        { status: 423 }
      );
    }

    const storedFileName = `${crypto.randomUUID()}${ext}`;
    const documentFolder = getDocumentFolder(documentType);

    const r2Key = [
      "employees",
      "documents",
      documentFolder,
      String(employeeId),
      String(taxYear),
      storedFileName,
    ].join("/");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type,
        ContentLength: file.size,
        Metadata: {
          employeeId: String(employeeId),
          businessId: businessId ? String(businessId) : "",
          documentType,
          taxYear: String(taxYear),
          originalFileName: encodeURIComponent(file.name),
          uploadedBy: String(loggedInUserId),
          uploadedFromAdmin: admin ? "true" : "false",
        },
      })
    );

    const fileUrl = `/api/forms/101/file/${storedFileName}`;

    /**
     * אם אדמין מעלה מחדש ויש כבר מסמך ישן,
     * ניצור רשומה חדשה. בגלל שהטעינה באדמין ממיינת לפי createdAt,
     * יוצג האחרון שנשמר.
     */
    const saved = await EmployeeForm101.create({
      employeeId,
      businessId,

      documentType,

      originalFileName: file.name,
      storedFileName,
      r2Key,
      fileUrl,
      fileType: file.type,
      fileSize: file.size,

      taxYear,

      status: "uploaded",
      uploadedAt: new Date(),

      approvedAt: null,
      rejectedAt: null,
      rejectionReason: "",
    });

    const serialized = serializeEmployeeDocument(saved);

    return NextResponse.json({
      success: true,
      message: `${getDocumentLabel(documentType)} הועלה בהצלחה`,
      document: serialized,

      form101: documentType === "form101" ? serialized : null,
      idCard: documentType === "idCard" ? serialized : null,
      accountManagement:
        documentType === "accountManagement" ? serialized : null,
    });
  } catch (error) {
    console.error("UPLOAD EMPLOYEE DOCUMENT TO R2 FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בהעלאת המסמך" },
      { status: 500 }
    );
  }
}