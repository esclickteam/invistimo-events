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

    // ✅ חשוב: אצלך cookies() מחזיר Promise
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "שם ואימייל חובה" },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      return NextResponse.json(
        { success: false, message: "האימייל כבר קיים" },
        { status: 409 }
      );
    }

    // סיסמה זמנית (בהמשך אפשר לשלוח מייל הגדרה)
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(tempPassword, 10);

    const staff = await User.create({
      name,
      email,
      phone,

      password: hashed,
      needsPasswordSetup: true,

      role: "staff",
      staffType: "producer_staff",

      // ✅ הכי חשוב לשגיאה שלך
      assignedProducerId: decoded.id,

      billingSource: "producer",
      hasPaid: true,
      paidAmount: 0,

      guests: 0,
      smsPerRecord: 0,
      maxMessages: 0,

      planLimits: {
        maxGuests: 0,
        smsEnabled: false,
        smsLimit: 0,
        seatingEnabled: true,
        remindersEnabled: true,
      },

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
        assignedProducerId: staff.assignedProducerId,
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
