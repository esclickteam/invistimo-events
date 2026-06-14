import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignAgreementBody = {
  employeeId?: string;
  businessId?: string;
  fullName?: string;
  idNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  startDate?: string;
  signatureDataUrl?: string;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFileName(value: string) {
  return value
    .replace(/[^\w\u0590-\u05FF.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
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

/**
 * pdf-lib לא עושה RTL לבד.
 * לכן עבור טקסט עברי פשוט הופכים תווים כדי שיופיע תקין על PDF שטוח.
 */
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
    } catch {
      // ממשיכים לפונט הבא
    }
  }

  return null;
}

function stripDataUrlPrefix(dataUrl: string) {
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}

function isValidObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as SignAgreementBody | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: "בקשה לא תקינה" },
        { status: 400 }
      );
    }

    const employeeId = cleanStr(body.employeeId);
    const businessId = cleanStr(body.businessId);

    const fullName = cleanStr(body.fullName);
    const idNumber = cleanStr(body.idNumber);
    const address = cleanStr(body.address);
    const phone = cleanStr(body.phone);
    const email = cleanStr(body.email);
    const startDate = cleanStr(body.startDate);
    const signatureDataUrl = cleanStr(body.signatureDataUrl);

    requiredField(employeeId, "מזהה עובד");
    requiredField(businessId, "מזהה עסק");
    requiredField(fullName, "שם מלא");
    requiredField(idNumber, "תעודת זהות");
    requiredField(address, "כתובת");
    requiredField(phone, "טלפון");
    requiredField(email, "אימייל");
    requiredField(startDate, "תאריך תחילת עבודה");
    requiredField(signatureDataUrl, "חתימה");

    if (!isValidObjectId(employeeId) || !isValidObjectId(businessId)) {
      return NextResponse.json(
        { success: false, error: "מזהה עובד או עסק לא תקין" },
        { status: 400 }
      );
    }

    if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
      return NextResponse.json(
        { success: false, error: "חתימה לא תקינה" },
        { status: 400 }
      );
    }

    await db();

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

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
      if (!page) return;

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

    const today = new Date().toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const formattedStartDate = formatDate(startDate);

    /**
     * עמוד 1 — תאריך ופרטי עובד/ת
     */
    drawTextOnPage({
      pageIndex: 0,
      text: today,
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

    /**
     * עמוד 2 — תאריך תחילת עבודה
     */
    drawTextOnPage({
      pageIndex: 1,
      text: formattedStartDate,
      x: 250,
      y: 724,
      size: 10,
      rtl: false,
    });

    /**
     * עמוד 11 — פרטי חתימה
     */
    drawTextOnPage({
      pageIndex: 10,
      text: fullName,
      x: 300,
      y: 143,
      size: 10,
    });

    drawTextOnPage({
      pageIndex: 10,
      text: idNumber,
      x: 145,
      y: 143,
      size: 10,
      rtl: false,
    });

    drawTextOnPage({
      pageIndex: 10,
      text: today,
      x: 110,
      y: 102,
      size: 10,
      rtl: false,
    });

    const signatureBase64 = stripDataUrlPrefix(signatureDataUrl);
    const signatureBytes = Buffer.from(signatureBase64, "base64");
    const signatureImage = await pdfDoc.embedPng(signatureBytes);

    const signaturePage = pages[10];

    signaturePage.drawImage(signatureImage, {
      x: 240,
      y: 82,
      width: 145,
      height: 45,
    });

    const signedPdfBytes = await pdfDoc.save();

    const uploadsDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "employee-agreements"
    );

    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `${safeFileName(employeeId)}-${Date.now()}-signed.pdf`;
    const outputPath = path.join(uploadsDir, fileName);

    await fs.writeFile(outputPath, signedPdfBytes);

    const signedFileUrl = `/uploads/employee-agreements/${fileName}`;

    const savedAgreement = await EmployeeAgreement.findOneAndUpdate(
      {
        employeeId: employeeObjectId,
        businessId: businessObjectId,
      },
      {
        employeeId: employeeObjectId,
        businessId: businessObjectId,
        fullName,
        idNumber,
        address,
        phone,
        email,
        startDate: startDate ? new Date(startDate) : null,
        signedFileUrl,
        status: "signed",
        signedAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: "",
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return NextResponse.json({
      success: true,
      signedFileUrl,
      message: "ההסכם נחתם ונשמר בהצלחה",
      agreement: savedAgreement,
    });
  } catch (err) {
    console.error("SIGN EMPLOYEE AGREEMENT ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "שגיאה ביצירת הסכם עבודה חתום",
      },
      { status: 500 }
    );
  }
}