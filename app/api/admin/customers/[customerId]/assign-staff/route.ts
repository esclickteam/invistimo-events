import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import CustomerFile from "@/models/CustomerFile";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function isStaffUser(user: any) {
  const role = cleanString(user?.role).toLowerCase();
  const staffType = cleanString(user?.staffType).toLowerCase();

  return (
    role === "staff" ||
    role === "employee" ||
    role === "admin" ||
    Boolean(staffType)
  );
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  try {
    await db();

    const { customerId } = await context.params;

    const customerObjectId = toObjectId(customerId);

    if (!customerObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CUSTOMER_ID",
          message: "מזהה תיק לקוח לא תקין",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const staffObjectId = toObjectId(body?.staffId);

    if (!staffObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_STAFF_ID",
          message: "חובה לבחור עובד תקין",
        },
        { status: 400 }
      );
    }

    const staffUser = await User.findById(staffObjectId)
      .select("_id name email role staffType")
      .lean();

    if (!staffUser || !isStaffUser(staffUser)) {
      return NextResponse.json(
        {
          success: false,
          error: "STAFF_NOT_FOUND",
          message: "העובד לא נמצא או שאינו מוגדר כעובד",
        },
        { status: 404 }
      );
    }

    const customer = await CustomerFile.findById(customerObjectId);

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "CUSTOMER_NOT_FOUND",
          message: "תיק לקוח לא נמצא",
        },
        { status: 404 }
      );
    }

    customer.assignedStaffIds = [staffObjectId];

    if (!customer.leadStatus || customer.leadStatus === "new") {
      customer.leadStatus = "contacted";
    }

    await customer.save();

    const updatedCustomer = await CustomerFile.findById(customerObjectId)
      .populate("assignedStaffIds", "_id name email role staffType")
      .lean();

    return NextResponse.json({
      success: true,
      message: "הליד שויך לעובד בהצלחה",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("ASSIGN CUSTOMER STAFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "שגיאה בשיוך עובד לליד",
      },
      { status: 500 }
    );
  }
}