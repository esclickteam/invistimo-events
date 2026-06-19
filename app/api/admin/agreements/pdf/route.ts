import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import puppeteer from "puppeteer";

import db from "@/lib/db";
import CustomerAgreement from "@/models/CustomerAgreement";
import CustomerFile from "@/models/CustomerFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value: unknown) {
  if (!value) return "-";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value: unknown) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildAgreementHtml({
  agreement,
  customer,
}: {
  agreement: any;
  customer: any;
}) {
  const title = escapeHtml(agreement?.title || "הסכם שירותים");

  const customerName =
    agreement?.signerName || customer?.fullName || customer?.name || "";
  const customerEmail = agreement?.signerEmail || customer?.email || "";
  const customerPhone = agreement?.signerPhone || customer?.phone || "";
  const customerIdNumber = agreement?.signerIdNumber || "";

  const amount = formatMoney(agreement?.amount || customer?.totalPrice || 0);

  const createdAt = formatDateTime(agreement?.createdAt);
  const signedDate = formatDate(agreement?.signedAt);
  const signedTime = formatTime(agreement?.signedAt);
  const signedAtFull = formatDateTime(agreement?.signedAt);

  const eventDate = formatDate(customer?.eventDate);
  const venueName = customer?.venueName || "";
  const city = customer?.city || "";

  const signatureImageUrl = String(agreement?.signatureImageUrl || "").trim();
  const signatureText = String(agreement?.signatureText || "").trim();

  const isSigned = agreement?.status === "signed" || Boolean(agreement?.signedAt);

  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      direction: rtl;
      font-family: Arial, "Noto Sans Hebrew", sans-serif;
      color: #38271d;
      background: #f8f3ec;
      line-height: 1.65;
    }

    .page {
      width: 100%;
      min-height: 100vh;
      padding: 36px;
      background: #f8f3ec;
    }

    .paper {
      width: 100%;
      background: #ffffff;
      border: 1px solid #ead9c4;
      border-radius: 22px;
      padding: 34px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      border-bottom: 2px solid #ead9c4;
      padding-bottom: 22px;
      margin-bottom: 26px;
    }

    .brand {
      text-align: right;
    }

    .brand h1 {
      margin: 0;
      font-size: 30px;
      color: #3a281f;
      letter-spacing: -0.4px;
    }

    .brand p {
      margin: 4px 0 0;
      color: #8a6a43;
      font-weight: 700;
    }

    .badge {
      min-width: 150px;
      text-align: center;
      border-radius: 18px;
      padding: 14px 18px;
      background: ${isSigned ? "#ecfdf3" : "#fff7ed"};
      border: 1px solid ${isSigned ? "#bbf7d0" : "#fed7aa"};
      color: ${isSigned ? "#15803d" : "#c2410c"};
      font-weight: 900;
      font-size: 18px;
    }

    .section {
      margin-top: 22px;
      padding: 20px;
      border: 1px solid #f0e2d1;
      border-radius: 18px;
      background: #fffdf9;
    }

    .section h2 {
      margin: 0 0 14px;
      font-size: 20px;
      color: #4a3327;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .field {
      padding: 12px 14px;
      border-radius: 14px;
      background: #fbf7f0;
      border: 1px solid #efe1cf;
    }

    .label {
      display: block;
      font-size: 12px;
      color: #9a7a55;
      font-weight: 900;
      margin-bottom: 4px;
    }

    .value {
      font-size: 15px;
      font-weight: 800;
      color: #3f2d23;
      word-break: break-word;
    }

    .amount {
      font-size: 28px;
      color: #b87920;
      font-weight: 900;
    }

    .terms {
      white-space: pre-wrap;
      font-size: 14.5px;
      color: #49362b;
    }

    .signature-box {
      margin-top: 18px;
      padding: 20px;
      border: 2px dashed #d7bb93;
      border-radius: 18px;
      background: #fffaf3;
    }

    .signature-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 14px;
    }

    .signature-image {
      max-width: 260px;
      max-height: 110px;
      object-fit: contain;
      display: block;
      margin-top: 8px;
    }

    .footer {
      margin-top: 26px;
      padding-top: 16px;
      border-top: 1px solid #ead9c4;
      color: #8a6a43;
      font-size: 12px;
      text-align: center;
    }

    .watermark {
      margin-top: 10px;
      color: #15803d;
      font-weight: 900;
      font-size: 13px;
    }

    @media print {
      body {
        background: #ffffff;
      }

      .page {
        padding: 0;
        background: #ffffff;
      }

      .paper {
        border-radius: 0;
        border: none;
      }
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="paper">
      <div class="header">
        <div class="brand">
          <h1>${title}</h1>
          <p>Invistimo Management</p>
        </div>

        <div class="badge">
          ${isSigned ? "נחתם דיגיטלית" : "לא נחתם"}
        </div>
      </div>

      <div class="section">
        <h2>פרטי ההסכם</h2>

        <div class="grid">
          <div class="field">
            <span class="label">סוג מסמך</span>
            <span class="value">${title}</span>
          </div>

          <div class="field">
            <span class="label">תאריך יצירת הסכם</span>
            <span class="value">${createdAt}</span>
          </div>

          <div class="field">
            <span class="label">סטטוס</span>
            <span class="value">${isSigned ? "נחתם" : "טיוטה / נשלח"}</span>
          </div>

          <div class="field">
            <span class="label">סכום</span>
            <span class="value amount">${amount}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>פרטי הלקוח</h2>

        <div class="grid">
          <div class="field">
            <span class="label">שם מלא</span>
            <span class="value">${escapeHtml(customerName || "-")}</span>
          </div>

          <div class="field">
            <span class="label">תעודת זהות</span>
            <span class="value">${escapeHtml(customerIdNumber || "-")}</span>
          </div>

          <div class="field">
            <span class="label">טלפון</span>
            <span class="value">${escapeHtml(customerPhone || "-")}</span>
          </div>

          <div class="field">
            <span class="label">מייל</span>
            <span class="value">${escapeHtml(customerEmail || "-")}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>פרטי האירוע</h2>

        <div class="grid">
          <div class="field">
            <span class="label">תאריך אירוע</span>
            <span class="value">${eventDate}</span>
          </div>

          <div class="field">
            <span class="label">אולם / מקום</span>
            <span class="value">${escapeHtml(venueName || "-")}</span>
          </div>

          <div class="field">
            <span class="label">עיר</span>
            <span class="value">${escapeHtml(city || "-")}</span>
          </div>

          <div class="field">
            <span class="label">חבילה</span>
            <span class="value">${escapeHtml(customer?.packageName || "-")}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>פירוט השירות</h2>

        <div class="terms">
הלקוח רכש שירותי Invistimo בהתאם לחבילה שסוכמה בין הצדדים.

השירות עשוי לכלול, בהתאם לחבילה שנרכשה:
אישורי הגעה, שליחת הודעות, הושבה, ניהול אורחים, סבבי שיחות, תזכורות, הודעות תודה, ניהול אירוע ושירותים נוספים כפי שסוכמו מול Invistimo.

הפעלת השירות תבוצע בהתאם לפרטי הלקוח, פרטי האירוע, כמות הרשומות והשירותים שנרכשו בפועל.

מרגע פתיחת המשתמש ומתן גישה לשירותים הדיגיטליים, השירות נחשב כשירות שהחל בפועל.
        </div>
      </div>

      <div class="section">
        <h2>פרטי חתימה</h2>

        <div class="signature-box">
          <div class="grid">
            <div class="field">
              <span class="label">שם החותם</span>
              <span class="value">${escapeHtml(customerName || "-")}</span>
            </div>

            <div class="field">
              <span class="label">תעודת זהות</span>
              <span class="value">${escapeHtml(customerIdNumber || "-")}</span>
            </div>

            <div class="field">
              <span class="label">תאריך חתימה</span>
              <span class="value">${signedDate}</span>
            </div>

            <div class="field">
              <span class="label">שעת חתימה</span>
              <span class="value">${signedTime}</span>
            </div>

            <div class="field">
              <span class="label">חתימה מלאה</span>
              <span class="value">${signedAtFull}</span>
            </div>

            <div class="field">
              <span class="label">כתובת IP</span>
              <span class="value">${escapeHtml(agreement?.ipAddress || "-")}</span>
            </div>
          </div>

          <div class="signature-row">
            <div class="field">
              <span class="label">חתימה</span>
              <span class="value">
                ${
                  signatureImageUrl
                    ? `<img class="signature-image" src="${escapeHtml(signatureImageUrl)}" />`
                    : escapeHtml(signatureText || customerName || "-")
                }
              </span>
            </div>

            <div class="field">
              <span class="label">אישור</span>
              <span class="value">
                ${
                  isSigned
                    ? "הלקוח אישר וחתם על ההסכם באופן דיגיטלי."
                    : "ההסכם טרם נחתם."
                }
              </span>
            </div>
          </div>
        </div>

        <div class="watermark">
          ${isSigned ? "מסמך זה הופק כהעתק PDF של הסכם חתום." : "מסמך זה הופק לפני חתימה."}
        </div>
      </div>

      <div class="footer">
        הופק אוטומטית על ידי Invistimo Management · ${formatDateTime(new Date())}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    await db();

    const { searchParams } = new URL(req.url);
    const agreementId = String(searchParams.get("agreementId") || "").trim();

    if (!agreementId || !mongoose.Types.ObjectId.isValid(agreementId)) {
      return NextResponse.json(
        { success: false, error: "מזהה הסכם לא תקין" },
        { status: 400 }
      );
    }

    const agreement = await CustomerAgreement.findById(agreementId).lean();

    if (!agreement) {
      return NextResponse.json(
        { success: false, error: "הסכם לא נמצא" },
        { status: 404 }
      );
    }

    const customerFileId = String((agreement as any).customerFileId || "");

    const customer = customerFileId
      ? await CustomerFile.findById(customerFileId).lean()
      : null;

    const html = buildAgreementHtml({
      agreement,
      customer: customer || {},
    });

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "load",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "12mm",
        bottom: "14mm",
        left: "12mm",
      },
    });

    await browser.close();
    browser = null;

    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    ) as ArrayBuffer;

    const fileName = `signed-agreement-${agreementId}.pdf`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("AGREEMENT PDF ERROR:", error);

    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    return NextResponse.json(
      { success: false, error: "שגיאה ביצירת PDF להסכם" },
      { status: 500 }
    );
  }
}