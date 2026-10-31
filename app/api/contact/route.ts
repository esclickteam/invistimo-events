import { NextResponse } from "next/server";
import { Resend } from "resend";
import { assertExternalSendAllowed } from "@/lib/env/externalSends";
import { openContactFormLead } from "@/lib/contact/openContactLead";
import {
  isValidContactPhone,
  normalizeContactPhone,
} from "@/lib/contact/contactPhone";

/** Lazy client — module-level `new Resend()` throws during build when the key is unset. */
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(key);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    if (!process.env.SUPPORT_EMAIL) {
      throw new Error("Missing SUPPORT_EMAIL");
    }

    const body = await req.json();

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const subject = String(body?.subject || "").trim();
    const message = String(body?.message || "").trim();
    const phoneRaw = String(body?.phone || "").trim();
    const phone = phoneRaw ? normalizeContactPhone(phoneRaw) : "";

    if (!name || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing fields",
        },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "כתובת הדוא״ל אינה תקינה",
        },
        { status: 400 }
      );
    }

    if (phoneRaw && !isValidContactPhone(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: "נא להזין מספר טלפון ישראלי תקין",
        },
        { status: 400 }
      );
    }

    // A phone number opens a CRM lead only. Nothing is sent to that number.
    if (phone) {
      try {
        await openContactFormLead({
          name,
          email,
          phone,
          subject,
          message,
        });
      } catch (leadError) {
        console.error("CONTACT FORM LEAD ERROR:", leadError);
        return NextResponse.json(
          {
            success: false,
            error: "לא הצלחנו לשמור את הפנייה. נסו שוב.",
          },
          { status: 500 }
        );
      }
    }

    // ✅ ניקוי רווחים – קריטי לשליחה לכמה נמענים
    const recipients = process.env.SUPPORT_EMAIL
      .split(",")
      .map((addr) => addr.trim())
      .filter(Boolean);

    for (const recipient of recipients) {
      const gate = assertExternalSendAllowed({
        channel: "email",
        to: recipient,
      });
      if (!gate.allowed) {
        console.warn("contact form email blocked by safety gate", {
          reason: gate.reason,
        });
        return NextResponse.json({
          success: true,
          blocked: true,
          message: "Staging safety: external email not sent",
        });
      }
    }

    const resend = getResend();

    await resend.emails.send({
      // נשלח רק לצוות. הפונה לא מקבל עותק.
      from: "Invistimo <support@invistimo.com>",
      to: recipients,
      bcc: ["invistimo9@gmail.com"],
      ...(email ? { replyTo: email } : {}),

      subject: subject
        ? `פנייה חדשה: ${subject}`
        : "פנייה חדשה מטופס יצירת קשר – Invistimo",

      html: `
        <div style="font-family: Arial, sans-serif; direction: rtl; line-height:1.6">
          <h2>פנייה חדשה מהאתר</h2>

          <p><strong>שם:</strong> ${escapeHtml(name)}</p>
          <p><strong>אימייל:</strong> ${email ? escapeHtml(email) : "לא הושאר"}</p>
          ${
            phone
              ? `<p><strong>טלפון:</strong> ${escapeHtml(phone)}</p>`
              : ""
          }

          ${
            subject
              ? `<p><strong>נושא:</strong> ${escapeHtml(subject)}</p>`
              : ""
          }

          <p><strong>הודעה:</strong></p>

          <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>

          <hr />

          <p style="font-size:12px;color:#666">
            נשלח אוטומטית מטופס יצירת קשר באתר Invistimo. לא נשלחה הודעה לפונה.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("CONTACT FORM ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
