import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "לא מחובר" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // רק מפיק יכול ליצור עובד מפיק
    if (decoded.role !== "producer") {
      return NextResponse.json({ success: false, message: "אין הרשאה" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const password = String(body?.password || "");

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "שם, אימייל וסיסמה הם חובה" },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { success: false, message: "האימייל כבר קיים במערכת" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const staff = await User.create({
      name,
      email,
      phone,
      password: hashed,

      role: "staff",
      staffType: "producer_staff",
      assignedProducerId: decoded.id, // שיוך למפיק שיצר

      plan: "basic",
      guests: 0,
      paidAmount: 0,
      hasPaid: false,
      billingSource: "producer",

      smsPerRecord: 3,
      maxMessages: 0,
      planLimits: {
        maxGuests: 0,
        smsEnabled: false,
        smsLimit: 0,
        seatingEnabled: true,
        remindersEnabled: true,
      },

      needsPasswordSetup: false,
      createdByProducer: decoded.id,
    });

    return NextResponse.json({
      success: true,
      message: "העובד נוצר בהצלחה",
      user: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        staffType: staff.staffType,
      },
    });
  } catch (error: any) {
    console.error("create-staff error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "שגיאת שרת" },
      { status: 500 }
    );
  }
}
