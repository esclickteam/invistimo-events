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

function getSafeExtension(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase();

  if (ext === ".pdf") return ".pdf";
  if (ext === ".jpg") return ".jpg";
  if (ext === ".jpeg") return ".jpeg";
  if (ext === ".png") return ".png";

  return "";
}

function normalizeDocumentType(
  value: FormDataEntryValue | null,
): EmployeeDocumentType {
  const raw = String(value || "").trim();

  if (raw === "idCard") return "idCard";
  if (raw === "idCardAppendix") return "idCardAppendix";
  if (raw === "accountManagement") return "accountManagement";
  if (raw === "payslip") return "payslip";
  if (raw === "form101") return "form101";

  return "form101";
}

function normalizePayrollMonth(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();

  /**
   * פורמט תקין:
   * 2026-07
   */
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  return "";
}

function getDocumentFolder(documentType: EmployeeDocumentType) {
  if (documentType === "idCard") return "id-card";
  if (documentType === "idCardAppendix") return "id-card-appendix";
  if (documentType === "accountManagement") return "account-management";
  if (documentType === "payslip") return "payslips";

  return "101";
}

function getDocumentLabel(documentType: EmployeeDocumentType) {
  if (documentType === "idCard") return "תעודת זהות";
  if (documentType === "idCardAppendix") return "ספח תעודת זהות";
  if (documentType === "accountManagement") return "אישור ניהול חשבון";
  if (documentType === "payslip") return "תלוש שכר";

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

    if (!loggedInUserId || !mongoose.Types.ObjectId.isValid(loggedInUserId)) {
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
      formData.get("documentType") || formData.get("type"),
    );

    /**
     * אבטחה:
     * תלושי שכר רק אדמין יכול להעלות.
     * עובד רגיל לא יכול להעלות לעצמו תלוש שכר.
     */
    if (documentType === "payslip" && !admin) {
      return NextResponse.json(
        { error: "רק אדמין יכול להעלות תלושי שכר" },
        { status: 403 },
      );
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "אפשר להעלות רק PDF, JPG או PNG" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "הקובץ גדול מדי. מקסימום 10MB" },
        { status: 400 },
      );
    }

    const ext = getSafeExtension(file.name);

    if (!ext) {
      return NextResponse.json(
        { error: "סיומת קובץ לא תקינה" },
        { status: 400 },
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
        { status: 400 },
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
        { status: 403 },
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

    /**
     * חודש תלוש שכר.
     * חובה רק אם מעלים payslip.
     */
    const payrollMonth = normalizePayrollMonth(
      formData.get("payrollMonth") || formData.get("month"),
    );

    if (documentType === "payslip" && !payrollMonth) {
      return NextResponse.json(
        { error: "חסר חודש תלוש שכר תקין. פורמט נדרש: YYYY-MM" },
        { status: 400 },
      );
    }

    /**
     * למסמכים רגילים נשארת בדיקת כפילות.
     * לתלושי שכר לא בודקים כפילות,
     * כדי שאדמין יוכל להעלות כמה תלושים שהוא רוצה בכל חודש.
     */
    let existingDocument: any = null;

    if (documentType !== "payslip") {
      existingDocument = await EmployeeForm101.findOne(
        buildExistingDocumentQuery({
          employeeId,
          taxYear,
          documentType,
        }),
      )
        .sort({ createdAt: -1 })
        .lean();
    }

    const existingStatus = String(existingDocument?.status || "");

    /**
     * עובד רגיל לא יכול להחליף מסמך uploaded/approved.
     * אדמין כן יכול להעלות מסמך לתיק עובד גם בלי businessId.
     *
     * לתלושי שכר זה לא רלוונטי כי רק אדמין מעלה אותם,
     * ומותר כמה תלושים באותו חודש.
     */
    if (
      documentType !== "payslip" &&
      !admin &&
      existingDocument &&
      existingStatus !== "rejected"
    ) {
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

          idCardAppendix:
            documentType === "idCardAppendix"
              ? serializeEmployeeDocument(existingDocument)
              : null,

          accountManagement:
            documentType === "accountManagement"
              ? serializeEmployeeDocument(existingDocument)
              : null,

          payslip: null,
        },
        { status: 423 },
      );
    }

    const storedFileName = `${crypto.randomUUID()}${ext}`;
    const documentFolder = getDocumentFolder(documentType);

    const r2KeyParts = [
      "employees",
      "documents",
      documentFolder,
      String(employeeId),
      String(taxYear),
    ];

    if (documentType === "payslip") {
      r2KeyParts.push(payrollMonth);
    }

    r2KeyParts.push(storedFileName);

    const r2Key = r2KeyParts.join("/");

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
          payrollMonth,
          originalFileName: encodeURIComponent(file.name),
          uploadedBy: String(loggedInUserId),
          uploadedFromAdmin: admin ? "true" : "false",
        },
      }),
    );

    const fileUrl = `/api/forms/101/file/${storedFileName}`;

    /**
     * אם אדמין מעלה מחדש מסמך רגיל ויש כבר מסמך ישן,
     * ניצור רשומה חדשה. בגלל שהטעינה באדמין ממיינת לפי createdAt,
     * יוצג האחרון שנשמר.
     *
     * בתלושי שכר תמיד יוצרים רשומה חדשה כדי לאפשר כמה תלושים בחודש.
     */
    const saved = await EmployeeForm101.create({
      employeeId,
      businessId,

      documentType,
      payrollMonth: documentType === "payslip" ? payrollMonth : "",

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
      idCardAppendix: documentType === "idCardAppendix" ? serialized : null,
      accountManagement:
        documentType === "accountManagement" ? serialized : null,
      payslip: documentType === "payslip" ? serialized : null,
    });
  } catch (error) {
    console.error("UPLOAD EMPLOYEE DOCUMENT TO R2 FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בהעלאת המסמך" },
      { status: 500 },
    );
  }
}