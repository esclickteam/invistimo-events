import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { sendEmail } from "@/lib/sendEmail";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // רק מפיק יכול ליצור עובד מפיק
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
        { success: false, message: "שם ואימייל הם חובה" },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      return NextResponse.json(
        { success: false, message: "האימייל כבר קיים במערכת" },
        { status: 409 }
      );
    }

    // טוקן להגדרת סיסמה
    const resetToken = nanoid(48);
    const resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 שעות

    const staff = await User.create({
      name,
      email,
      phone,

      role: "staff",
      staffType: "producer_staff",
      assignedProducerId: decoded.id, // שיוך למפיק שיצר
      createdByProducer: decoded.id,

      plan: "basic",
      guests: 0,
      paidAmount: 0,
      hasPaid: false,
      billingSource: "producer",

      smsPerRecord: 0,
      maxMessages: 0,
      planLimits: {
        maxGuests: 0,
        smsEnabled: false,
        smsLimit: 0,
        seatingEnabled: true,
        remindersEnabled: true,
      },

      // אין סיסמה ביצירה -> העובד מגדיר דרך המייל
      needsPasswordSetup: true,
      resetPasswordToken: resetToken,
      resetPasswordExpires,
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const resetLink = `${baseUrl}/reset-password/${resetToken}`;

    // שולחים מייל להגדרת סיסמה
    try {
      await sendEmail({
        to: email,
        subject: "הגדרת סיסמה לחשבון העובד שלך ב-Invistimo",
        html: `
          <!doctype html>
          <html lang="he" dir="rtl">
            <body style="font-family: Arial, sans-serif; line-height: 1.7; color: #1f2937;">
              <h2>שלום ${name},</h2>
              <p>נוצר עבורך חשבון עובד מפיק במערכת Invistimo.</p>
              <p>כדי להגדיר סיסמה ראשונית, יש ללחוץ על הכפתור:</p>
              <p>
                <a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#3b2a22;color:#fff;text-decoration:none;border-radius:8px;">
                  להגדרת סיסמה
                </a>
              </p>
              <p>אם הכפתור לא עובד, אפשר להעתיק את הקישור הבא לדפדפן:</p>
              <p>${resetLink}</p>
              <p>הקישור תקף ל-24 שעות.</p>
            </body>
          </html>
        `,
      });
    } catch (mailError) {
      console.error("create-staff sendEmail error:", mailError);

      // העובד נוצר גם אם שליחת מייל נכשלה
      return NextResponse.json({
        success: true,
        message: "העובד נוצר, אך שליחת המייל נכשלה",
        user: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          staffType: staff.staffType,
        },
        resetLink, // שימושי לבדיקה ידנית
      });
    }

    return NextResponse.json({
      success: true,
      message: "העובד נוצר בהצלחה ונשלח מייל להגדרת סיסמה",
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
