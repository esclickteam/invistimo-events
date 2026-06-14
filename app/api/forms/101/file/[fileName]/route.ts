import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import db from "@/lib/db";
import User from "@/models/User";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    fileName: string;
  }>;
};

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

function isSafeFileName(fileName: string) {
  if (!fileName) return false;
  if (fileName.includes("/")) return false;
  if (fileName.includes("\\")) return false;
  if (fileName.includes("..")) return false;

  return true;
}

function getContentType(fileName: string, fallback?: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg")) return "image/jpeg";
  if (lower.endsWith(".jpeg")) return "image/jpeg";

  return fallback || "application/octet-stream";
}

function safeDownloadName(fileName: string) {
  return encodeURIComponent(fileName || "form-101");
}

export async function GET(req: NextRequest, context: RouteContext) {
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

    const { fileName } = await context.params;

    if (!isSafeFileName(fileName)) {
      return NextResponse.json(
        { error: "שם קובץ לא תקין" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        { error: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    const role = String((user as any).role || "").toLowerCase();
    const isAdmin = role === "admin";

    const query: Record<string, any> = {
      storedFileName: fileName,
    };

    if (!isAdmin) {
      query.employeeId = new mongoose.Types.ObjectId(userId);
    }

    const form101 = await EmployeeForm101.findOne(query).lean();

    if (!form101) {
      return NextResponse.json(
        { error: "הקובץ לא נמצא או שאין הרשאה" },
        { status: 404 }
      );
    }

    const r2Response = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: (form101 as any).r2Key,
      })
    );

    if (!r2Response.Body) {
      return NextResponse.json(
        { error: "הקובץ לא נמצא באחסון" },
        { status: 404 }
      );
    }

    const bytes = await r2Response.Body.transformToByteArray();
    const buffer = Buffer.from(bytes);

    const originalFileName =
      (form101 as any).originalFileName || fileName;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": getContentType(
          fileName,
          (form101 as any).fileType
        ),
        "Content-Disposition": `inline; filename*=UTF-8''${safeDownloadName(
          originalFileName
        )}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("READ FORM 101 FILE FROM R2 FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בטעינת הקובץ" },
      { status: 500 }
    );
  }
}