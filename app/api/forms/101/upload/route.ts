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

function getSafeExtension(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase();

  if (ext === ".pdf") return ".pdf";
  if (ext === ".jpg") return ".jpg";
  if (ext === ".jpeg") return ".jpeg";
  if (ext === ".png") return ".png";

  return "";
}

function normalizeDocumentType(value: FormDataEntryValue | null): EmployeeDocumentType {
  const raw = String(value || "").trim();

  if (raw === "idCard") return "idCard";
  if (raw === "form101") return "form101";

  // ברירת מחדל לשמירה על תאימות אחורה
  return "form101";
}

function getDocumentFolder(documentType: EmployeeDocumentType) {
  if (documentType === "idCard") return "id-card";
  return "101";
}

function getDocumentLabel(documentType: EmployeeDocumentType) {
  if (documentType === "idCard") return "תעודת זהות";
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

export async function POST(req: NextRequest) {
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

    const formData = await req.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "לא נשלח קובץ" }, { status: 400 });
    }

    /**
     * תומך גם ב-documentType וגם ב-type
     * כדי שלא יישבר אם כבר כתבת בצד לקוח formData.append("type", ...)
     */
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

    const employeeId = new mongoose.Types.ObjectId(userId);

    const businessId =
      (user as any).businessId &&
      mongoose.Types.ObjectId.isValid(String((user as any).businessId))
        ? new mongoose.Types.ObjectId(String((user as any).businessId))
        : null;

    const taxYearFromForm = Number(formData.get("taxYear"));
    const taxYear =
      Number.isFinite(taxYearFromForm) && taxYearFromForm > 2000
        ? taxYearFromForm
        : new Date().getFullYear();

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
        },
      })
    );

    /**
     * נשארים עם אותו endpoint צפייה אם הוא אצלך מחפש לפי storedFileName במסד.
     * אם endpoint הצפייה שלך בנוי רק לטפסי 101, צריך לעדכן גם אותו שיחפש כל documentType.
     */
    const fileUrl = `/api/forms/101/file/${storedFileName}`;

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
    });

    const serialized = serializeEmployeeDocument(saved);

    return NextResponse.json({
      success: true,
      message: `${getDocumentLabel(documentType)} הועלה בהצלחה`,
      document: serialized,

      // תאימות אחורה לקוד קיים שמצפה ל-form101
      form101: documentType === "form101" ? serialized : null,
      idCard: documentType === "idCard" ? serialized : null,
    });
  } catch (error) {
    console.error("UPLOAD EMPLOYEE DOCUMENT TO R2 FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בהעלאת המסמך" },
      { status: 500 }
    );
  }
}