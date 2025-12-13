import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = await fetch(
      "https://api.sms4free.co.il/ApiSMS/AvailableSMS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: process.env.SMS4FREE_API_KEY,
          user: process.env.SMS4FREE_USER,
          pass: process.env.SMS4FREE_PASS,
        }),
      }
    );

    const data = await res.json();

    if (data.status !== 0) {
      return NextResponse.json(
        { success: false, error: data },
        { status: 500 }
      );
    }

    const balance = Number(data.message);

    return NextResponse.json({
      success: true,
      balance,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "SMS balance check failed" },
      { status: 500 }
    );
  }
}
