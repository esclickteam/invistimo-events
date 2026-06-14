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

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

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

export async function POST(req: NextRequest) {
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

    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        { error: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "לא נשלח קובץ" },
        { status: 400 }
      );
    }

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

    const taxYear = new Date().getFullYear();
    const storedFileName = `${crypto.randomUUID()}${ext}`;

    const r2Key = [
      "forms",
      "101",
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
          taxYear: String(taxYear),
          originalFileName: encodeURIComponent(file.name),
        },
      })
    );

    const fileUrl = `/api/forms/101/file/${storedFileName}`;

    const saved = await EmployeeForm101.create({
      employeeId,
      businessId,
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

    return NextResponse.json({
      success: true,
      form101: serializeForm101(saved),
    });
  } catch (error) {
    console.error("UPLOAD FORM 101 TO R2 FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בהעלאת טופס 101" },
      { status: 500 }
    );
  }
}