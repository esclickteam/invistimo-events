import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import db from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import EmployeeForm101 from "@/models/EmployeeForm101";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomeTypePayload = {
  monthlySalary?: boolean;
  extraSalary?: boolean;
  partialSalary?: boolean;
  dailyWage?: boolean;
  allowance?: boolean;
  pension?: boolean;
};

type OtherIncomePayload = {
  noOtherIncome?: boolean;
  monthlySalary?: boolean;
  extraSalary?: boolean;
  partialSalary?: boolean;
  dailyWage?: boolean;
  allowance?: boolean;
  pension?: boolean;
  scholarship?: boolean;
};

type ChildPayload = {
  name?: string;
  idNumber?: string;
  birthDate?: string;
};

type SpousePayload = {
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  immigrationDate?: string;
  noIncome?: boolean;
  hasIncome?: boolean;
};

type Form101Payload = {
  taxYear?: string;

  employerName?: string;
  employerAddress?: string;
  employerPhone?: string;
  employerFileNumber?: string;

  idNumber?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  immigrationDate?: string;

  street?: string;
  houseNumber?: string;
  city?: string;
  postalCode?: string;

  phone?: string;
  mobile?: string;
  email?: string;

  gender?: "male" | "female" | "";
  maritalStatus?:
    | "single"
    | "married"
    | "divorced"
    | "widowed"
    | "separated"
    | "";
  residentIsrael?: "yes" | "no" | "";
  kibbutzMember?: "yes" | "no" | "";
  healthFundMember?: "yes" | "no" | "";
  healthFundName?: string;

  incomeType?: IncomeTypePayload;
  otherIncome?: OtherIncomePayload;

  workStartDate?: string;

  spouse?: SpousePayload;
  children?: ChildPayload[];

  taxCredits?: Record<string, any>;

  signatureDate?: string;
  signatureText?: string;
  signatureDataUrl?: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function onlyDigits(value: unknown) {
  return clean(value).replace(/\D/g, "");
}

function formatDateIL(value?: string) {
  const raw = clean(value);
  if (!raw) return "";

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());

  return `${dd}/${mm}/${yyyy}`;
}

function splitId(value?: string) {
  return onlyDigits(value).slice(0, 9);
}

function normalizeTaxYear(value: unknown) {
  const parsed = Number(value || new Date().getFullYear());
  const currentYear = new Date().getFullYear();

  if (!Number.isFinite(parsed)) return currentYear;

  const year = Math.trunc(parsed);

  if (year < 2000 || year > currentYear + 2) {
    return currentYear;
  }

  return year;
}

