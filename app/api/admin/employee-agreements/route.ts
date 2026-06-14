import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";
import User from "@/models/User";

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

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    const agreements = await EmployeeAgreement.find(query)
      .sort({ signedAt: -1, createdAt: -1 })
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

      return {
        _id: String(agreement._id),
        id: String(agreement._id),

        employeeId: agreement.employeeId
          ? String(agreement.employeeId)
          : "",
        businessId: agreement.businessId
          ? String(agreement.businessId)
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

        signedFileUrl: agreement.signedFileUrl || "",
        status: agreement.status || "signed",
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