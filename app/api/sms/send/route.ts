import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { to, message } = await req.json();

  const payload = {
    key: process.env.SMS4FREE_KEY,
    user: process.env.SMS4FREE_USER,
    pass: process.env.SMS4FREE_PASS,
    sender: process.env.SMS4FREE_SENDER,
    msisdn: to,
    msg: message,
  };

  const res = await fetch(
    "https://api.sms4free.co.il/ApiSMS/v2/SendSMS",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();

  console.log("SMS4FREE RESPONSE:", data);

  return NextResponse.json(data);
}