function toObjectId(value: unknown) {
  const id = clean(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function extractUserId(authResult: any) {
  if (!authResult) return "";

  if (typeof authResult === "string") {
    return authResult;
  }

  return clean(
    authResult.userId ||
      authResult.id ||
      authResult._id ||
      authResult.user?._id ||
      authResult.user?.id
  );
}

function extractBusinessId(authResult: any) {
  if (!authResult || typeof authResult === "string") return "";

  return clean(
    authResult.businessId ||
      authResult.business?._id ||
      authResult.business?.id ||
      authResult.user?.businessId
  );
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadHebrewFont(pdfDoc: PDFDocument) {
  pdfDoc.registerFontkit(fontkit);

  const fontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "NotoSansHebrew-Regular.ttf"
  );

  const exists = await fileExists(fontPath);

  if (!exists) {
    throw new Error(
      "HEBREW_FONT_MISSING: missing public/fonts/NotoSansHebrew-Regular.ttf"
    );
  }

  const fontBytes = await fs.readFile(fontPath);
  return pdfDoc.embedFont(fontBytes, { subset: true });
}

function drawText(
  page: any,
  text: unknown,
  x: number,
  y: number,
  options: {
    font: any;
    size?: number;
    maxWidth?: number;
  }
) {
  const value = clean(text);
  if (!value) return;

  page.drawText(value, {
    x,
    y,
    size: options.size || 11,
    font: options.font,
    color: rgb(0, 0, 0),
    maxWidth: options.maxWidth,
  });
}

function drawCenteredText(
  page: any,
  text: unknown,
  x: number,
  y: number,
  width: number,
  options: {
    font: any;
    size?: number;
  }
) {
  const value = clean(text);
  if (!value) return;

  const size = options.size || 11;
  const textWidth = options.font.widthOfTextAtSize(value, size);

  page.drawText(value, {
    x: x + Math.max((width - textWidth) / 2, 0),
    y,
    size,
    font: options.font,
    color: rgb(0, 0, 0),
  });
}

function drawCheck(page: any, checked: boolean, x: number, y: number, font: any) {
  if (!checked) return;

  page.drawText("✓", {
    x,
    y,
    size: 13,
    font,
    color: rgb(0, 0, 0),
  });
}

function getCredit(body: Form101Payload, key: string) {
  return body.taxCredits?.[key];
}

function extractImageDataUrl(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;

  const match = raw.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);

  if (!match?.[1] || !match?.[2]) return null;

  const imageType = match[1].toLowerCase() === "png" ? "png" : "jpg";

  return {
    imageType,
    base64: match[2],
  };
}

async function drawSignatureImage(
  pdfDoc: PDFDocument,
  page: any,
  signatureDataUrl: unknown,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const imageData = extractImageDataUrl(signatureDataUrl);
  if (!imageData) return false;

  try {
    const imageBytes = Buffer.from(imageData.base64, "base64");

    const image =
      imageData.imageType === "png"
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

    page.drawImage(image, {
      x,
      y,
      width,
      height,
    });

    return true;
  } catch (error) {
    console.error("DRAW SIGNATURE IMAGE ERROR:", error);
    return false;
  }
}

function buildPrivateDocumentViewUrl(r2Key: string) {
  return `/api/employee/documents/view?key=${encodeURIComponent(r2Key)}`;
}

function sanitizeFilePart(value: unknown, fallback: string) {
  const cleaned =
    clean(value)
      .replace(/[^\w.\-א-ת]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback;

  return cleaned;
}

function drawTextRight(
  page: any,
  text: unknown,
  rightX: number,
  y: number,
  options: {
    font: any;
    size?: number;
    maxWidth?: number;
    minX?: number;
  }
) {
  const value = clean(text);
  if (!value) return;

  const size = options.size || 11;
  const textWidth = options.font.widthOfTextAtSize(value, size);
  const maxWidth = options.maxWidth || textWidth;
  const minX = options.minX ?? 0;
  const x = Math.max(rightX - Math.min(textWidth, maxWidth), minX);

  page.drawText(value, {
    x,
    y,
    size,
    font: options.font,
    color: rgb(0, 0, 0),
    maxWidth,
  });
}

function drawTextBoxRight(
  page: any,
  text: unknown,
  leftX: number,
  rightX: number,
  y: number,
  options: {
    font: any;
    size?: number;
    padding?: number;
  }
) {
  const padding = options.padding ?? 4;
  drawTextRight(page, text, rightX - padding, y, {
    font: options.font,
    size: options.size || 11,
    maxWidth: Math.max(rightX - leftX - padding * 2, 10),
    minX: leftX + padding,
  });
}

function drawTextBoxLeft(
  page: any,
  text: unknown,
  leftX: number,
  rightX: number,
  y: number,
  options: {
    font: any;
    size?: number;
    padding?: number;
  }
) {
  const value = clean(text);
  if (!value) return;

  const padding = options.padding ?? 4;

  page.drawText(value, {
    x: leftX + padding,
    y,
    size: options.size || 11,
    font: options.font,
    color: rgb(0, 0, 0),
    maxWidth: Math.max(rightX - leftX - padding * 2, 10),
  });
}

function drawSmallCheck(page: any, checked: boolean, x: number, y: number, font: any) {
  if (!checked) return;

  page.drawText("✓", {
    x,
    y,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
}

async function generateForm101Pdf(body: Form101Payload) {
  const templatePath = path.join(
    process.cwd(),
    "public",
    "forms",
    "tofes-101.pdf"
  );

  const templateExists = await fileExists(templatePath);

  if (!templateExists) {
    throw new Error("חסר קובץ public/forms/tofes-101.pdf");
  }

  const templateBytes = await fs.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await loadHebrewFont(pdfDoc);

  const pages = pdfDoc.getPages();

  if (!pages.length) {
    throw new Error("INVALID_TEMPLATE_PDF");
  }

  const page1 = pages[0];
  const page2 = pages[1];

  /* =========================================================
     PAGE 1 — כרטיס עובד
     מותאם לקובץ public/forms/tofes-101.pdf שהעלית
  ========================================================= */

  drawCenteredText(page1, body.taxYear || new Date().getFullYear(), 263, 715, 70, {
    font,
    size: 17,
  });

  /* א. פרטי המעסיק */
  drawTextBoxRight(page1, body.employerName, 405, 572, 619, {
    font,
    size: 13,
  });

  drawTextBoxRight(page1, body.employerAddress, 270, 405, 619, {
    font,
    size: 11,
  });

  drawTextBoxLeft(page1, onlyDigits(body.employerPhone), 143, 270, 619, {
    font,
    size: 13,
  });

  drawTextBoxLeft(page1, onlyDigits(body.employerFileNumber), 29, 143, 619, {
    font,
    size: 13,
  });

  /* ב. פרטי העובד/ת */
  drawTextBoxLeft(page1, splitId(body.idNumber), 474, 572, 548, {
    font,
    size: 13,
  });

  drawTextBoxRight(page1, body.lastName, 346, 474, 548, {
    font,
    size: 13,
  });

  drawTextBoxRight(page1, body.firstName, 255, 346, 548, {
    font,
    size: 13,
  });

  drawCenteredText(page1, formatDateIL(body.birthDate), 168, 548, 87, {
    font,
    size: 12,
  });

  drawCenteredText(page1, formatDateIL(body.immigrationDate), 37, 548, 130, {
    font,
    size: 12,
  });

  drawTextBoxRight(page1, body.street, 374, 572, 511, {
    font,
    size: 12,
  });

  drawCenteredText(page1, body.houseNumber, 333, 511, 40, {
    font,
    size: 12,
  });

  drawTextBoxRight(page1, body.city, 245, 333, 511, {
    font,
    size: 12,
  });

  drawCenteredText(page1, body.postalCode, 170, 511, 72, {
    font,
    size: 12,
  });

  drawTextBoxLeft(page1, onlyDigits(body.mobile), 276, 467, 466, {
    font,
    size: 13,
  });

  drawTextBoxLeft(page1, onlyDigits(body.phone), 151, 276, 466, {
    font,
    size: 13,
  });

  drawTextBoxLeft(page1, body.email, 35, 572, 431, {
    font,
    size: 12,
  });

  /* מין */
  drawSmallCheck(page1, body.gender === "male", 548, 490, font);
  drawSmallCheck(page1, body.gender === "female", 548, 474, font);

  /* מצב משפחתי */
  drawSmallCheck(page1, body.maritalStatus === "single", 488, 490, font);
  drawSmallCheck(page1, body.maritalStatus === "married", 488, 474, font);
  drawSmallCheck(page1, body.maritalStatus === "divorced", 432, 490, font);
  drawSmallCheck(page1, body.maritalStatus === "widowed", 432, 474, font);
  drawSmallCheck(page1, body.maritalStatus === "separated", 374, 474, font);

  /* תושב ישראל */
  drawSmallCheck(page1, body.residentIsrael === "yes", 337, 490, font);
  drawSmallCheck(page1, body.residentIsrael === "no", 337, 474, font);

  /* חבר קיבוץ / מושב שיתופי */
  drawSmallCheck(page1, body.kibbutzMember === "yes", 258, 490, font);
  drawSmallCheck(page1, body.kibbutzMember === "no", 258, 474, font);

  /* חבר קופת חולים */
  drawSmallCheck(page1, body.healthFundMember === "yes", 190, 490, font);
  drawSmallCheck(page1, body.healthFundMember === "no", 190, 474, font);
  drawTextBoxRight(page1, body.healthFundName, 35, 171, 454, {
    font,
    size: 12,
  });

  /* ג. ילדים שטרם מלאו להם 19 */
  const children = Array.isArray(body.children) ? body.children : [];

  children.slice(0, 10).forEach((child, index) => {
    const y = 390 - index * 28;

    drawTextBoxRight(page1, child.name, 487, 548, y, {
      font,
      size: 10,
    });

    drawTextBoxLeft(page1, splitId(child.idNumber), 357, 487, y, {
      font,
      size: 10,
    });

    drawCenteredText(page1, formatDateIL(child.birthDate), 255, y, 100, {
      font,
      size: 10,
    });
  });

  /* ד. פרטים על הכנסותיי ממעביד זה */
  drawCenteredText(page1, formatDateIL(body.workStartDate), 40, 372, 118, {
    font,
    size: 12,
  });

  drawSmallCheck(page1, Boolean(body.incomeType?.monthlySalary), 250, 394, font);
  drawSmallCheck(page1, Boolean(body.incomeType?.extraSalary), 250, 379, font);
  drawSmallCheck(page1, Boolean(body.incomeType?.partialSalary), 250, 364, font);
  drawSmallCheck(page1, Boolean(body.incomeType?.dailyWage), 250, 349, font);
  drawSmallCheck(page1, Boolean(body.incomeType?.allowance), 250, 334, font);
  drawSmallCheck(page1, Boolean(body.incomeType?.pension), 250, 319, font);

  /* ה. הכנסות אחרות */
  drawSmallCheck(page1, Boolean(body.otherIncome?.noOtherIncome), 248, 295, font);
  drawSmallCheck(page1, Boolean(body.otherIncome?.monthlySalary), 250, 266, font);
  drawSmallCheck(page1, Boolean(body.otherIncome?.extraSalary), 250, 251, font);
  drawSmallCheck(page1, Boolean(body.otherIncome?.partialSalary), 250, 236, font);
  drawSmallCheck(page1, Boolean(body.otherIncome?.dailyWage), 250, 221, font);
  drawSmallCheck(page1, Boolean(body.otherIncome?.allowance), 250, 206, font);
  drawSmallCheck(page1, Boolean(body.otherIncome?.pension), 250, 191, font);
  drawSmallCheck(page1, Boolean(body.otherIncome?.scholarship), 250, 176, font);

  /* ו. פרטי בן/בת זוג */
  drawTextBoxLeft(page1, splitId(body.spouse?.idNumber), 474, 572, 104, {
    font,
    size: 11,
  });

  drawTextBoxRight(page1, body.spouse?.lastName, 346, 474, 104, {
    font,
    size: 11,
  });

  drawTextBoxRight(page1, body.spouse?.firstName, 255, 346, 104, {
    font,
    size: 11,
  });

  drawCenteredText(page1, formatDateIL(body.spouse?.birthDate), 168, 104, 87, {
    font,
    size: 11,
  });

  drawCenteredText(page1, formatDateIL(body.spouse?.immigrationDate), 37, 104, 130, {
    font,
    size: 11,
  });

  /* =========================================================
     PAGE 2 — זיכויים / תיאום מס / הצהרה
  ========================================================= */

  if (page2) {
    drawTextBoxLeft(page2, splitId(body.idNumber), 105, 250, 815, {
      font,
      size: 12,
    });

    /* ח. פטור או זיכוי ממס */
    drawSmallCheck(page2, Boolean(getCredit(body, "resident")), 548, 792, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "disabled100")), 548, 765, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "settlement")), 548, 727, font);
    drawTextBoxRight(page2, getCredit(body, "settlementDate"), 305, 430, 727, {
      font,
      size: 11,
    });
    drawTextBoxRight(page2, getCredit(body, "settlementName"), 320, 515, 700, {
      font,
      size: 11,
    });

    drawSmallCheck(page2, Boolean(getCredit(body, "newImmigrant")), 548, 681, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "spouseNoIncome")), 548, 632, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "singleParent")), 548, 603, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "childrenCustody")), 548, 565, font);

    drawTextBoxLeft(page2, getCredit(body, "childrenBornThisYear"), 283, 340, 540, {
      font,
      size: 10,
    });

    drawTextBoxLeft(page2, getCredit(body, "childrenAgeOneToFive"), 283, 340, 522, {
      font,
      size: 10,
    });

    drawTextBoxLeft(page2, getCredit(body, "childrenAgeSixToSeventeen"), 283, 340, 504, {
      font,
      size: 10,
    });

    drawTextBoxLeft(page2, getCredit(body, "childrenAgeEighteen"), 283, 340, 486, {
      font,
      size: 10,
    });

    drawSmallCheck(page2, Boolean(getCredit(body, "specialChild")), 548, 435, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "alimony")), 548, 407, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "childrenUnder19")), 548, 379, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "soldier")), 548, 350, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "academic")), 548, 322, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "diploma")), 548, 295, font);

    /* ט. תיאום מס */
    drawSmallCheck(page2, Boolean(getCredit(body, "noIncomeThisYear")), 548, 254, font);

    drawSmallCheck(page2, Boolean(getCredit(body, "hasOtherIncomeForTaxCoordination")), 548, 222, font);

    /* י. הצהרה */
    drawCenteredText(page2, formatDateIL(body.signatureDate), 150, 154, 135, {
      font,
      size: 12,
    });

    const signatureDrawn = await drawSignatureImage(
      pdfDoc,
      page2,
      body.signatureDataUrl,
      38,
      146,
      105,
      28
    );

    if (!signatureDrawn) {
      drawTextBoxRight(page2, body.signatureText, 38, 145, 154, {
        font,
        size: 12,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    const employeeIdString = extractUserId(auth);
    const businessIdString = extractBusinessId(auth);

    const employeeObjectId = toObjectId(employeeIdString);
    const businessObjectId = toObjectId(businessIdString);

    if (!employeeObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
          message: "לא נמצאה הרשאת עובד תקינה",
        },
        { status: 401 }
      );
    }

    if (!R2_BUCKET_NAME) {
      return NextResponse.json(
        {
          success: false,
          error: "R2_BUCKET_MISSING",
          message: "חסר R2_BUCKET_NAME בהגדרות השרת",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as Form101Payload | null;

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "הטופס לא התקבל בצורה תקינה",
        },
        { status: 400 }
      );
    }

    const taxYear = normalizeTaxYear(body.taxYear);

    const existingActiveForm = await EmployeeForm101.findOne({
      employeeId: employeeObjectId,
      taxYear,
      documentType: "form101",
      status: { $in: ["uploaded", "approved"] },
    })
      .select("_id status fileUrl")
      .lean();

    if (existingActiveForm) {
      return NextResponse.json(
        {
          success: false,
          error: "FORM101_ALREADY_SUBMITTED",
          message:
            existingActiveForm.status === "approved"
              ? "טופס 101 כבר אושר ולא ניתן לשלוח מחדש"
              : "טופס 101 כבר נשלח וממתין לבדיקה",
          documentId: String(existingActiveForm._id),
          fileUrl: existingActiveForm.fileUrl,
        },
        { status: 409 }
      );
    }

    const pdfBuffer = await generateForm101Pdf({
      ...body,
      taxYear: String(taxYear),
    });

    const now = new Date();
    const timestamp = now.getTime();
    const randomId = crypto.randomUUID();

    const employeePart = sanitizeFilePart(employeeIdString, "employee");
    const originalFileName = `טופס-101-${taxYear}.pdf`;
    const storedFileName = `form101-${taxYear}-${employeePart}-${timestamp}-${randomId}.pdf`;

    const r2Key = [
      "employee-documents",
      employeeIdString,
      "form101",
      String(taxYear),
      storedFileName,
    ].join("/");

    const fileUrl = buildPrivateDocumentViewUrl(r2Key);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: r2Key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
        ContentDisposition: `inline; filename="${encodeURIComponent(storedFileName)}"`,
        CacheControl: "no-store",
      })
    );

    const document = await EmployeeForm101.create({
      employeeId: employeeObjectId,
      businessId: businessObjectId,
      documentType: "form101",

      originalFileName,
      storedFileName,
      r2Key,
      fileUrl,
      fileType: "application/pdf",
      fileSize: pdfBuffer.length,

      taxYear,
      status: "uploaded",
      rejectionReason: "",

      uploadedAt: now,
      approvedAt: null,
      rejectedAt: null,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="form-101-${taxYear}.pdf"`,
        "Cache-Control": "no-store",

        // כדי שאם תרצי בהמשך לקרוא מהפרונט, יהיה לך את הנתונים גם ב-Headers
        "X-Success": "true",
        "X-Document-Id": String(document._id),
        "X-File-Url": fileUrl,
        "X-R2-Key": r2Key,
      },
    });
  } catch (error) {
    console.error("GENERATE AND SAVE FORM 101 PDF ERROR:", error);

    const message =
      error instanceof Error ? error.message : "GENERATE_PDF_FAILED";

    return NextResponse.json(
      {
        success: false,
        error: "GENERATE_PDF_FAILED",
        message,
      },
      { status: 500 }
    );
  }
}
