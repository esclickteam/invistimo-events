import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import EmployeeAgreement from "@/models/EmployeeAgreement";
import EmployeeAgreementTemplate from "@/models/EmployeeAgreementTemplate";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  DEFAULT_TEMPLATE_TYPE,
  buildTemplateTypeQuery,
  getTemplateTypeLabel,
  normalizeTemplateType,
} from "@/lib/employeeAgreementTemplateTypes";
import { buildEmployeeSnapshot } from "@/lib/employeeSnapshot";

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

async function requireAdmin(req: NextRequest) {
  const authResult = await getUserIdFromRequest(req);
  const userId = extractUserId(authResult);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await User.findById(userId).lean();
  if (!user) return null;

  const role = String((user as any).role || "").toLowerCase();
  if (role !== "admin") return null;

  return { userId, user };
}

async function findActiveTemplate(
  businessObjectId: mongoose.Types.ObjectId | null,
  templateType: ReturnType<typeof normalizeTemplateType>,
) {
  const templateTypeQuery = buildTemplateTypeQuery(templateType);

  let template = await EmployeeAgreementTemplate.findOne({
    isActive: true,
    businessId: businessObjectId,
    ...templateTypeQuery,
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (!template && businessObjectId) {
    template = await EmployeeAgreementTemplate.findOne({
      isActive: true,
      businessId: null,
      ...templateTypeQuery,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
  }

  return template;
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "אין הרשאת אדמין" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const employeeId = cleanStr(body?.employeeId);
    const businessId = cleanStr(body?.businessId);
    const templateType = normalizeTemplateType(body?.templateType);

    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה עובד תקין" },
        { status: 400 },
      );
    }

    const employee = await User.findById(employeeId).lean();
    if (!employee) {
      return NextResponse.json(
        { success: false, error: "העובד לא נמצא" },
        { status: 404 },
      );
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

    const resolvedBusinessId =
      businessId && mongoose.Types.ObjectId.isValid(businessId)
        ? businessId
        : String((employee as any).businessId || admin.userId || "");

    if (!resolvedBusinessId || !mongoose.Types.ObjectId.isValid(resolvedBusinessId)) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה עסק תקין" },
        { status: 400 },
      );
    }

    const businessObjectId = new mongoose.Types.ObjectId(resolvedBusinessId);
    const template = await findActiveTemplate(businessObjectId, templateType);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: `לא נמצאה תבנית פעילה עבור ${getTemplateTypeLabel(templateType)}`,
        },
        { status: 404 },
      );
    }

    const snapshot = buildEmployeeSnapshot(employee);
    const now = new Date();
    const templateTypeQuery = buildTemplateTypeQuery(templateType);

    const agreement = await EmployeeAgreement.findOneAndUpdate(
      {
        employeeId: employeeObjectId,
        businessId: businessObjectId,
        ...templateTypeQuery,
      },
      {
        employeeId: employeeObjectId,
        businessId: businessObjectId,
        templateType,
        templateId: (template as any)._id,
        status: "pending",
        sentAt: now,
        sentByAdminId: new mongoose.Types.ObjectId(admin.userId),
        signedFileUrl: "",
        signedAt: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: "",
        fullName: snapshot.employeeName,
        email: snapshot.employeeEmail,
        phone: snapshot.employeePhone,
        idNumber: snapshot.employeeIdNumber,
        values: {},
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    return NextResponse.json({
      success: true,
      agreement: {
        ...agreement,
        id: String((agreement as any)?._id || ""),
        templateTypeLabel: getTemplateTypeLabel(templateType),
      },
      message: `המסמך "${getTemplateTypeLabel(templateType)}" נשלח לעובד`,
    });
  } catch (error) {
    console.error("ADMIN SEND EMPLOYEE AGREEMENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "שגיאה בשליחת המסמך לעובד",
      },
      { status: 500 },
    );
  }
}
