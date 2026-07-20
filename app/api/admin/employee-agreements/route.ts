import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";
import User from "@/models/User";

import {
  getTemplateTypeLabel,
  normalizeTemplateType,
} from "@/lib/employeeAgreementTemplateTypes";
import { repairMisattributedSignedAgreements } from "@/lib/repairEmployeeAgreementAttribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(status: string) {
  const clean = cleanStr(status).toLowerCase();

  if (["signed", "approved", "rejected"].includes(clean)) {
    return clean;
  }

  return "";
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);

    const status = normalizeStatus(searchParams.get("status") || "");
    const employeeId = cleanStr(searchParams.get("employeeId"));

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return NextResponse.json(
          { success: false, error: "מזהה עובד לא תקין" },
          { status: 400 },
        );
      }

      query.employeeId = new mongoose.Types.ObjectId(employeeId);

      // Fix terminations that were signed under businessId-as-employeeId.
      try {
        await repairMisattributedSignedAgreements(employeeId);
      } catch (repairError) {
        console.error(
          "REPAIR MISATTRIBUTED EMPLOYEE AGREEMENTS ERROR:",
          repairError,
        );
      }
    }

    const agreements = await EmployeeAgreement.find(query)
      .sort({ signedAt: -1, updatedAt: -1, createdAt: -1 })
      .lean();

    const employeeIds = agreements
      .map((agreement: any) => String(agreement.employeeId || ""))
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id));

    const users = await User.find({
      _id: {
        $in: employeeIds.map((id: string) => new mongoose.Types.ObjectId(id)),
      },
    })
      .select("_id name email phone businessId")
      .lean();

    const usersById = new Map(
      users.map((user: any) => [String(user._id), user])
    );

    const formattedAgreements = agreements.map((agreement: any) => {
      const employee = usersById.get(String(agreement.employeeId));
      const templateType = normalizeTemplateType(agreement.templateType);
      const rawStatus = cleanStr(agreement.status).toLowerCase();
      const signedFileUrl = cleanStr(agreement.signedFileUrl);

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
        _id: String(agreement._id),
        id: String(agreement._id),

        employeeId: agreement.employeeId
          ? String(agreement.employeeId)
          : "",
        businessId: agreement.businessId
          ? String(agreement.businessId)
          : "",

        templateType,
        templateTypeLabel: getTemplateTypeLabel(templateType),
        sentAt: agreement.sentAt || null,
        sentByAdminId: agreement.sentByAdminId
          ? String(agreement.sentByAdminId)
          : "",

        employeeName:
          employee?.name ||
          agreement.fullName ||
          agreement.finalFullName ||
          "עובד ללא שם",

        employeeEmail: employee?.email || agreement.email || "",
        employeePhone: employee?.phone || agreement.phone || "",

        fullName: agreement.fullName || "",
        idNumber: agreement.idNumber || "",
        address: agreement.address || "",
        phone: agreement.phone || "",
        email: agreement.email || "",

        agreementDate: agreement.agreementDate || null,
        startDate: agreement.startDate || null,
        finalFullName: agreement.finalFullName || "",
        finalIdNumber: agreement.finalIdNumber || "",
        finalSignatureDate: agreement.finalSignatureDate || null,

        signedFileUrl,
        fileUrl: signedFileUrl,
        status,
        signedAt: agreement.signedAt || agreement.createdAt || null,
        approvedAt: agreement.approvedAt || null,
        rejectedAt: agreement.rejectedAt || null,
        rejectionReason: agreement.rejectionReason || "",

        createdAt: agreement.createdAt || null,
        updatedAt: agreement.updatedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      agreements: formattedAgreements,
      count: formattedAgreements.length,
    });
  } catch (err) {
    console.error("GET ADMIN EMPLOYEE AGREEMENTS ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת הסכמי העובדים",
      },
      { status: 500 }
    );
  }
}