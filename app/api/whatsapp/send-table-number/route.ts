// app/api/whatsapp/send-table-number/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  to: string;
  name: string;
  tableName: string;
  eventType: string;     // חתונה/ברית...
  templateName?: string; // אופציונלי (ברירת מחדל: table_number_update)
  languageCode?: string; // אופציונלי (ברירת מחדל: he)
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  try {
    let body: Partial<Body>;
    try {
      body = (await req.json()) as Partial<Body>;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.to)) {
      return NextResponse.json({ success: false, error: "Missing required field: to" }, { status: 400 });
    }
    if (!isNonEmptyString(body.name)) {
      return NextResponse.json({ success: false, error: "Missing required field: name" }, { status: 400 });
    }
    if (!isNonEmptyString(body.tableName)) {
      return NextResponse.json({ success: false, error: "Missing required field: tableName" }, { status: 400 });
    }
    if (!isNonEmptyString(body.eventType)) {
      return NextResponse.json({ success: false, error: "Missing required field: eventType" }, { status: 400 });
    }

    const result = await sendTableNumberTemplate({
      to: body.to,
      name: body.name,
      tableName: body.tableName,
      eventType: body.eventType,
      templateName: body.templateName,
      languageCode: body.languageCode,
    });

    return NextResponse.json({ success: true, providerResponse: result }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const isClientError =
      message.includes("Missing required field") ||
      message.includes("Invalid phone number");

    return NextResponse.json(
      { success: false, error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
