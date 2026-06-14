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

  if (fallback) {
    if (fallback === "application/pdf") return "application/pdf";
    if (fallback === "image/png") return "image/png";
    if (fallback === "image/jpeg") return "image/jpeg";
    if (fallback === "image/jpg") return "image/jpeg";
  }

  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg")) return "image/jpeg";
  if (lower.endsWith(".jpeg")) return "image/jpeg";

  return "application/octet-stream";
}

function safeDownloadName(fileName: string) {
  return encodeURIComponent(fileName || "employee-document");
}

function toObjectIdString(value: any) {
  if (!value) return "";
  return String(value);
}

function isSameObjectId(a: any, b: any) {
  const first = toObjectIdString(a);
  const second = toObjectIdString(b);

  if (!first || !second) return false;

  return first === second;
}

function getDocumentLabel(documentType?: string) {
  if (documentType === "idCard") return "תעודת זהות";
  if (documentType === "form101") return "טופס 101";

  return "מסמך עובד";
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const authResult = await getUserIdFromRequest(req);
    const userId = extractUserId(authResult);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
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

    /**
     * מחפשים לפי storedFileName בלבד.
     * לא מגבילים ל-documentType כדי שהנתיב יעבוד גם לטופס 101 וגם לתעודת זהות.
     */
    const employeeDocument = await EmployeeForm101.findOne({
      storedFileName: fileName,
    }).lean();

    if (!employeeDocument) {
      return NextResponse.json(
        { error: "הקובץ לא נמצא" },
        { status: 404 }
      );
    }

    const role = String((user as any).role || "").toLowerCase();

    const isAdmin = role === "admin";

    const isOwnerOfDocument = isSameObjectId(
      (employeeDocument as any).employeeId,
      userId
    );

    const userBusinessId = (user as any).businessId;
    const documentBusinessId = (employeeDocument as any).businessId;

    const isSameBusiness =
      userBusinessId &&
      documentBusinessId &&
      isSameObjectId(userBusinessId, documentBusinessId);

    /**
     * הרשאות:
     * אדמין — הכול
     * העובד עצמו — המסמך שלו
     * משתמש מאותו עסק — מסמכי עובדים של העסק
     */
    const canView = isAdmin || isOwnerOfDocument || isSameBusiness;

    if (!canView) {
      return NextResponse.json(
        { error: "אין הרשאה לצפות בקובץ הזה" },
        { status: 403 }
      );
    }

    const r2Key = String((employeeDocument as any).r2Key || "");

    if (!r2Key) {
      return NextResponse.json(
        { error: "מפתח הקובץ לא נמצא" },
        { status: 404 }
      );
    }

    const r2Response = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
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
      (employeeDocument as any).originalFileName || fileName;

    const documentType = String(
      (employeeDocument as any).documentType || "form101"
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": getContentType(
          fileName,
          (employeeDocument as any).fileType
        ),
        "Content-Disposition": `inline; filename*=UTF-8''${safeDownloadName(
          originalFileName
        )}`,
        "Cache-Control": "private, no-store",
        "X-Document-Type": documentType,
        "X-Document-Label": encodeURIComponent(getDocumentLabel(documentType)),
      },
    });
  } catch (error) {
    console.error("READ EMPLOYEE DOCUMENT FILE FROM R2 FAILED:", error);

    return NextResponse.json(
      { error: "שגיאה בטעינת הקובץ" },
      { status: 500 }
    );
  }
}