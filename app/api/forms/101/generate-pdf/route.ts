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
import Form101Template from "@/models/Form101Template";
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
  scholarship?: boolean;
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

  /**
   * הערכים המדויקים שהעובד מילא לפי ה-key של כל שדה בתבנית.
   * זה המקור הראשי לציור ה-PDF.
   */
  formFieldValues?: Record<string, any>;

  /**
   * snapshot של התבנית שהעובד ראה בזמן המילוי.
   * מגיע מקובץ העובד, כדי שה-PDF לא ייפול לתבנית ישנה.
   */
  __form101TemplateConfig?: {
    id?: string;
    _id?: string;
    updatedAt?: string | Date | null;
    approvedAt?: string | Date | null;
    fields?: any;
    pageWidth?: number;
    pageHeight?: number;
  };

  [key: string]: any;
};

type FieldType = "text" | "digits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";
type DigitSpacingMode = "equal" | "group" | "custom";
type DigitGroupSizeMode = "auto" | "manual";

type FieldMapItem = {
  page: 1 | 2;
  section: string;
  order: number;
  enabled: boolean;
  isFixed?: boolean;
  fixedValue?: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  fontSize: number;
  digitGap: number | null;
  digitSpacingMode?: DigitSpacingMode;
  digitGaps?: number[]; // legacy only
  digitGroupSize?: number | null;
  digitGroupSizeMode?: DigitGroupSizeMode;
  digitGroupGap?: number | null;
  maxDigits: number | null;
  align: TextAlign;
};

type FieldMap = Record<string, FieldMapItem>;

type Form101TemplateConfig = {
  fields: FieldMap;
  pageWidth: number;
  pageHeight: number;
};

const DEFAULT_MAPPER_PAGE_WIDTH = 900;
const DEFAULT_MAPPER_PAGE_HEIGHT = 1280;


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

