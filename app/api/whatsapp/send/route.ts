import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/sendWhatsAppTemplate";

export async function POST(req: NextRequest) {
  const { to } = await req.json();

  await sendWhatsAppTemplate(to);

  return NextResponse.json({ success: true });
}
