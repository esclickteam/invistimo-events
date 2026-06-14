import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

function normalizeAgreement(agreement: any) {
  if (!agreement) return null;

  const signedFileUrl =
    agreement.signedFileUrl ||
    agreement.fileUrl ||
    agreement.pdfUrl ||
    agreement.signedPdfUrl ||
    "";

  const hasSignedAgreement =
    Boolean(signedFileUrl) ||
    Boolean(agreement.signedAt) ||
    agreement.status === "signed" ||
    agreement.status === "approved";

  return {
    ...agreement,

    id: String(agreement._id || agreement.id || ""),

    employeeId: agreement.employeeId ? String(agreement.employeeId) : "",
    businessId: agreement.businessId ? String(agreement.businessId) : "",

    fullName: agreement.fullName || "",
    idNumber: agreement.idNumber || "",
    address: agreement.address || "",
    phone: agreement.phone || "",
    email: agreement.email || "",
    startDate: agreement.startDate || null,

    signedFileUrl,
    fileUrl: signedFileUrl,

    // בהסכם עבודה, כל הסכם שיש לו קובץ חתום / signedAt / signed / approved
    // מוחזר לפרונט כ-signed כדי שיוצג "נחתם"
    status: hasSignedAgreement ? "signed" : agreement.status || "missing",

    signedAt: agreement.signedAt || agreement.approvedAt || null,

    approvedAt: agreement.approvedAt || null,
    rejectedAt: agreement.rejectedAt || null,
    rejectionReason: agreement.rejectionReason || "",

    createdAt: agreement.createdAt || null,
    updatedAt: agreement.updatedAt || null,
  };
}

/**
 * GET /api/employee-agreements/current?employeeId=...&businessId=...
 *
 * מחזיר את ההסכם האחרון של העובד.
 * קודם מנסה לפי employeeId + businessId.
 * אם לא נמצא — מנסה לפי employeeId בלבד.
 */
export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);

    const employeeId = cleanStr(searchParams.get("employeeId"));
    const businessId = cleanStr(searchParams.get("businessId"));

    /**
     * חשוב:
     * employeeId הוא חובה.
     * businessId לא חובה, כי לפעמים בפרונט נשלח businessId שונה
     * ממה שנשמר בפועל במסד.
     */
    if (!employeeId) {
      return NextResponse.json(
        {
          success: true,
          agreement: null,
          message: "לא נשלח מזהה עובד",
        },
        { status: 200 }
      );
    }

    if (!isValidObjectId(employeeId)) {
      return NextResponse.json(
        {
          success: true,
          agreement: null,
          message: "מזהה עובד לא תקין",
        },
        { status: 200 }
      );
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

    let agreement: any = null;

    /**
     * ניסיון ראשון:
     * חיפוש מדויק לפי עובד + עסק.
     */
    if (businessId && isValidObjectId(businessId)) {
      const businessObjectId = new mongoose.Types.ObjectId(businessId);

      agreement = await EmployeeAgreement.findOne({
        employeeId: employeeObjectId,
        businessId: businessObjectId,
      })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .lean();
    }

    /**
     * ניסיון שני:
     * אם לא נמצא לפי businessId, נחפש לפי employeeId בלבד.
     * זה פותר מצב שבו ההסכם נשמר עם businessId אחר,
     * או שהעובד והעסק יצאו אותו ID כמו שראית ב-Mongo.
     */
    if (!agreement) {
      agreement = await EmployeeAgreement.findOne({
        employeeId: employeeObjectId,
      })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .lean();
    }

    return NextResponse.json(
      {
        success: true,
        agreement: normalizeAgreement(agreement),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET CURRENT EMPLOYEE AGREEMENT ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        agreement: null,
        error: "שגיאה בטעינת הסכם העבודה",
      },
      { status: 500 }
    );
  }
}

/**
 * כדי למנוע 405 אם הדפדפן/שרת עושה HEAD.
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
  });
}

/**
 * כדי למנוע 405 במקרים של preflight / בדיקות דפדפן.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, HEAD, OPTIONS",
    },
  });
}