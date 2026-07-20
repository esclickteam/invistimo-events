import { NextRequest, NextResponse } from "next/server";
import {
  LineCapStyle,
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import db from "@/lib/db";
import EmployeeAgreement from "@/models/EmployeeAgreement";
import EmployeeAgreementTemplate from "@/models/EmployeeAgreementTemplate";
import { isCheckboxChecked } from "@/lib/employeeSnapshot";
import { formatDateForPdf } from "@/lib/dateFieldFormat";
import { sortAgreementFieldsByOrder, toPositiveFieldOrder } from "@/lib/employeeAgreementFieldOrder";
import {
  getChoiceFieldBounds,
  isChoiceValueSelected,
  isTerminationOptionalReasonDetailLabel,
  normalizeChoiceOptions,
  prepareTerminationAgreementFields,
  resolveAgreementFieldType,
  type ChoiceOption,
} from "@/lib/employeeAgreementChoiceField";
import {
  isAgreementOptionMarked,
  resolveMarkedAgreementOptionIds,
} from "@/lib/employeeAgreementFieldValues";
import {
  buildTemplateTypeQuery,
  EMPLOYEE_AGREEMENT_TEMPLATE_TYPES,
  normalizeTemplateType,
} from "@/lib/employeeAgreementTemplateTypes";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FieldType = "text" | "date" | "signature" | "checkbox" | "choice";
type CoordinateMode = "percent" | "pixel";

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
  options?: ChoiceOption[];
  sourceCheckboxIds?: string[];
};

