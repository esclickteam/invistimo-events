import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PreviewAgreementBody = {
  agreementDate?: string;
  fullName?: string;
  idNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  startDate?: string;
  finalFullName?: string;
  finalIdNumber?: string;
  finalSignatureDate?: string;
  signatureDataUrl?: string;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function hasHebrew(value: string) {
  return /[\u0590-\u05FF]/.test(value);
}

function rtlVisual(value: string) {
  if (!hasHebrew(value)) return value;
  return value.split("").reverse().join("");
}

function requiredField(value: string, label: string) {
  if (!value) {
    throw new Error(`חסר שדה חובה: ${label}`);
  }
}

async function loadHebrewFontBytes() {
  const possibleFontPaths = [
    path.join(process.cwd(), "public", "fonts", "NotoSansHebrew-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "Arial.ttf"),
    "C:\\Windows\\Fonts\\arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansHebrew-Regular.ttf",
  ];

  for (const fontPath of possibleFontPaths) {
    try {
      return await fs.readFile(fontPath);
    } catch {}
  }

  return null;
}

function stripDataUrlPrefix(dataUrl: string) {
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | PreviewAgreementBody
      | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: "בקשה לא תקינה" },
        { status: 400 }
      );
    }

    const agreementDate = cleanStr(body.agreementDate);
    const fullName = cleanStr(body.fullName);
    const idNumber = cleanStr(body.idNumber);
    const address = cleanStr(body.address);
    const phone = cleanStr(body.phone);
    const email = cleanStr(body.email);
    const startDate = cleanStr(body.startDate);
    const finalFullName = cleanStr(body.finalFullName);
    const finalIdNumber = cleanStr(body.finalIdNumber);
    const finalSignatureDate = cleanStr(body.finalSignatureDate);
    const signatureDataUrl = cleanStr(body.signatureDataUrl);

    requiredField(agreementDate, "תאריך ההסכם");
    requiredField(fullName, "שם העובד/ת");
    requiredField(idNumber, "תעודת זהות");
    requiredField(address, "כתובת");
    requiredField(phone, "טלפון");
    requiredField(email, "אימייל");
    requiredField(startDate, "תאריך תחילת עבודה");
    requiredField(finalFullName, "שם מלא לחתימה");
    requiredField(finalIdNumber, "תעודת זהות לחתימה");
    requiredField(finalSignatureDate, "תאריך חתימה");
    requiredField(signatureDataUrl, "חתימה");

    if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
      return NextResponse.json(
        { success: false, error: "חתימה לא תקינה" },
        { status: 400 }
      );
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "employee-agreement-invistimo.pdf"
    );

    const templateBytes = await fs.readFile(templatePath);

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);

    const fontBytes = await loadHebrewFontBytes();

    const font = fontBytes
      ? await pdfDoc.embedFont(fontBytes)
      : await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();

    if (pages.length < 11) {
      return NextResponse.json(
        {
          success: false,
          error: "ה־PDF חייב להכיל לפחות 11 עמודים לפי תבנית ההסכם.",
        },
        { status: 400 }
      );
    }

    const textColor = rgb(0.05, 0.09, 0.16);

    function drawTextOnPage(options: {
      pageIndex: number;
      text: string;
      x: number;
      y: number;
      size?: number;
      rtl?: boolean;
    }) {
      const page = pages[options.pageIndex];
      if (!page || !options.text) return;

      const text =
        options.rtl === false ? options.text : rtlVisual(options.text);

      page.drawText(text, {
        x: options.x,
        y: options.y,
        size: options.size || 10,
        font,
        color: textColor,
      });
    }

    drawTextOnPage({
      pageIndex: 0,
      text: formatDate(agreementDate),
      x: 235,
      y: 744,
      size: 10,
      rtl: false,
    });

    drawTextOnPage({
      pageIndex: 0,
      text: fullName,
      x: 180,
      y: 557,
      size: 10,
    });

    drawTextOnPage({
      pageIndex: 0,
      text: idNumber,
      x: 220,
      y: 535,
      size: 10,
      rtl: false,
    });

    drawTextOnPage({
      pageIndex: 0,
      text: address,
      x: 165,
      y: 512,
      size: 10,
    });

    drawTextOnPage({
      pageIndex: 0,
      text: phone,
      x: 185,
      y: 489,
      size: 10,
      rtl: false,
    });

    drawTextOnPage({
      pageIndex: 0,
      text: email,
      x: 185,
      y: 466,
      size: 10,
      rtl: false,
    });

    drawTextOnPage({
      pageIndex: 1,
      text: formatDate(startDate),
      x: 250,
      y: 724,
      size: 10,
      rtl: false,
    });

    const lastPageIndex = pages.length - 1;

    drawTextOnPage({
      pageIndex: lastPageIndex,
      text: finalFullName,
      x: 300,
      y: 143,
      size: 10,
    });

    drawTextOnPage({
      pageIndex: lastPageIndex,
      text: finalIdNumber,
      x: 145,
      y: 143,
      size: 10,
      rtl: false,
    });

    drawTextOnPage({
      pageIndex: lastPageIndex,
      text: formatDate(finalSignatureDate),
      x: 110,
      y: 102,
      size: 10,
      rtl: false,
    });

    const signatureBase64 = stripDataUrlPrefix(signatureDataUrl);
    const signatureBytes = Buffer.from(signatureBase64, "base64");
    const signatureImage = await pdfDoc.embedPng(signatureBytes);

    pages[lastPageIndex].drawImage(signatureImage, {
      x: 240,
      y: 82,
      width: 145,
      height: 45,
    });

    const previewPdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(previewPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="employee-agreement-preview.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PREVIEW EMPLOYEE AGREEMENT ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "שגיאה ביצירת תצוגה מקדימה להסכם",
      },
      { status: 500 }
    );
  }
}