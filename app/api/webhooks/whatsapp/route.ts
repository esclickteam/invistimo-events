import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ⚠️ חשוב: לא לעשות כאן לוגיקה כבדה
    // רק לוג / שמירה קצרה / enqueue

    console.log("📩 WhatsApp Webhook:", JSON.stringify(body));

    // תמיד להחזיר 200 מהר
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook error", err);
    return NextResponse.json({ ok: true }); // גם בשגיאה – 200
  }
}
