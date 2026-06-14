import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreementTemplate from "@/models/EmployeeAgreementTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);

    const businessId = cleanStr(searchParams.get("businessId"));

    const query: Record<string, unknown> = {
      isActive: true,
    };

    if (businessId && mongoose.Types.ObjectId.isValid(businessId)) {
      query.businessId = new mongoose.Types.ObjectId(businessId);
    } else {
      query.businessId = null;
    }

    let template = await EmployeeAgreementTemplate.findOne(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    if (!template && query.businessId !== null) {
      template = await EmployeeAgreementTemplate.findOne({
        isActive: true,
        businessId: null,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();
    }

    return NextResponse.json({
      success: true,
      template: template || null,
    });
  } catch (err) {
    console.error("GET EMPLOYEE AGREEMENT TEMPLATE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת תבנית ההסכם",
      },
      { status: 500 }
    );
  }
}