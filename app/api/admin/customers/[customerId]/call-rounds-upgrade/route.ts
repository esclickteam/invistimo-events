import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  try {
    await db();

    const { customerId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        { success: false, error: "מזהה תיק לקוח לא תקין" },
        { status: 400 }
      );
    }

    const customer = await CustomerFile.findById(customerId);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "תיק לקוח לא נמצא" },
        { status: 404 }
      );
    }

    const currentPackagePrice = Number(customer.packageBasePrice || customer.totalPrice || 0);
    const targetPackagePrice = Number(customer.packageTargetPriceWithCalls || 0);

    if (!targetPackagePrice || targetPackagePrice <= currentPackagePrice) {
      return NextResponse.json(
        { success: false, error: "לא הוגדר מחיר חבילה עם סבבי שיחות" },
        { status: 400 }
      );
    }

    const upgradeAmount = Math.max(0, targetPackagePrice - currentPackagePrice);

    customer.hasCallRounds = true;
    customer.allowedCallRounds = Math.max(Number(customer.allowedCallRounds || 0), 3);
    customer.totalPrice = targetPackagePrice;
    customer.balance = Math.max(0, Number(customer.balance || 0) + upgradeAmount);

    await customer.save();

    return NextResponse.json({
      success: true,
      upgradeAmount,
      customer,
    });
  } catch (error) {
    console.error("CALL ROUNDS UPGRADE ERROR:", error);

    return NextResponse.json(
      { success: false, error: "שגיאה בהוספת סבבי שיחות" },
      { status: 500 }
    );
  }
}