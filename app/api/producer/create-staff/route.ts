import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { sendEmail } from "@/lib/sendEmail";

export const dynamic = "force-dynamic";

type JwtPayloadLike = {
  id?: string;
  _id?: string;
  userId?: string;
  email?: string;
  role?: string;
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    // ✅ חשוב: בפרויקט שלך cookies() הוא Promise
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "לא מחובר" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayloadLike;

    // מזהה מפיק מתוך token (תמיכה בכל וריאנט נפוץ)
    const producerIdFromToken = decoded.id || decoded._id || decoded.userId;

    // אימות הרשאה
    if (decoded.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "אין הרשאה" },
        { status: 403 }
      );
    }

    // 🔒 מביאים מפיק מה־DB כדי להיות בטוחים שיש ID תקין
    const producer = producerIdFromToken
      ? await User.findById(producerIdFromToken).select("_id role email").lean()
      : decoded.email
      ? await User.findOne({ email: String(decoded.email).toLowerCase() })
          .select("_id role email")
          .lean()
      : null;

    if (!producer || producer.role !== "producer") {
      return NextResponse.json(
        { success: false, message: "משתמש מפיק לא נמצא" },
        { status: 404 }
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

    // יצירת עובד ללא סיסמה -> יקבל מייל להגדרת סיסמה
    const staff = await User.create({
      name,
      email,
      phone,

      role: "staff",
      staffType: "producer_staff",
      assignedProducerId: producer._id, // ✅ זה הקריטי שהיה חסר/undefined

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

      needsPasswordSetup: true,
      createdByProducer: producer._id,
    });

    // לינק הגדרת סיסמה
    const tokenForSetup = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await User.findByIdAndUpdate(staff._id, {
      resetPasswordToken: tokenForSetup,
      resetPasswordExpires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 שעות
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://invistimo.com";

    const setupLink = `${baseUrl}/set-password?token=${tokenForSetup}`;


    // שליחת מייל (לא מפיל את היצירה אם נכשל)
    try {
      await sendEmail({
        to: email,
        subject: "הגדרת סיסמה - Invistimo",
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">
            <h2>ברוכים הבאים ל-Invistimo</h2>
            <p>נוצר עבורך משתמש עובד מפיק.</p>
            <p>להגדרת סיסמה לחצי על הקישור:</p>
            <p><a href="${setupLink}">${setupLink}</a></p>
            <p>הקישור תקף ל־24 שעות.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("send setup email error:", mailErr);
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