type SignAgreementBody = {
  employeeId?: string;
  businessId?: string;
  templateType?: string;
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

const DEFAULT_FILE_URL = "/templates/employee-agreement-invistimo.pdf";

const DESIGN_WIDTH = 700;
const DESIGN_HEIGHT = 900;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function cleanPositiveNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function safeFileName(value: string) {
  return value
    .replace(/[^\w\u0590-\u05FF.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
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

function preparePdfText(value: string) {
  return (
    cleanStr(value)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0] || ""
  );
}

async function loadHebrewFontBytes() {
  const possibleFontPaths = [
    path.join(process.cwd(), "public", "fonts", "NotoSansHebrew-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansHebrew-Medium.ttf"),
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
      // continue
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

async function loadTemplatePdfBytes(fileUrl: string) {
  const cleanUrl = cleanStr(fileUrl) || DEFAULT_FILE_URL;

  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    const res = await fetch(cleanUrl, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("לא ניתן לטעון את קובץ ה־PDF מהקישור של התבנית");
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const withoutQuery = cleanUrl.split("?")[0].split("#")[0];

  const relativePath = withoutQuery.startsWith("/")
    ? withoutQuery.slice(1)
    : withoutQuery;

  const absolutePath = path.join(process.cwd(), "public", relativePath);

  try {
    return await fs.readFile(absolutePath);
  } catch {
    throw new Error("לא נמצא קובץ PDF של התבנית");
  }
}

function normalizeField(raw: any, index = 0): TemplateField {
  const type = resolveAgreementFieldType(raw?.type, raw?.options) as FieldType;

  const x = cleanNumber(raw?.x, 0);
  const y = cleanNumber(raw?.y, 0);
  const options =
    type === "choice"
      ? normalizeChoiceOptions(
          raw?.options,
          Array.isArray(raw?.options) && raw.options.length > 0
            ? raw.options.length
            : 4,
          x || 38,
          y || 35,
        )
      : undefined;
  const bounds =
    type === "choice" && options ? getChoiceFieldBounds(options) : null;

  return {
    id: cleanStr(raw?.id),
    label:
      cleanStr(raw?.label) ||
      (type === "choice"
        ? "בחירה"
        : type === "checkbox"
          ? "תיבת סימון"
          : "שדה"),
    type,
    pageIndex: Math.max(0, cleanNumber(raw?.pageIndex, 0)),
    x: bounds?.x ?? x,
    y: bounds?.y ?? y,
    width:
      bounds?.width ??
      cleanPositiveNumber(
        raw?.width,
        type === "signature" ? 24 : type === "checkbox" ? 5 : 22,
      ),
    height:
      bounds?.height ??
      cleanPositiveNumber(
        raw?.height,
        type === "signature" ? 8 : type === "checkbox" ? 5 : 6,
      ),
    required: raw?.required !== false,
    order: toPositiveFieldOrder(raw?.order, index + 1),
    ...(options ? { options } : {}),
  };
}

function resolveCoordinateMode(
  template: any,
  fields: TemplateField[]
): CoordinateMode {
  const rawMode = cleanStr(template?.coordinateMode);

  if (rawMode === "pixel") return "pixel";
  if (rawMode === "percent") return "percent";

  const hasPixelLikeField = fields.some(
    (field) =>
      field.x > 100 ||
      field.y > 100 ||
      field.width > 100 ||
      field.height > 100
  );

  return hasPixelLikeField ? "pixel" : "percent";
}

function getLegacyValue(body: SignAgreementBody, field: TemplateField) {
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

function readBodyFieldValue(
  values: Record<string, unknown> | undefined,
  key: string,
) {
  if (!values || !key) return "";
  const raw = values[key];
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string") return raw.trim();
  return "";
}

function getFieldValue(body: SignAgreementBody, field: TemplateField) {
  const directValue = readBodyFieldValue(body.values, field.id);

  if (directValue) return directValue;

  return getLegacyValue(body, field);
}

function getSignatureValue(body: SignAgreementBody, field: TemplateField) {
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
  coordinateMode: CoordinateMode;
}) {
  const { field, pageWidth, pageHeight, coordinateMode } = options;

  if (coordinateMode === "percent") {
    const width = (field.width / 100) * pageWidth;
    const height = (field.height / 100) * pageHeight;

    const x = (field.x / 100) * pageWidth;
    const y = pageHeight - ((field.y + field.height) / 100) * pageHeight;

    return {
      x,
      y,
      width,
      height,
    };
  }

  const width = (field.width / DESIGN_WIDTH) * pageWidth;
  const height = (field.height / DESIGN_HEIGHT) * pageHeight;

  const x = (field.x / DESIGN_WIDTH) * pageWidth;
  const y = pageHeight - ((field.y + field.height) / DESIGN_HEIGHT) * pageHeight;

  return {
    x,
    y,
    width,
    height,
  };
}

function getFittedFontSize(options: {
  text: string;
  font: PDFFont;
  maxWidth: number;
  boxHeight: number;
}) {
  const { text, font, maxWidth, boxHeight } = options;

  let size = Math.max(8, Math.min(13, boxHeight * 0.48));

  while (size > 6) {
    const width = font.widthOfTextAtSize(text, size);

    if (width <= maxWidth) {
      return size;
    }

    size -= 0.5;
  }

  return 6;
}

function drawCheckInBox(options: {
  page: PDFPage;
  checked: boolean;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}) {
  if (!options.checked) return;

  const { page } = options;
  let { x, y, width, height } = options.box;

  // Tiny / zero boxes from bad template data still need a visible mark.
  const minSize = 9;
  if (width < minSize) {
    x -= (minSize - width) / 2;
    width = minSize;
  }
  if (height < minSize) {
    y -= (minSize - height) / 2;
    height = minSize;
  }

  const padX = width * 0.22;
  const padY = height * 0.2;
  const left = x + padX;
  const right = x + width - padX;
  const bottom = y + padY;
  const top = y + height - padY;
  const midX = left + (right - left) * 0.32;
  const midY = bottom + (top - bottom) * 0.15;
  const thickness = Math.max(1.6, Math.min(width, height) * 0.18);

  // Vector checkmark — avoids WinAnsi/"✓" encoding errors with StandardFonts.
  page.drawLine({
    start: { x: left, y: midY + (top - bottom) * 0.25 },
    end: { x: midX, y: midY },
    thickness,
    color: rgb(0, 0, 0),
    lineCap: LineCapStyle.Round,
  });
  page.drawLine({
    start: { x: midX, y: midY },
    end: { x: right, y: top },
    thickness,
    color: rgb(0, 0, 0),
    lineCap: LineCapStyle.Round,
  });
}

function drawTextInBox(options: {
  page: PDFPage;
  rawText: string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hebrewFont: PDFFont;
  fallbackFont: PDFFont;
}) {
  const { page, rawText, box, hebrewFont, fallbackFont } = options;

  const text = preparePdfText(rawText);

  if (!text) return;

  const isHebrew = hasHebrew(text);
  const font = isHebrew ? hebrewFont : fallbackFont;

  const paddingX = Math.max(2, box.width * 0.035);
  const maxTextWidth = Math.max(1, box.width - paddingX * 2);

  const size = getFittedFontSize({
    text,
    font,
    maxWidth: maxTextWidth,
    boxHeight: box.height,
  });

  const textWidth = font.widthOfTextAtSize(text, size);

  const x = isHebrew
    ? box.x + box.width - paddingX - textWidth
    : box.x + paddingX;

  const y = box.y + Math.max(2, (box.height - size) * 0.48);

  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: rgb(0.05, 0.09, 0.16),
  });
}

function buildFullNameForAgreement(
  body: SignAgreementBody,
  valuesToSave: Record<string, string>,
  fields: TemplateField[]
) {
  const explicitFullName = cleanStr(body.fullName);

  if (explicitFullName) return explicitFullName;

  const fullNameField = fields.find((field) => {
    const normalized = normalizeLabel(field.label);

    return (
      normalized === "שםמלא" ||
      normalized === "שםהעובד" ||
      normalized === "שםהעובדת" ||
      normalized === "שםעובד" ||
      normalized === "שםעובדת"
    );
  });

  if (fullNameField && valuesToSave[fullNameField.id]) {
    return valuesToSave[fullNameField.id];
  }

  return Object.values(valuesToSave).find(Boolean) || "";
}

function uploadSignedPdfToCloudinary(options: {
  pdfBuffer: Buffer;
  employeeId: string;
  businessId: string;
}) {
  const { pdfBuffer, employeeId, businessId } = options;

  if (!hasCloudinaryConfig()) {
    throw new Error("חסרה הגדרת Cloudinary ב־env");
  }

  const publicId = `signed-${safeFileName(employeeId)}-${Date.now()}`;

  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: `employee-agreements/${safeFileName(businessId)}`,
        public_id: publicId,
        format: "pdf",
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        const secureUrl = String(result?.secure_url || "");

        if (!secureUrl) {
          reject(new Error("Cloudinary לא החזיר קישור להסכם החתום"));
          return;
        }

        resolve(secureUrl);
      }
    );

    uploadStream.end(pdfBuffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const body = (await req.json().catch(() => null)) as SignAgreementBody | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: "בקשה לא תקינה" },
        { status: 400 }
      );
    }

    const auth = await getUserIdFromRequest(req);
    const authEmployeeId = cleanStr((auth as any)?.userId);
    const bodyEmployeeId = cleanStr(body.employeeId);
    const bodyBusinessId = cleanStr(body.businessId);

    // Always prefer the authenticated user so we never save under businessId.
    const employeeId = authEmployeeId || bodyEmployeeId;
    const businessId = bodyBusinessId;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: "צריך להתחבר מחדש כדי לחתום על ההסכם" },
        { status: 401 },
      );
    }

    if (!isValidObjectId(employeeId)) {
      return NextResponse.json(
        { success: false, error: "מזהה עובד לא תקין" },
        { status: 400 },
      );
    }

    if (
      authEmployeeId &&
      bodyEmployeeId &&
      authEmployeeId !== bodyEmployeeId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "לא ניתן לחתום עבור עובד אחר. יש להתחבר עם המשתמש של העובד.",
        },
        { status: 403 },
      );
    }

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    const templateType = normalizeTemplateType(body.templateType);
    const templateTypeQuery = buildTemplateTypeQuery(templateType);

    // Prefer exact employee+business match; fall back to employee-only like /current.
    let existingAssignment =
      businessId && isValidObjectId(businessId)
        ? await EmployeeAgreement.findOne({
            employeeId: employeeObjectId,
            businessId: new mongoose.Types.ObjectId(businessId),
            ...templateTypeQuery,
          })
            .sort({ updatedAt: -1, createdAt: -1 })
            .lean()
        : null;

    if (!existingAssignment) {
      existingAssignment = await EmployeeAgreement.findOne({
        employeeId: employeeObjectId,
        ...templateTypeQuery,
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();
    }

    let businessObjectId: mongoose.Types.ObjectId | null = null;
    const assignmentBusinessId = cleanStr(
      (existingAssignment as any)?.businessId,
    );
    if (
      assignmentBusinessId &&
      mongoose.Types.ObjectId.isValid(assignmentBusinessId)
    ) {
      businessObjectId = new mongoose.Types.ObjectId(assignmentBusinessId);
    } else if (businessId && isValidObjectId(businessId)) {
      businessObjectId = new mongoose.Types.ObjectId(businessId);
    }

    if (!businessObjectId) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה עסק תקין לחתימה" },
        { status: 400 },
      );
    }

    if (templateType === "termination_request") {
      const existingStatus = cleanStr((existingAssignment as any)?.status);

      if (!existingAssignment) {
        return NextResponse.json(
          {
            success: false,
            error: "בקשה לסיום העסקה לא נשלחה אליך לחתימה",
          },
          { status: 403 },
        );
      }

      if (!["pending", "rejected"].includes(existingStatus)) {
        return NextResponse.json(
          {
            success: false,
            error:
              existingStatus === "signed" || existingStatus === "approved"
                ? "בקשה לסיום העסקה כבר נחתמה. אם צריך לחתום שוב, האדמין צריך לשלוח מחדש."
                : "בקשה לסיום העסקה לא זמינה לחתימה כרגע",
          },
          { status: 403 },
        );
      }
    }

    let template = await EmployeeAgreementTemplate.findOne({
      isActive: true,
      businessId: businessObjectId,
      ...templateTypeQuery,
    })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    if (!template) {
      template = await EmployeeAgreementTemplate.findOne({
        isActive: true,
        businessId: null,
        ...templateTypeQuery,
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
      ? sortAgreementFieldsByOrder(
          ((template as any).fields as any[])
            .map((field, index) => normalizeField(field, index))
            .filter((field) => Boolean(field.id)),
        )
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

    const validationFields =
      templateType === EMPLOYEE_AGREEMENT_TEMPLATE_TYPES.TERMINATION
        ? (prepareTerminationAgreementFields(fields).fields as TemplateField[])
        : fields;

    for (const field of validationFields) {
      const isOptionalReasonDetail =
        templateType === EMPLOYEE_AGREEMENT_TEMPLATE_TYPES.TERMINATION &&
        isTerminationOptionalReasonDetailLabel(field.label) &&
        (field.type === "text" ||
          field.type === "checkbox" ||
          field.type === "choice");

      if (isOptionalReasonDetail) continue;
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

      if (field.type === "checkbox") {
        const value = getFieldValue(body, field);

        if (!isCheckboxChecked(value)) {
          return NextResponse.json(
            { success: false, error: `חסר שדה חובה: ${field.label}` },
            { status: 400 }
          );
        }

        continue;
      }

      if (field.type === "choice") {
        const sourceIds = field.sourceCheckboxIds || [];
        if (sourceIds.length > 0) {
          const selected = sourceIds.some((checkboxId) =>
            isCheckboxChecked(cleanStr((body.values || {})[checkboxId])),
          );

          if (!selected) {
            return NextResponse.json(
              { success: false, error: `חסר שדה חובה: ${field.label}` },
              { status: 400 }
            );
          }

          continue;
        }

        const value = getFieldValue(body, field);
        const selectedFromOptions = (field.options || []).some((option) => {
          const optionId = cleanStr(option.id);
          return (
            optionId === cleanStr(value) ||
            isCheckboxChecked(cleanStr((body.values || {})[optionId]))
          );
        });

        if (!isChoiceValueSelected(value, field.options) && !selectedFromOptions) {
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

    const templatePdfBytes = await loadTemplatePdfBytes(
      cleanStr((template as any).fileUrl) || DEFAULT_FILE_URL
    );

    const pdfDoc = await PDFDocument.load(templatePdfBytes);
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

    const hebrewFont = await pdfDoc.embedFont(fontBytes);
    const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();
    const coordinateMode = resolveCoordinateMode(template, fields);
    const markedOptionIds = resolveMarkedAgreementOptionIds(body.values, [
      ...fields,
      ...validationFields,
    ]);

    const valuesToSave: Record<string, string> = {};
    const signatureFieldIds: string[] = [];

    for (const field of fields) {
      const page = pages[field.pageIndex];

      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();

      const box = convertTemplateBoxToPdfBox({
        field,
        pageWidth,
        pageHeight,
        coordinateMode,
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

        signatureFieldIds.push(field.id);

        continue;
      }

      if (field.type === "checkbox") {
        const checked = isAgreementOptionMarked(
          markedOptionIds,
          body.values,
          field.id,
        );

        if (checked) {
          valuesToSave[field.id] = "true";
        }

        drawCheckInBox({
          page,
          checked,
          box,
        });

        continue;
      }

      if (field.type === "choice") {
        const rawValue = getFieldValue(body, field);
        const options = field.options || [];
        const selectedOptionId =
          options.find((option) =>
            isAgreementOptionMarked(
              markedOptionIds,
              body.values,
              option.id,
              field.id,
            ),
          )?.id || "";

        if (selectedOptionId) {
          valuesToSave[field.id] = selectedOptionId;
        } else if (isChoiceValueSelected(rawValue, options)) {
          valuesToSave[field.id] = String(rawValue).trim();
        }

        for (const option of options) {
          const optionBox = convertTemplateBoxToPdfBox({
            field: {
              ...field,
              x: option.x,
              y: option.y,
              width: option.width,
              height: option.height,
            },
            pageWidth,
            pageHeight,
            coordinateMode,
          });

          drawCheckInBox({
            page,
            checked: isAgreementOptionMarked(
              markedOptionIds,
              body.values,
              option.id,
              field.id,
            ),
            box: optionBox,
          });
        }

        continue;
      }

      const rawValue = getFieldValue(body, field);
      const value =
        field.type === "date" ? formatDateForPdf(rawValue) : rawValue;

      if (!rawValue) continue;

      valuesToSave[field.id] = rawValue;

      drawTextInBox({
        page,
        rawText: value,
        box,
        hebrewFont,
        fallbackFont,
      });
    }

    const signedPdfBytes = await pdfDoc.save();

    const resolvedBusinessId = String(businessObjectId);

    const signedFileUrl = await uploadSignedPdfToCloudinary({
      pdfBuffer: Buffer.from(signedPdfBytes),
      employeeId,
      businessId: resolvedBusinessId,
    });

    const fullNameToSave = buildFullNameForAgreement(
      body,
      valuesToSave,
      fields
    );

    const agreementPatch = {
      employeeId: employeeObjectId,
      businessId: businessObjectId,
      templateType,
      templateId: (template as any)._id,
      values: valuesToSave,

      fullName: fullNameToSave,
      idNumber: cleanStr(body.idNumber) || "",
      address: cleanStr(body.address) || "",
      phone: cleanStr(body.phone) || "",
      email: cleanStr(body.email) || "",
      agreementDate: body.agreementDate ? new Date(body.agreementDate) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      finalFullName: cleanStr(body.finalFullName),
      finalIdNumber: cleanStr(body.finalIdNumber),
      finalSignatureDate: body.finalSignatureDate
        ? new Date(body.finalSignatureDate)
        : null,

      signedFileUrl,
      status: "signed",
      signedAt: new Date(),
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: "",
      signatureFieldIds,
    };

    // lean() may return ObjectId — never use cleanStr() which only accepts strings.
    const assignmentId = String((existingAssignment as any)?._id || "").trim();
    let savedAgreement: any = null;

    // Always update the existing assignment by id when present — never create an
    // orphan row under businessId for termination requests.
    if (assignmentId && mongoose.Types.ObjectId.isValid(assignmentId)) {
      savedAgreement = await EmployeeAgreement.findByIdAndUpdate(
        new mongoose.Types.ObjectId(assignmentId),
        { $set: agreementPatch },
        { new: true },
      ).lean();
    }

    if (!savedAgreement && existingAssignment) {
      savedAgreement = await EmployeeAgreement.findOneAndUpdate(
        {
          employeeId: employeeObjectId,
          businessId: businessObjectId,
          ...templateTypeQuery,
          status: { $in: ["pending", "rejected"] },
        },
        { $set: agreementPatch },
        { new: true },
      ).lean();
    }

    if (
      !savedAgreement &&
      templateType !== EMPLOYEE_AGREEMENT_TEMPLATE_TYPES.TERMINATION
    ) {
      savedAgreement = await EmployeeAgreement.findOneAndUpdate(
        {
          employeeId: employeeObjectId,
          businessId: businessObjectId,
          ...templateTypeQuery,
        },
        { $set: agreementPatch },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      ).lean();
    }

    if (!savedAgreement) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאה בקשה פתוחה לעדכון לאחר החתימה",
        },
        { status: 404 },
      );
    }

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