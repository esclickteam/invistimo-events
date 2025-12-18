import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { to, message } = await req.json();

  const payload = {
    key: process.env.SMS4FREE_KEY,
    user: process.env.SMS4FREE_USER,
    pass: process.env.SMS4FREE_PASS,
    sender: process.env.SMS4FREE_SENDER, // חייב להיות זהה לשליחה הידנית
    destinations: to,                   // ❗️זה השם הנכון
    msg: message,
    msgType: "text",                    // ❗️חובה
  };

  const res = await fetch(
    "https://api.sms4free.co.il/ApiSMS/v2/SendSMS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();

  // 🔍 לוג חובה בזמן בדיקות
  console.log("SMS4FREE RESPONSE:", data);

  return NextResponse.json({
    success: data?.status === 0 || data?.success === true,
    providerResponse: data,
  });
}
