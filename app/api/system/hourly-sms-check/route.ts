import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1️⃣ בדיקת יתרת SMS מ-SMS4Free
    const res = await fetch(
      "https://api.sms4free.co.il/ApiSMS/AvailableSMS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: process.env.SMS4FREE_KEY, // ✅ תיקון כאן
          user: process.env.SMS4FREE_USER,
          pass: process.env.SMS4FREE_PASS,
        }),
      }
    );

    const data = await res.json();

    // אם SMS4Free החזיר שגיאה
    if (data.status !== 0) {
      console.error("SMS4Free response:", data);
      throw new Error("SMS4Free error");
    }

    const balance = Number(data.message);

    // 2️⃣ אם היתרה נמוכה – שליחת מייל התראה
    if (balance < 3000) {
      await fetch(
        "https://www.invistimo.com/api/system/send-alert-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ balance }),
        }
      );
    }

    // 3️⃣ תשובה תקינה
    return NextResponse.json({
      success: true,
      balance,
      alertSent: balance < 3000,
    });
  } catch (err) {
    console.error("Hourly SMS check failed:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
