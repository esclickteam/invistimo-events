import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  DEFAULT_TEMPLATE_TYPE,
  getTemplateTypeLabel,
  normalizeTemplateType,
} from "@/lib/employeeAgreementTemplateTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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

function normalizeAgreement(agreement: any) {
  if (!agreement) return null;

  const signedFileUrl =
    agreement.signedFileUrl ||
    agreement.fileUrl ||
    agreement.pdfUrl ||
    agreement.signedPdfUrl ||
    "";

  const templateType = normalizeTemplateType(agreement.templateType);
  const rawStatus = cleanStr(agreement.status).toLowerCase();

  let status = rawStatus || "pending";

  if (
    signedFileUrl ||
    agreement.signedAt ||
    rawStatus === "signed" ||
    rawStatus === "approved"
  ) {
    status = rawStatus === "approved" ? "approved" : "signed";
  } else if (rawStatus === "rejected") {
    status = "rejected";
  } else if (rawStatus === "pending" || agreement.sentAt) {
    status = "pending";
  }

  return {
    ...agreement,
    id: String(agreement._id || agreement.id || ""),
    employeeId: agreement.employeeId ? String(agreement.employeeId) : "",
    businessId: agreement.businessId ? String(agreement.businessId) : "",
    templateType,
    templateTypeLabel: getTemplateTypeLabel(templateType),
    signedFileUrl,
    fileUrl: signedFileUrl,
    status,
    sentAt: agreement.sentAt || null,
    signedAt: agreement.signedAt || agreement.approvedAt || null,
    approvedAt: agreement.approvedAt || null,
    rejectedAt: agreement.rejectedAt || null,
    rejectionReason: agreement.rejectionReason || "",
    createdAt: agreement.createdAt || null,
    updatedAt: agreement.updatedAt || null,
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const authResult = await getUserIdFromRequest(req);
    const employeeId = extractUserId(authResult);

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

    const agreements = await EmployeeAgreement.find({
      employeeId: employeeObjectId,
    })
      .sort({ sentAt: -1, updatedAt: -1, createdAt: -1 })
      .lean();

    const normalized = agreements.map(normalizeAgreement).filter(Boolean);

    const byType = {
      phone_representative_agreement:
        normalized.find(
          (item) =>
            item?.templateType === DEFAULT_TEMPLATE_TYPE ||
            !item?.templateType,
        ) || null,
      termination_request:
        normalized.find(
          (item) => item?.templateType === "termination_request",
        ) || null,
    };

    return NextResponse.json({
      success: true,
      agreements: normalized,
      byType,
    });
  } catch (error) {
    console.error("GET EMPLOYEE AGREEMENTS MINE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת מסמכים לחתימה",
      },
      { status: 500 },
    );
  }
}
