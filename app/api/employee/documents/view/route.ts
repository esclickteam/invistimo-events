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

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function extractUserId(authResult: any) {
  if (!authResult) return "";

  if (typeof authResult === "string") {
    return authResult;
  }

  return cleanString(
    authResult.userId ||
      authResult.id ||
      authResult._id ||
      authResult.sub ||
      authResult.user?._id ||
      authResult.user?.id ||
      ""
  );
}

async function streamToBuffer(body: any) {
  if (!body) return Buffer.alloc(0);

  if (typeof body.transformToByteArray === "function") {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  const chunks: Buffer[] = [];

  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function safeDownloadFileName(value: unknown) {
  const fileName = cleanString(value) || "document.pdf";

  return fileName
    .replace(/[^\u0590-\u05FFa-zA-Z0-9._\-\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 140);
}

function buildContentDisposition(fileName: string) {
  const safeName = safeDownloadFileName(fileName);
  const encodedName = encodeURIComponent(safeName);

  return `inline; filename="${encodedName}"; filename*=UTF-8''${encodedName}`;
}

export async function GET(req: NextRequest) {
  try {
    await db();

    if (!R2_BUCKET_NAME) {
      return NextResponse.json(
        {
          success: false,
          error: "R2_BUCKET_MISSING",
          message: "חסר R2_BUCKET_NAME בהגדרות השרת",
        },
        { status: 500 }
      );
    }

    const authResult = await getUserIdFromRequest(req);
    const userId = extractUserId(authResult);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "אין הרשאה לצפייה בקובץ",
        },
        { status: 401 }
      );
    }

    const user = await User.findById(userId)
      .select("_id role staffType employeeScope")
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "משתמש לא נמצא",
        },
        { status: 401 }
      );
    }

    const role = cleanString((user as any).role).toLowerCase();
    const isAdmin = role === "admin";

    const { searchParams } = new URL(req.url);

    const key = cleanString(searchParams.get("key"));
    const documentId = cleanString(searchParams.get("id"));

    if (!key && !documentId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_DOCUMENT_KEY",
          message: "חסר מזהה קובץ",
        },
        { status: 400 }
      );
    }

    const documentQuery: Record<string, any> = {};

    if (key) {
      documentQuery.r2Key = key;
    }

    if (documentId) {
      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_DOCUMENT_ID",
            message: "מזהה מסמך לא תקין",
          },
          { status: 400 }
        );
      }

      documentQuery._id = new mongoose.Types.ObjectId(documentId);
    }

    const document = await EmployeeForm101.findOne(documentQuery).lean();

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: "DOCUMENT_NOT_FOUND",
          message: "המסמך לא נמצא",
        },
        { status: 404 }
      );
    }

    const documentEmployeeId = cleanString((document as any).employeeId);
    const currentUserId = cleanString((user as any)._id);

    const isOwner = documentEmployeeId === currentUserId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "אין הרשאה לצפייה במסמך זה",
        },
        { status: 403 }
      );
    }

    const r2Key = cleanString((document as any).r2Key);

    if (!r2Key) {
      return NextResponse.json(
        {
          success: false,
          error: "R2_KEY_MISSING",
          message: "חסר מפתח קובץ במסמך",
        },
        { status: 500 }
      );
    }

    const r2Response = await r2Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
      })
    );

    const fileBuffer = await streamToBuffer(r2Response.Body);

    if (!fileBuffer.length) {
      return NextResponse.json(
        {
          success: false,
          error: "EMPTY_FILE",
          message: "הקובץ ריק או לא נטען",
        },
        { status: 500 }
      );
    }

    const contentType =
      cleanString((document as any).fileType) ||
      cleanString(r2Response.ContentType) ||
      "application/octet-stream";

    const fileName =
      cleanString((document as any).originalFileName) ||
      cleanString((document as any).storedFileName) ||
      "document.pdf";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.length),
        "Content-Disposition": buildContentDisposition(fileName),
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    console.error("EMPLOYEE DOCUMENT VIEW ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "DOCUMENT_VIEW_FAILED",
        message: "שגיאה בטעינת המסמך",
      },
      { status: 500 }
    );
  }
}