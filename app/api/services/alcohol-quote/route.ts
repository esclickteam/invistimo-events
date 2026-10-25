import { NextResponse } from "next/server";
import { Resend } from "resend";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";

const resend = new Resend(process.env.RESEND_API_KEY!);

type QuoteBody = {
  name?: string;
  phone?: string;
  eventType?: string;
  eventDate?: string;
  venue?: string;
  guests?: string;
  bars?: string;
  tableBottles?: string;
  bottleEstimate?: string;
  notes?: string;
};

function clean(value: unknown, max = 500) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }
    if (!process.env.SUPPORT_EMAIL) {
      throw new Error("Missing SUPPORT_EMAIL");
    }

    const body = (await req.json()) as QuoteBody;
    const name = clean(body.name, 120);
    const phone = clean(body.phone, 40);
    const eventType = clean(body.eventType, 80);
    const eventDate = clean(body.eventDate, 40);
    const venue = clean(body.venue, 160);
    const guests = clean(body.guests, 40);
    const bars = clean(body.bars, 40);
    const tableBottles = clean(body.tableBottles, 40);
    const bottleEstimate = clean(body.bottleEstimate, 80);
    const notes = clean(body.notes, 2000);

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const recipients = process.env.SUPPORT_EMAIL.split(",")
      .map((addr) => addr.trim())
      .filter(Boolean);

    for (const recipient of recipients) {
      const gate = assertExternalSendAllowed({
        channel: "email",
        to: recipient,
      });
      if (!gate.allowed) {
        console.warn("alcohol quote email blocked by safety gate", {
          reason: gate.reason,
        });
        return NextResponse.json({
          success: true,
          blocked: true,
          message: "Staging safety: external email not sent",
        });
      }
    }

    await resend.emails.send({
      from: "Invistimo <support@invistimo.com>",
      to: recipients,
      bcc: ["invistimo9@gmail.com"],
      subject: `בקשת הצעת מחיר — ניהול אלכוהול | ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; line-height:1.6">
          <h2>בקשת הצעת מחיר — ניהול אלכוהול</h2>
          <p><strong>שם:</strong> ${name}</p>
          <p><strong>טלפון:</strong> ${phone}</p>
          <p><strong>סוג אירוע:</strong> ${eventType || "—"}</p>
          <p><strong>תאריך:</strong> ${eventDate || "—"}</p>
          <p><strong>אולם / מיקום:</strong> ${venue || "—"}</p>
          <p><strong>אורחים משוערים:</strong> ${guests || "—"}</p>
          <p><strong>מספר ברים:</strong> ${bars || "—"}</p>
          <p><strong>חלוקה לשולחנות:</strong> ${tableBottles || "—"}</p>
          <p><strong>כמות בקבוקים משוערת:</strong> ${bottleEstimate || "—"}</p>
          <p><strong>הערות:</strong></p>
          <p>${notes || "—"}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("alcohol quote failed:", error);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