function formatDateDigits(value?: string) {
  const formatted = formatDateIL(value);
  const digits = onlyDigits(formatted);

  if (digits) return digits;

  return onlyDigits(value);
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

function normalizeFieldType(value: unknown): FieldType {
  const raw = clean(value);

  if (raw === "digits") return "digits";
  if (raw === "check") return "check";
  if (raw === "signature") return "signature";

  return "text";
}

function normalizeTextAlign(value: unknown): TextAlign {
  const raw = clean(value);

  if (raw === "left") return "left";
  if (raw === "center") return "center";

  return "right";
}

function normalizeFieldMapItem(rawField: any): FieldMapItem | null {
  if (!rawField || typeof rawField !== "object") return null;

  const page = Number(rawField.page) === 2 ? 2 : 1;
  const x = Number(rawField.x);
  const y = Number(rawField.y);
  const width = Number(rawField.width);
  const height = Number(rawField.height);
  const fontSize = Number(rawField.fontSize);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  return {
    page,
    section: clean(rawField.section) || "employee",
    order: Math.max(1, Number(rawField.order) || 1),
    enabled:
      typeof rawField.enabled === "boolean" ? rawField.enabled : true,
    isFixed: Boolean(rawField.isFixed),
    fixedValue: clean(rawField.fixedValue),
    label: clean(rawField.label),
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    type: normalizeFieldType(rawField.type),
    fontSize: Math.max(6, Number.isFinite(fontSize) ? fontSize : 14),
    digitGap:
      rawField.digitGap === null || rawField.digitGap === undefined
        ? null
        : Math.max(1, Number(rawField.digitGap) || 13),
    digitSpacingMode:
      rawField.digitSpacingMode === "group" || rawField.digitSpacingMode === "custom"
        ? "group"
        : "equal",
    digitGaps: Array.isArray(rawField.digitGaps)
      ? rawField.digitGaps
          .map((gap: any) => Math.max(1, Number(gap) || 13))
          .filter((gap: any) => Number.isFinite(gap))
      : [],
    digitGroupSize:
      rawField.digitGroupSize === null || rawField.digitGroupSize === undefined
        ? null
        : Math.max(1, Number(rawField.digitGroupSize) || 3),
    digitGroupSizeMode: rawField.digitGroupSizeMode === "manual" ? "manual" : "auto",
    digitGroupGap:
      rawField.digitGroupGap === null || rawField.digitGroupGap === undefined
        ? null
        : Math.max(0, Number(rawField.digitGroupGap) || 0),
    maxDigits:
      rawField.maxDigits === null || rawField.maxDigits === undefined
        ? null
        : Math.max(1, Number(rawField.maxDigits) || 1),
    align: normalizeTextAlign(rawField.align),
  };
}

function normalizeFieldMap(rawFields: any): FieldMap {
  const source =
    rawFields instanceof Map ? Object.fromEntries(rawFields) : rawFields || {};

  if (!source || typeof source !== "object") {
    return {};
  }

  const normalized: FieldMap = {};

  Object.entries(source).forEach(([key, value]) => {
    const fieldKey = clean(key);
    if (!fieldKey) return;

    const field = normalizeFieldMapItem(value);
    if (!field) return;

    normalized[fieldKey] = field;
  });

  return normalized;
}

function normalizeTemplateSize(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function templateConfigFromSnapshot(snapshot: any): Form101TemplateConfig | null {
  if (!snapshot || typeof snapshot !== "object") return null;

  const fields = normalizeFieldMap(snapshot.fields);
  if (!Object.keys(fields).length) return null;

  return {
    fields,
    pageWidth: normalizeTemplateSize(snapshot.pageWidth, DEFAULT_MAPPER_PAGE_WIDTH),
    pageHeight: normalizeTemplateSize(snapshot.pageHeight, DEFAULT_MAPPER_PAGE_HEIGHT),
  };
}

async function loadForm101TemplateConfig(): Promise<Form101TemplateConfig> {
  const template = await Form101Template.findOne({
    name: "default",
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  const fields = normalizeFieldMap((template as any)?.fields);

  if (!template || !Object.keys(fields).length) {
    throw new Error("FORM101_TEMPLATE_NOT_FOUND_OR_EMPTY: לא נמצאה תבנית 101 פעילה מהאדמין");
  }

  return {
    fields,
    pageWidth: normalizeTemplateSize((template as any).pageWidth, DEFAULT_MAPPER_PAGE_WIDTH),
    pageHeight: normalizeTemplateSize((template as any).pageHeight, DEFAULT_MAPPER_PAGE_HEIGHT),
  };
}

async function resolveForm101TemplateConfig(body: Form101Payload): Promise<Form101TemplateConfig> {
  // קודם משתמשים בדיוק בתבנית שהעובד טען מהאדמין במסך המילוי.
  // זה מונע מצב שבו ה-PDF נוצר ממפה ישנה/ברירת מחדל בזמן שהמסך מציג מפה אחרת.
  const snapshotConfig = templateConfigFromSnapshot(body.__form101TemplateConfig);
  if (snapshotConfig) return snapshotConfig;

  // אם מסיבה כלשהי לא נשלח snapshot, טוענים מה-DB של האדמין.
  // אין fallback למפה קשיחה, כדי לא לייצר PDF במיקומים שגויים.
  return loadForm101TemplateConfig();
}

function getTemplateSnapshotMeta(body: Form101Payload) {
  const snapshot = body.__form101TemplateConfig;

  const rawId = clean(snapshot?.id || snapshot?._id || "");
  const templateId =
    rawId && mongoose.Types.ObjectId.isValid(rawId)
      ? new mongoose.Types.ObjectId(rawId)
      : null;

  const rawUpdatedAt = snapshot?.updatedAt || snapshot?.approvedAt || null;
  const parsedUpdatedAt = rawUpdatedAt ? new Date(rawUpdatedAt) : null;

  return {
    templateId,
    templateUpdatedAt:
      parsedUpdatedAt && !Number.isNaN(parsedUpdatedAt.getTime())
        ? parsedUpdatedAt
        : null,
  };
}

function buildTemplateSnapshotForStorage(templateConfig: Form101TemplateConfig) {
  return {
    fields: templateConfig.fields,
    pageWidth: templateConfig.pageWidth,
    pageHeight: templateConfig.pageHeight,
  };
}

function buildFormFieldValuesForStorage(body: Form101Payload) {
  if (body.formFieldValues && typeof body.formFieldValues === "object") {
    return body.formFieldValues;
  }

  const values: Record<string, any> = {};

  Object.entries(body).forEach(([key, value]) => {
    if (key.startsWith("__")) return;

    if (
      [
        "incomeType",
        "otherIncome",
        "spouse",
        "children",
        "taxCredits",
      ].includes(key)
    ) {
      return;
    }

    values[key] = value;
  });

  return values;
}

function splitPhoneParts(value: unknown) {
  const digits = onlyDigits(value);

  return {
    prefix: digits.slice(0, 3),
    number: digits.slice(3),
  };
}

function getPdfVisibleBox(page: any) {
  const size = page.getSize();

  try {
    const cropBox = typeof page.getCropBox === "function" ? page.getCropBox() : null;

    if (
      cropBox &&
      Number.isFinite(Number(cropBox.x)) &&
      Number.isFinite(Number(cropBox.y)) &&
      Number.isFinite(Number(cropBox.width)) &&
      Number.isFinite(Number(cropBox.height)) &&
      Number(cropBox.width) > 0 &&
      Number(cropBox.height) > 0
    ) {
      return {
        x: Number(cropBox.x),
        y: Number(cropBox.y),
        width: Number(cropBox.width),
        height: Number(cropBox.height),
      };
    }
  } catch {
    // אם אין CropBox ממשיכים לפי גודל העמוד הרגיל.
  }

  return {
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
  };
}

function getMappedRect(
  page: any,
  field: FieldMapItem,
  templateConfig: Form101TemplateConfig
) {
  const visibleBox = getPdfVisibleBox(page);

  const mapperPageWidth =
    templateConfig.pageWidth > 0
      ? templateConfig.pageWidth
      : DEFAULT_MAPPER_PAGE_WIDTH;

  const mapperPageHeight =
    templateConfig.pageHeight > 0
      ? templateConfig.pageHeight
      : DEFAULT_MAPPER_PAGE_HEIGHT;

  const scaleX = visibleBox.width / mapperPageWidth;
  const scaleY = visibleBox.height / mapperPageHeight;

  const x = visibleBox.x + field.x * scaleX;
  const width = field.width * scaleX;
  const height = field.height * scaleY;

  return {
    x,
    y: visibleBox.y + visibleBox.height - (field.y + field.height) * scaleY,
    width,
    height,
    scaleX,
    scaleY,
    fontSize: Math.max(6, field.fontSize * scaleY),
  };
}

function getValueFromBody(body: Form101Payload, fieldKey: string): unknown {
  const directValues =
    body.formFieldValues && typeof body.formFieldValues === "object"
      ? body.formFieldValues
      : null;

  // חשוב: ה-PDF חייב לצייר את הערך המדויק שהעובד רואה וממלא במסך.
  // לכן קודם כל משתמשים ב-formFieldValues לפי key, ורק אם אין ערך כזה
  // נופלים למבנה הישן/הקשיח של payload.
  if (
    directValues &&
    Object.prototype.hasOwnProperty.call(directValues, fieldKey)
  ) {
    return directValues[fieldKey];
  }

  const children = Array.isArray(body.children) ? body.children : [];
  const childMatch = fieldKey.match(/^child(\d+)(Name|Id|BirthDate|Mark1|Mark2)$/);

  if (childMatch) {
    const childIndex = Number(childMatch[1]) - 1;
    const suffix = childMatch[2];
    const child = children[childIndex] || {};

    if (suffix === "Name") {
      return body.formFieldValues?.[fieldKey] ?? child.name;
    }

    if (suffix === "Id") {
      return splitId(body.formFieldValues?.[fieldKey] ?? child.idNumber);
    }

    if (suffix === "BirthDate") {
      return formatDateDigits(body.formFieldValues?.[fieldKey] ?? child.birthDate);
    }

    return Boolean(body.formFieldValues?.[fieldKey] ?? body[fieldKey]);
  }

  switch (fieldKey) {
    case "taxYear":
      return body.taxYear;

    case "employerName":
      return body.employerName;
    case "employerAddress":
      return body.employerAddress;
    case "employerPhone":
      return body.employerPhone;
    case "employerFileNumber":
      return body.employerFileNumber;

    case "idNumber":
    case "page2IdNumber":
      return splitId(body.idNumber);
    case "lastName":
      return body.lastName;
    case "firstName":
      return body.firstName;
    case "birthDate":
      return formatDateDigits(body.birthDate);
    case "immigrationDate":
      return formatDateDigits(body.immigrationDate);

    case "street":
      return body.street;
    case "houseNumber":
      return body.houseNumber;
    case "city":
      return body.city;
    case "postalCode":
      return body.postalCode;
    case "phone":
      return onlyDigits(body.phone);
    case "phonePrefix":
      return onlyDigits(body.phonePrefix || splitPhoneParts(body.phone).prefix);
    case "phoneNumber":
      return onlyDigits(body.phoneNumber || splitPhoneParts(body.phone).number);
    case "mobile":
      return onlyDigits(body.mobile);
    case "mobilePrefix":
      return onlyDigits(body.mobilePrefix || splitPhoneParts(body.mobile).prefix);
    case "mobileNumber":
      return onlyDigits(body.mobileNumber || splitPhoneParts(body.mobile).number);
    case "email":
      return body.email;

    case "genderMale":
      return body.gender === "male";
    case "genderFemale":
      return body.gender === "female";

    case "maritalSingle":
      return body.maritalStatus === "single";
    case "maritalMarried":
      return body.maritalStatus === "married";
    case "maritalDivorced":
      return body.maritalStatus === "divorced";
    case "maritalWidowed":
      return body.maritalStatus === "widowed";
    case "customField1782075946735":
      return body.maritalStatus === "separated";

    case "residentYes":
      return body.residentIsrael === "yes";
    case "residentNo":
      return body.residentIsrael === "no";

    case "kibbutzYes":
      return body.kibbutzMember === "yes";
    case "kibbutzNo":
      return body.kibbutzMember === "no";

    case "healthFundYes":
      return body.healthFundMember === "yes";
    case "customField1782076968515":
      return body.healthFundMember === "no";
    case "healthFundName":
      return body.healthFundName;

    case "child1Name":
      return children[0]?.name;
    case "child1Id":
      return splitId(children[0]?.idNumber);
    case "child1BirthDate":
      return formatDateDigits(children[0]?.birthDate);

    case "workStartDate":
      return formatDateDigits(body.workStartDate);

    case "incomeMonthlySalary":
      return Boolean(body.incomeType?.monthlySalary);
    case "incomeExtraSalary":
      return Boolean(body.incomeType?.extraSalary);
    case "incomePartialSalary":
      return Boolean(body.incomeType?.partialSalary);
    case "incomeDailyWage":
      return Boolean(body.incomeType?.dailyWage);
    case "incomeAllowance":
      return Boolean(body.incomeType?.allowance);
    case "incomeScholarship":
      return Boolean(body.incomeType?.scholarship);

    case "otherNoIncome":
      return Boolean(body.otherIncome?.noOtherIncome);
    case "otherHasIncome":
      return !body.otherIncome?.noOtherIncome && Boolean(
        body.otherIncome?.monthlySalary ||
          body.otherIncome?.extraSalary ||
          body.otherIncome?.partialSalary ||
          body.otherIncome?.dailyWage ||
          body.otherIncome?.allowance ||
          body.otherIncome?.pension ||
          body.otherIncome?.scholarship
      );

    case "spouseId":
      return splitId(body.spouse?.idNumber);
    case "spouseLastName":
      return body.spouse?.lastName;
    case "spouseFirstName":
      return body.spouse?.firstName;

    case "creditResident":
      return Boolean(getCredit(body, "resident"));
    case "creditDisabled":
      return Boolean(getCredit(body, "disabled100"));
    case "creditSettlement":
      return Boolean(getCredit(body, "settlement"));
    case "creditNewImmigrant":
      return Boolean(getCredit(body, "newImmigrant"));
    case "creditSingleParent":
      return Boolean(getCredit(body, "singleParent"));
    case "creditChildrenCustody":
      return Boolean(getCredit(body, "childrenCustody"));
    case "creditSoldier":
      return Boolean(getCredit(body, "soldier"));
    case "creditAcademic":
      return Boolean(getCredit(body, "academic"));

    case "taxNoIncome":
      return Boolean(getCredit(body, "noIncomeThisYear"));
    case "taxHasOtherIncome":
      return Boolean(getCredit(body, "hasOtherIncomeForTaxCoordination"));

    case "signatureDate":
      return formatDateDigits(body.signatureDate);
    case "signature":
      return body.signatureDataUrl || body.signatureText;

    default:
      return body.formFieldValues?.[fieldKey] ?? body[fieldKey];
  }
}

function getFieldValue(body: Form101Payload, fieldKey: string, field: FieldMapItem) {
  if (field.isFixed) {
    return field.fixedValue || "";
  }

  return getValueFromBody(body, fieldKey);
}

function hasValue(value: unknown, type: FieldType) {
  if (type === "check") return Boolean(value);
  return Boolean(clean(value));
}

function drawTextInRect(
  page: any,
  text: unknown,
  rect: { x: number; y: number; width: number; height: number; fontSize: number },
  field: FieldMapItem,
  font: any
) {
  const value = clean(text);
  if (!value) return;

  const padding = 2;
  const size = rect.fontSize;
  const textWidth = font.widthOfTextAtSize(value, size);
  const maxX = rect.x + rect.width - padding;

  let x = rect.x + padding;

  if (field.align === "center") {
    x = rect.x + Math.max((rect.width - textWidth) / 2, padding);
  }

  if (field.align === "right") {
    x = Math.max(maxX - textWidth, rect.x + padding);
  }

  const y = rect.y + Math.max((rect.height - size) / 2, 0) + 1;

  page.drawText(value, {
    x,
    y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

function getBaseDigitCellWidth(field: FieldMapItem, scaleX: number) {
  return Math.max(1, Number(field.digitGap || 10)) * scaleX;
}

function getAutoDigitGroupSize(value: unknown, fallback: number) {
  const digits = onlyDigits(value);

  if (!digits) return fallback;

  if (digits.startsWith("05")) return 3;
  if (digits.startsWith("077") || digits.startsWith("073")) return 3;
  if (digits.length === 10) return 3;

  if (
    digits.length === 9 &&
    (digits.startsWith("02") ||
      digits.startsWith("03") ||
      digits.startsWith("04") ||
      digits.startsWith("08") ||
      digits.startsWith("09"))
  ) {
    return 2;
  }

  return fallback;
}

function getResolvedDigitGroupSize(field: FieldMapItem, value: unknown) {
  const fallback = Math.max(1, Number(field.digitGroupSize || 3));

  if (field.digitGroupSizeMode === "manual") {
    return fallback;
  }

  return getAutoDigitGroupSize(value, fallback);
}

function getGroupGapAfterDigit(
  field: FieldMapItem,
  index: number,
  scaleX: number,
  value: unknown
) {
  if (field.digitSpacingMode !== "group") return 0;

  const groupSize = getResolvedDigitGroupSize(field, value);
  if (index !== groupSize - 1) return 0;

  return Math.max(0, Number(field.digitGroupGap || 0)) * scaleX;
}

function drawDigitsInRect(
  page: any,
  text: unknown,
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX: number;
    fontSize: number;
  },
  field: FieldMapItem,
  font: any
) {
  const maxDigits = field.maxDigits || undefined;
  const digits = onlyDigits(text).slice(0, maxDigits);

  if (!digits) return;

  const size = rect.fontSize;
  const digitArray = digits.split("");
  const baseCellWidth = getBaseDigitCellWidth(field, rect.scaleX);

  const totalWidth = Math.max(
    digitArray.reduce((sum, _digit, index) => {
      return sum + baseCellWidth + getGroupGapAfterDigit(field, index, rect.scaleX, digits);
    }, 0),
    1
  );

  let startX = rect.x;

  if (field.align === "center") {
    startX = rect.x + Math.max((rect.width - totalWidth) / 2, 0);
  }

  if (field.align === "right") {
    startX = rect.x + Math.max(rect.width - totalWidth, 0);
  }

  const y = rect.y + Math.max((rect.height - size) / 2, 0) + 1;

  let cursorX = startX;

  digitArray.forEach((digit, index) => {
    const digitWidth = font.widthOfTextAtSize(digit, size);

    page.drawText(digit, {
      x: cursorX + Math.max((baseCellWidth - digitWidth) / 2, 0),
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });

    cursorX += baseCellWidth + getGroupGapAfterDigit(field, index, rect.scaleX, digits);
  });
}

function drawCheckInRect(
  page: any,
  checked: unknown,
  rect: { x: number; y: number; width: number; height: number; fontSize: number },
  font: any
) {
  if (!checked) return;

  const value = "✓";
  const size = Math.max(8, rect.fontSize);
  const textWidth = font.widthOfTextAtSize(value, size);

  page.drawText(value, {
    x: rect.x + Math.max((rect.width - textWidth) / 2, 0),
    y: rect.y + Math.max((rect.height - size) / 2, 0) + 1,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

async function drawField(
  pdfDoc: PDFDocument,
  pages: any[],
  fieldKey: string,
  field: FieldMapItem,
  body: Form101Payload,
  font: any,
  templateConfig: Form101TemplateConfig
) {
  if (!field.enabled) return;

  const page = pages[field.page - 1];
  if (!page) return;

  const value = getFieldValue(body, fieldKey, field);

  if (!hasValue(value, field.type)) return;

  const rect = getMappedRect(page, field, templateConfig);

  if (field.type === "signature") {
    const signatureDrawn = await drawSignatureImage(
      pdfDoc,
      page,
      body.signatureDataUrl,
      rect.x,
      rect.y,
      rect.width,
      rect.height
    );

    if (!signatureDrawn) {
      drawTextInRect(page, body.signatureText || value, rect, field, font);
    }

    return;
  }

  if (field.type === "check") {
    drawCheckInRect(page, value, rect, font);
    return;
  }

  if (field.type === "digits") {
    drawDigitsInRect(page, value, rect, field, font);
    return;
  }

  drawTextInRect(page, value, rect, field, font);
}

async function generateForm101Pdf(
  body: Form101Payload,
  templateConfig: Form101TemplateConfig
) {
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

  /**
   * חשוב:
   * לא יוצרים PDF חדש ולא משנים גודל עמוד.
   * טוענים את טופס 101 המקורי, ומציירים עליו את כל השדות שהוגדרו באדמין.
   */
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await loadHebrewFont(pdfDoc);
  const pages = pdfDoc.getPages();

  if (!pages.length) {
    throw new Error("INVALID_TEMPLATE_PDF");
  }

  const fields = Object.entries(templateConfig.fields)
    .filter(([, field]) => field.enabled)
    .sort(([, a], [, b]) => a.order - b.order) as [string, FieldMapItem][];

  for (const [fieldKey, field] of fields) {
    await drawField(
      pdfDoc,
      pages,
      fieldKey,
      field,
      body,
      font,
      templateConfig
    );
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

    const bodyForPdf: Form101Payload = {
      ...body,
      taxYear: String(taxYear),
    };

    const templateConfig = await resolveForm101TemplateConfig(bodyForPdf);
    const templateSnapshot = buildTemplateSnapshotForStorage(templateConfig);
    const templateMeta = getTemplateSnapshotMeta(bodyForPdf);
    const formFieldValues = buildFormFieldValuesForStorage(bodyForPdf);

    const pdfBuffer = await generateForm101Pdf(bodyForPdf, templateConfig);

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

      /**
       * שומרים את מה שהעובד מילא ואת התבנית המדויקת של אותו רגע.
       * כך צפייה/ייצוא בעתיד לא יזוזו גם אם האדמין משנה תבנית.
       */
      formFieldValues,
      templateSnapshot,
      templateId: templateMeta.templateId,
      templateUpdatedAt: templateMeta.templateUpdatedAt,

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
