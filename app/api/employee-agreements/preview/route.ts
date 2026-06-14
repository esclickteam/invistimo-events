import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreementTemplate from "@/models/EmployeeAgreementTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FieldType = "text" | "date" | "signature";

type TemplateField = {
  id: string;
  label: string;
  type: FieldType;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  order: number;
};

type PreviewAgreementBody = {
  businessId?: string;

  values?: Record<string, string>;
  signatures?: Record<string, string>;

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

const DESIGN_WIDTH = 700;
const DESIGN_HEIGHT = 900;

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLabel(value: string) {
  return value.replace(/\s+/g, "").replace(/[/:._-]/g, "").trim();
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

function getPublicFilePath(fileUrl: string) {
  const cleanUrl = cleanStr(fileUrl) || "/templates/employee-agreement-invistimo.pdf";

  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    throw new Error("כרגע נתמך PDF מתוך public בלבד, לא כתובת חיצונית.");
  }

  const withoutQuery = cleanUrl.split("?")[0].split("#")[0];
  const relativePath = withoutQuery.startsWith("/")
    ? withoutQuery.slice(1)
    : withoutQuery;

  return path.join(process.cwd(), "public", relativePath);
}

function getLegacyValue(body: PreviewAgreementBody, field: TemplateField) {
  const label = normalizeLabel(field.label);

  const legacyMap: Record<string, string | undefined> = {
    תאריךההסכם: body.agreementDate,
    תאריך: body.agreementDate,

    שםהעובדת: body.fullName,
    שםהעובד: body.fullName,
    שםעובדת: body.fullName,
    שםעובד: body.fullName,
    שםמלא: body.fullName,

    תעודתזהות: body.idNumber,
    תז: body.idNumber,

    כתובת: body.address,
    טלפון: body.phone,
    אימייל: body.email,
    מייל: body.email,

    תאריךתחילתעבודה: body.startDate,

    שםמלאלחתימה: body.finalFullName,
    שםלחתימה: body.finalFullName,

    תזלחתימה: body.finalIdNumber,
    תעודתזהותלחתימה: body.finalIdNumber,

    תאריךחתימה: body.finalSignatureDate,
  };

  return cleanStr(legacyMap[label]);
}

function getFieldValue(body: PreviewAgreementBody, field: TemplateField) {
  const values = body.values || {};
  const directValue = cleanStr(values[field.id]);

  if (directValue) return directValue;

  return getLegacyValue(body, field);
}

function getSignatureValue(body: PreviewAgreementBody, field: TemplateField) {
  const signatures = body.signatures || {};
  const directSignature = cleanStr(signatures[field.id]);

  if (directSignature) return directSignature;

  const values = body.values || {};
  const valueSignature = cleanStr(values[field.id]);

  if (valueSignature) return valueSignature;

  return cleanStr(body.signatureDataUrl);
}

function convertTemplateBoxToPdfBox(options: {
  field: TemplateField;
  pageWidth: number;
  pageHeight: number;
}) {
  const { field, pageWidth, pageHeight } = options;

  /**
   * באדמין השדה נשמר לפי:
   * right = x
   * top = y
   *
   * ב־pdf-lib עובדים לפי:
   * left = x
   * bottom = y
   */
  const width = (field.width / DESIGN_WIDTH) * pageWidth;
  const height = (field.height / DESIGN_HEIGHT) * pageHeight;

  const left = pageWidth - ((field.x + field.width) / DESIGN_WIDTH) * pageWidth;
  const bottom =
    pageHeight - ((field.y + field.height) / DESIGN_HEIGHT) * pageHeight;

  return {
    x: left,
    y: bottom,
    width,
    height,
  };
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const body = (await req.json().catch(() => null)) as PreviewAgreementBody | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: "בקשה לא תקינה" },
        { status: 400 }
      );
    }

    const businessId = cleanStr(body.businessId);

    const templateQuery: Record<string, unknown> = {
      isActive: true,
    };

    if (businessId && mongoose.Types.ObjectId.isValid(businessId)) {
      templateQuery.businessId = new mongoose.Types.ObjectId(businessId);
    } else {
      templateQuery.businessId = null;
    }

    let template = await EmployeeAgreementTemplate.findOne(templateQuery)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    if (!template && templateQuery.businessId !== null) {
      template = await EmployeeAgreementTemplate.findOne({
        isActive: true,
        businessId: null,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();
    }

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאה תבנית הסכם פעילה. יש ליצור תבנית באדמין.",
        },
        { status: 404 }
      );
    }

    const fields = Array.isArray((template as any).fields)
      ? ((template as any).fields as TemplateField[])
      : [];

    if (fields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "לתבנית ההסכם אין שדות. יש להגדיר שדות באדמין.",
        },
        { status: 400 }
      );
    }

    for (const field of fields) {
      if (!field.required) continue;

      if (field.type === "signature") {
        const signature = getSignatureValue(body, field);

        if (!signature) {
          return NextResponse.json(
            { success: false, error: `חסר שדה חובה: ${field.label}` },
            { status: 400 }
          );
        }

        continue;
      }

      const value = getFieldValue(body, field);

      if (!value) {
        return NextResponse.json(
          { success: false, error: `חסר שדה חובה: ${field.label}` },
          { status: 400 }
        );
      }
    }

    const templatePath = getPublicFilePath((template as any).fileUrl);
    const templateBytes = await fs.readFile(templatePath);

    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);

    const fontBytes = await loadHebrewFontBytes();

    if (!fontBytes) {
      return NextResponse.json(
        {
          success: false,
          error:
            "חסר פונט עברית. שימי את הקובץ NotoSansHebrew-Regular.ttf בתוך public/fonts",
        },
        { status: 500 }
      );
    }

    const font = await pdfDoc.embedFont(fontBytes);
    const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();

    const textColor = rgb(0.05, 0.09, 0.16);

    for (const field of fields.sort((a, b) => a.order - b.order)) {
      const page = pages[field.pageIndex];

      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();
      const box = convertTemplateBoxToPdfBox({
        field,
        pageWidth,
        pageHeight,
      });

      if (field.type === "signature") {
        const signatureDataUrl = getSignatureValue(body, field);

        if (!signatureDataUrl) continue;

        if (!signatureDataUrl.startsWith("data:image/png;base64,")) {
          return NextResponse.json(
            { success: false, error: `חתימה לא תקינה בשדה: ${field.label}` },
            { status: 400 }
          );
        }

        const signatureBase64 = stripDataUrlPrefix(signatureDataUrl);
        const signatureBytes = Buffer.from(signatureBase64, "base64");
        const signatureImage = await pdfDoc.embedPng(signatureBytes);

        page.drawImage(signatureImage, {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        });

        continue;
      }

      const rawValue = getFieldValue(body, field);
      const value = field.type === "date" ? formatDate(rawValue) : rawValue;

      if (!value) continue;

      const isHebrew = hasHebrew(value);
      const text = isHebrew ? rtlVisual(value) : value;

      page.drawText(text, {
        x: box.x,
        y: box.y + Math.max(2, box.height * 0.22),
        size: Math.max(8, Math.min(13, box.height * 0.45)),
        font: isHebrew ? font : fallbackFont,
        color: textColor,
      });
    }

    const previewPdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(previewPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'inline; filename="employee-agreement-preview.pdf"',
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