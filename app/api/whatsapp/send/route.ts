import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sendWhatsAppMessage";

export async function POST(req: NextRequest) {
  const { to, message } = await req.json();

  await sendWhatsAppMessage(to, message);

  return NextResponse.json({ success: true });
}
