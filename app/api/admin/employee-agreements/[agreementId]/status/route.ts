import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    agreementId: string;
  }>;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown) {
  const status = cleanStr(value).toLowerCase();

  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "signed") return "signed";

  return "";
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await db();

    const { agreementId } = await context.params;

    if (!agreementId || !mongoose.Types.ObjectId.isValid(agreementId)) {
      return NextResponse.json(
        { success: false, error: "מזהה הסכם לא תקין" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const status = normalizeStatus(body?.status);
    const rejectionReason = cleanStr(body?.rejectionReason);

    if (!status) {
      return NextResponse.json(
        { success: false, error: "סטטוס לא תקין" },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = {
      status,
    };

    if (status === "approved") {
      patch.approvedAt = new Date();
      patch.rejectedAt = null;
      patch.rejectionReason = "";
    }

    if (status === "rejected") {
      patch.rejectedAt = new Date();
      patch.approvedAt = null;
      patch.rejectionReason = rejectionReason;
    }

    if (status === "signed") {
      patch.approvedAt = null;
      patch.rejectedAt = null;
      patch.rejectionReason = "";
    }

    const agreement = await EmployeeAgreement.findByIdAndUpdate(
      new mongoose.Types.ObjectId(agreementId),
      patch,
      {
        new: true,
      }
    ).lean();

    if (!agreement) {
      return NextResponse.json(
        { success: false, error: "ההסכם לא נמצא" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      agreement,
    });
  } catch (err) {
    console.error("UPDATE EMPLOYEE AGREEMENT STATUS ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בעדכון סטטוס ההסכם",
      },
      { status: 500 }
    );
  }
}