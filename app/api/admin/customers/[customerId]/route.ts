import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";
import CustomerQuote from "@/models/CustomerQuote";
import CustomerAgreement from "@/models/CustomerAgreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  try {
    await db();

    const { customerId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        {
          success: false,
          error: "מזהה תיק לקוח לא תקין",
        },
        { status: 400 }
      );
    }

    const customer = await CustomerFile.findById(customerId)
      .populate("assignedStaffIds", "_id name email role staffType")
      .lean();

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "תיק לקוח לא נמצא",
        },
        { status: 404 }
      );
    }

    const [quotes, agreements] = await Promise.all([
      CustomerQuote.find({ customerFileId: customerId })
        .sort({ createdAt: -1 })
        .lean(),

      CustomerAgreement.find({ customerFileId: customerId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        customer,
        quotes,
        agreements,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("GET CUSTOMER FILE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת תיק לקוח",
      },
      { status: 500 }
    );
  }
}