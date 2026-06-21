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
      authResult.sub ||
      authResult.userIdFromToken ||
      authResult.user?._id ||
      authResult.user?.id ||
      authResult.user?.userId ||
      authResult.user?.sub ||
      ""
  );
}

function extractBusinessId(authResult: any) {
  if (!authResult || typeof authResult === "string") return "";

  return clean(
    authResult.businessId ||
      authResult.business?._id ||
      authResult.business?.id ||
      authResult.user?.businessId ||
      authResult.user?.business?._id ||
      authResult.user?.business?.id ||
      ""
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

  /*
    חשוב:
    הקואורדינטות מותאמות לטופס PDF בגודל A4.
    אם שדה מסוים זז קצת — משנים רק x/y של אותו שדה.
  */

  /* =========================================================
     PAGE 1 — כרטיס עובד
  ========================================================= */

  drawCenteredText(page1, body.taxYear || new Date().getFullYear(), 260, 707, 85, {
    font,
    size: 18,
  });

  /* א. פרטי המעסיק */
  drawText(page1, body.employerName, 424, 616, {
    font,
    size: 13,
    maxWidth: 120,
  });

  drawText(page1, body.employerAddress, 300, 616, {
    font,
    size: 11,
    maxWidth: 120,
  });

  drawText(page1, body.employerPhone, 155, 616, {
    font,
    size: 12,
    maxWidth: 100,
  });

  drawText(page1, body.employerFileNumber, 52, 616, {
    font,
    size: 13,
    maxWidth: 95,
  });

  /* ב. פרטי העובד/ת */
  drawText(page1, splitId(body.idNumber), 462, 548, {
    font,
    size: 13,
    maxWidth: 95,
  });

  drawText(page1, body.lastName, 363, 548, {
    font,
    size: 13,
    maxWidth: 85,
  });

  drawText(page1, body.firstName, 286, 548, {
    font,
    size: 13,
    maxWidth: 80,
  });

  drawText(page1, formatDateIL(body.birthDate), 210, 548, {
    font,
    size: 12,
    maxWidth: 72,
  });

  drawText(page1, formatDateIL(body.immigrationDate), 133, 548, {
    font,
    size: 12,
    maxWidth: 72,
  });

  drawText(page1, body.street, 352, 510, {
    font,
    size: 12,
    maxWidth: 100,
  });

  drawText(page1, body.houseNumber, 292, 510, {
    font,
    size: 12,
    maxWidth: 45,
  });

  drawText(page1, body.city, 214, 510, {
    font,
    size: 12,
    maxWidth: 72,
  });

  drawText(page1, body.postalCode, 141, 510, {
    font,
    size: 12,
    maxWidth: 60,
  });

  drawText(page1, body.mobile, 323, 465, {
    font,
    size: 13,
    maxWidth: 100,
  });

  drawText(page1, body.phone, 238, 465, {
    font,
    size: 13,
    maxWidth: 80,
  });

  drawText(page1, body.email, 70, 465, {
    font,
    size: 12,
    maxWidth: 160,
  });

  /* מין */
  drawCheck(page1, body.gender === "male", 535, 491, font);
  drawCheck(page1, body.gender === "female", 535, 476, font);

  /* מצב משפחתי */
  drawCheck(page1, body.maritalStatus === "single", 480, 491, font);
  drawCheck(page1, body.maritalStatus === "married", 480, 476, font);
  drawCheck(page1, body.maritalStatus === "divorced", 427, 491, font);
  drawCheck(page1, body.maritalStatus === "widowed", 427, 476, font);
  drawCheck(page1, body.maritalStatus === "separated", 375, 476, font);

  /* תושב ישראל */
  drawCheck(page1, body.residentIsrael === "yes", 337, 490, font);
  drawCheck(page1, body.residentIsrael === "no", 337, 475, font);

  /* חבר קיבוץ / מושב שיתופי */
  drawCheck(page1, body.kibbutzMember === "yes", 261, 490, font);
  drawCheck(page1, body.kibbutzMember === "no", 261, 475, font);

  /* חבר קופת חולים */
  drawCheck(page1, body.healthFundMember === "yes", 186, 490, font);
  drawCheck(page1, body.healthFundMember === "no", 186, 475, font);
  drawText(page1, body.healthFundName, 92, 477, {
    font,
    size: 12,
    maxWidth: 80,
  });

  /* ג. ילדים שמלאו להם 19 */
  const children = Array.isArray(body.children) ? body.children : [];

  children.slice(0, 10).forEach((child, index) => {
    const y = 377 - index * 28;

    drawText(page1, child.name, 475, y, {
      font,
      size: 10,
      maxWidth: 80,
    });

    drawText(page1, splitId(child.idNumber), 352, y, {
      font,
      size: 10,
      maxWidth: 90,
    });

    drawText(page1, formatDateIL(child.birthDate), 242, y, {
      font,
      size: 10,
      maxWidth: 80,
    });
  });

  /* ד. הכנסות ממעסיק זה */
  drawText(page1, formatDateIL(body.workStartDate), 405, 352, {
    font,
    size: 12,
    maxWidth: 80,
  });

  drawCheck(page1, Boolean(body.incomeType?.monthlySalary), 300, 383, font);
  drawCheck(page1, Boolean(body.incomeType?.extraSalary), 300, 368, font);
  drawCheck(page1, Boolean(body.incomeType?.partialSalary), 300, 353, font);
  drawCheck(page1, Boolean(body.incomeType?.dailyWage), 300, 338, font);
  drawCheck(page1, Boolean(body.incomeType?.allowance), 300, 323, font);
  drawCheck(page1, Boolean(body.incomeType?.pension), 300, 308, font);

  /* ה. הכנסות אחרות */
  drawCheck(page1, Boolean(body.otherIncome?.noOtherIncome), 536, 264, font);
  drawCheck(page1, Boolean(body.otherIncome?.monthlySalary), 300, 247, font);
  drawCheck(page1, Boolean(body.otherIncome?.extraSalary), 300, 232, font);
  drawCheck(page1, Boolean(body.otherIncome?.partialSalary), 300, 217, font);
  drawCheck(page1, Boolean(body.otherIncome?.dailyWage), 300, 202, font);
  drawCheck(page1, Boolean(body.otherIncome?.allowance), 300, 187, font);
  drawCheck(page1, Boolean(body.otherIncome?.scholarship), 300, 172, font);

  /* ו. פרטי בן/בת זוג */
  drawText(page1, splitId(body.spouse?.idNumber), 462, 70, {
    font,
    size: 11,
    maxWidth: 90,
  });

  drawText(page1, body.spouse?.lastName, 360, 70, {
    font,
    size: 11,
    maxWidth: 85,
  });

  drawText(page1, body.spouse?.firstName, 285, 70, {
    font,
    size: 11,
    maxWidth: 75,
  });

  drawText(page1, formatDateIL(body.spouse?.birthDate), 205, 70, {
    font,
    size: 11,
    maxWidth: 75,
  });

  drawText(page1, formatDateIL(body.spouse?.immigrationDate), 125, 70, {
    font,
    size: 11,
    maxWidth: 75,
  });

  /* =========================================================
     PAGE 2 — זיכויים / תיאום מס / הצהרה
  ========================================================= */

  if (page2) {
    /* ח. פטור או זיכוי ממס */
    drawCheck(page2, Boolean(getCredit(body, "resident")), 548, 752, font);

    drawCheck(page2, Boolean(getCredit(body, "disabled100")), 548, 715, font);

    drawCheck(page2, Boolean(getCredit(body, "settlement")), 548, 668, font);
    drawText(page2, getCredit(body, "settlementDate"), 382, 669, {
      font,
      size: 11,
      maxWidth: 75,
    });
    drawText(page2, getCredit(body, "settlementName"), 260, 669, {
      font,
      size: 11,
      maxWidth: 100,
    });

    drawCheck(page2, Boolean(getCredit(body, "newImmigrant")), 548, 626, font);

    drawCheck(
      page2,
      Boolean(getCredit(body, "spouseNoIncome")),
      548,
      582,
      font
    );

    drawCheck(page2, Boolean(getCredit(body, "singleParent")), 548, 542, font);

    drawCheck(
      page2,
      Boolean(getCredit(body, "childrenCustody")),
      548,
      500,
      font
    );

    drawText(page2, getCredit(body, "childrenBornThisYear"), 375, 479, {
      font,
      size: 11,
    });

    drawText(page2, getCredit(body, "childrenAgeOneToFive"), 375, 461, {
      font,
      size: 11,
    });

    drawText(page2, getCredit(body, "childrenAgeSixToSeventeen"), 375, 443, {
      font,
      size: 11,
    });

    drawText(page2, getCredit(body, "childrenAgeEighteen"), 375, 425, {
      font,
      size: 11,
    });

    drawCheck(page2, Boolean(getCredit(body, "specialChild")), 548, 424, font);

    drawCheck(page2, Boolean(getCredit(body, "alimony")), 548, 371, font);

    drawCheck(
      page2,
      Boolean(getCredit(body, "childrenUnder19")),
      548,
      332,
      font
    );

    drawCheck(page2, Boolean(getCredit(body, "soldier")), 548, 288, font);

    drawCheck(page2, Boolean(getCredit(body, "academic")), 548, 248, font);

    drawCheck(page2, Boolean(getCredit(body, "diploma")), 548, 208, font);

    /* ט. תיאום מס */
    drawCheck(
      page2,
      Boolean(getCredit(body, "noIncomeThisYear")),
      548,
      143,
      font
    );

    drawCheck(
      page2,
      Boolean(getCredit(body, "hasOtherIncomeForTaxCoordination")),
      548,
      105,
      font
    );

    /* י. הצהרה */
    drawText(page2, formatDateIL(body.signatureDate), 395, 42, {
      font,
      size: 12,
    });

    const signatureDrawn = await drawSignatureImage(
      pdfDoc,
      page2,
      body.signatureDataUrl,
      190,
      30,
      135,
      34
    );

    if (!signatureDrawn) {
      drawText(page2, body.signatureText, 205, 42, {
        font,
        size: 13,
        maxWidth: 120,
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
