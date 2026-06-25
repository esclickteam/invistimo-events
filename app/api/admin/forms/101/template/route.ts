import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import User from "@/models/User";
import Form101Template from "@/models/Form101Template";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FieldType = "text" | "digits" | "check" | "signature";
type TextAlign = "right" | "left" | "center";
type DigitSpacingMode = "equal" | "group" | "custom" | "date";
type DigitGroupSizeMode = "auto" | "manual";
type PageFileType = "image" | "pdf";
type CoordinateMode = "pixels" | "percent";

type FieldConfig = {
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
  digitGap?: number | null;
  digitSpacingMode?: DigitSpacingMode;
  digitGaps?: number[];
  digitGroupSize?: number | null;
  digitGroupSizeMode?: DigitGroupSizeMode;
  digitGroupGap?: number | null;
  maxDigits?: number | null;
  align?: TextAlign;
  dependsOnKey?: string;
  showWhenValue?: string;
};

type TemplatePage = {
  pageIndex: number;
  pageNumber: 1 | 2;
  url: string;
  imageUrl: string;
  name: string;
  type: PageFileType;
};

const DEFAULT_FILE_URL = "/forms/tofes-101.pdf";
const DEFAULT_FILE_NAME = "tofes-101.pdf";
const PAGE_WIDTH = 900;
const PAGE_HEIGHT = 1280;
const PAGE_COUNT = 2;

function extractUserId(authResult: any) {
  if (!authResult) return "";

  if (typeof authResult === "string") {
    return authResult;
  }

  return String(
    authResult.userId ||
      authResult.id ||
      authResult._id ||
      authResult.sub ||
      ""
  );
}

async function requireAdmin(req: NextRequest) {
  const authResult = await getUserIdFromRequest(req);
  const userId = extractUserId(authResult);

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await User.findById(userId).lean();

  if (!user) return null;

  const role = String((user as any).role || "").toLowerCase();

  if (role !== "admin") {
    return null;
  }

  return user;
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function cleanNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeCoordinateMode(value: unknown): CoordinateMode {
  return cleanString(value) === "percent" ? "percent" : "pixels";
}

function normalizePageFileType(value: unknown): PageFileType {
  return cleanString(value) === "pdf" ? "pdf" : "image";
}

function normalizeAlign(value: unknown): TextAlign {
  const raw = cleanString(value);

  if (raw === "left") return "left";
  if (raw === "center") return "center";

  return "right";
}

function normalizeDigitSpacingMode(value: unknown): DigitSpacingMode {
  const raw = cleanString(value);

  if (raw === "group") return "group";
  if (raw === "custom") return "custom";
  if (raw === "date") return "date";

  return "equal";
}

function normalizeDigitGaps(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => Math.max(0, cleanNumber(item, 0)))
    .filter((item) => Number.isFinite(item));
}

function normalizeType(value: unknown): FieldType {
  const raw = cleanString(value);

  if (raw === "digits") return "digits";
  if (raw === "check") return "check";
  if (raw === "signature") return "signature";

  return "text";
}

function normalizePage(value: unknown): 1 | 2 {
  return Number(value) === 2 ? 2 : 1;
}

function normalizeField(field: any): FieldConfig {
  return {
    page: normalizePage(field?.page),
    section: cleanString(field?.section) || "employee",
    order: Math.max(1, cleanNumber(field?.order, 1)),
    enabled: typeof field?.enabled === "boolean" ? field.enabled : true,
    isFixed: Boolean(field?.isFixed),
    fixedValue: cleanString(field?.fixedValue),
    label: cleanString(field?.label),
    x: cleanNumber(field?.x, 0),
    y: cleanNumber(field?.y, 0),
    width: Math.max(1, cleanNumber(field?.width, 20)),
    height: Math.max(1, cleanNumber(field?.height, 20)),
    type: normalizeType(field?.type),
    fontSize: Math.max(6, cleanNumber(field?.fontSize, 14)),
    digitGap:
      field?.digitGap === null || field?.digitGap === undefined
        ? null
        : Math.max(0, cleanNumber(field?.digitGap, 13)),
    digitSpacingMode: normalizeDigitSpacingMode(field?.digitSpacingMode),
    digitGaps: normalizeDigitGaps(field?.digitGaps),
    digitGroupSize:
      field?.digitGroupSize === null || field?.digitGroupSize === undefined
        ? null
        : Math.max(1, cleanNumber(field?.digitGroupSize, 3)),
    digitGroupSizeMode: field?.digitGroupSizeMode === "manual" ? "manual" : "auto",
    digitGroupGap:
      field?.digitGroupGap === null || field?.digitGroupGap === undefined
        ? null
        : Math.max(0, cleanNumber(field?.digitGroupGap, 0)),
    maxDigits:
      field?.maxDigits === null || field?.maxDigits === undefined
        ? null
        : Math.max(1, cleanNumber(field?.maxDigits, 1)),
    align: normalizeAlign(field?.align),
    dependsOnKey: cleanString(field?.dependsOnKey),
    showWhenValue: cleanString(field?.showWhenValue),
  };
}

function normalizeFieldsMap(fieldsInput: any) {
  const fields = fieldsInput && typeof fieldsInput === "object" ? fieldsInput : {};
  const normalized: Record<string, FieldConfig> = {};

  Object.entries(fields).forEach(([key, value]) => {
    const cleanKey = cleanString(key);

    if (!cleanKey) return;

    normalized[cleanKey] = normalizeField(value);
  });

  return normalized;
}

function buildDefaultPages(fileUrl = DEFAULT_FILE_URL): TemplatePage[] {
  return [1, 2].map((pageNumber) => ({
    pageIndex: pageNumber - 1,
    pageNumber: pageNumber as 1 | 2,
    url: fileUrl,
    imageUrl: "",
    name: `עמוד ${pageNumber}`,
    type: "pdf" as PageFileType,
  }));
}

function normalizePages(pagesInput: any, fileUrl: string): TemplatePage[] {
  const rawPages = Array.isArray(pagesInput) ? pagesInput : [];

  if (!rawPages.length) {
    return buildDefaultPages(fileUrl);
  }

  const normalized = rawPages
    .map((page: any, index: number): TemplatePage => {
      const rawPageNumber =
        page?.pageNumber !== undefined
          ? page.pageNumber
          : page?.pageIndex !== undefined
            ? Number(page.pageIndex) + 1
            : index + 1;

      const pageNumber = normalizePage(rawPageNumber);

      return {
        pageIndex: pageNumber - 1,
        pageNumber,
        url: cleanString(page?.url) || fileUrl || DEFAULT_FILE_URL,
        imageUrl: cleanString(page?.imageUrl),
        name: cleanString(page?.name) || `עמוד ${pageNumber}`,
        type: normalizePageFileType(page?.type),
      };
    })
    .filter((page) => page.pageNumber === 1 || page.pageNumber === 2);

  const byPage = new Map<number, TemplatePage>();
  normalized.forEach((page) => byPage.set(page.pageNumber, page));

  [1, 2].forEach((pageNumber) => {
    if (!byPage.has(pageNumber)) {
      byPage.set(pageNumber, {
        pageIndex: pageNumber - 1,
        pageNumber: pageNumber as 1 | 2,
        url: fileUrl || DEFAULT_FILE_URL,
        imageUrl: "",
        name: `עמוד ${pageNumber}`,
        type: "pdf",
      });
    }
  });

  return Array.from(byPage.values()).sort((a, b) => a.pageNumber - b.pageNumber);
}

function mapToPlainObject(value: any) {
  if (!value) return {};

  if (value instanceof Map) {
    return Object.fromEntries(value);
  }

  if (typeof value.toObject === "function") {
    return value.toObject();
  }

  return value;
}

function serializeTemplate(template: any) {
  if (!template) {
    const fileUrl = DEFAULT_FILE_URL;

    return {
      fields: {},
      fileUrl,
      originalFileName: DEFAULT_FILE_NAME,
      originalFileType: "pdf",
      pageCount: PAGE_COUNT,
      pages: buildDefaultPages(fileUrl),
      coordinateMode: "pixels",
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      approvedAt: null,
      updatedAt: null,
    };
  }

  const rawFields = mapToPlainObject(template.fields);
  const fileUrl = cleanString(template.fileUrl) || DEFAULT_FILE_URL;
  const pages = normalizePages(template.pages, fileUrl);

  return {
    _id: String(template._id),
    id: String(template._id),
    name: template.name || "default",
    taxYear: template.taxYear || null,
    fileUrl,
    originalFileName: cleanString(template.originalFileName) || DEFAULT_FILE_NAME,
    originalFileType: cleanString(template.originalFileType) === "image" ? "image" : "pdf",
    pageCount: Math.max(1, Math.min(PAGE_COUNT, cleanNumber(template.pageCount, PAGE_COUNT))),
    pages,
    coordinateMode: normalizeCoordinateMode(template.coordinateMode),
    fields: rawFields,
    pageWidth: Number(template.pageWidth || PAGE_WIDTH),
    pageHeight: Number(template.pageHeight || PAGE_HEIGHT),
    isActive: Boolean(template.isActive),
    approvedAt: template.approvedAt || null,
    approvedBy: template.approvedBy ? String(template.approvedBy) : "",
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

async function readRequestBody(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const body: Record<string, any> = {};

    formData.forEach((value, key) => {
      if (value instanceof File) {
        body[key] = value;
        return;
      }

      const stringValue = String(value || "");

      if (["fields", "pages"].includes(key)) {
        try {
          const fallbackJson = key === "fields" ? "{}" : "[]";
          body[key] = JSON.parse(stringValue || fallbackJson);
        } catch {
          body[key] = key === "fields" ? {} : [];
        }
        return;
      }

      body[key] = stringValue;
    });

    return body;
  }

  return req.json().catch(() => null);
}

function buildUpdatePayload(body: any, admin: any) {
  const fields = normalizeFieldsMap(body?.fields);
  const pageWidth = Math.max(1, cleanNumber(body?.pageWidth, PAGE_WIDTH));
  const pageHeight = Math.max(1, cleanNumber(body?.pageHeight, PAGE_HEIGHT));
  const fileUrl = cleanString(body?.fileUrl) || DEFAULT_FILE_URL;
  const pages = normalizePages(body?.pages, fileUrl);
  const coordinateMode = normalizeCoordinateMode(body?.coordinateMode);

  return {
    fields,
    $set: {
      name: "default",
      taxYear:
        body?.taxYear === null || body?.taxYear === undefined || body?.taxYear === ""
          ? null
          : Math.max(1900, cleanNumber(body?.taxYear, new Date().getFullYear())),
      fileUrl,
      originalFileName: cleanString(body?.originalFileName) || DEFAULT_FILE_NAME,
      originalFileType:
        cleanString(body?.originalFileType) === "image" ? "image" : "pdf",
      pageCount: PAGE_COUNT,
      pages,
      coordinateMode,
      fields,
      pageWidth,
      pageHeight,
      isActive: true,
      approvedAt: new Date(),
      approvedBy: (admin as any)._id,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);
    const publicRead = searchParams.get("public") === "true";

    if (!publicRead) {
      const admin = await requireAdmin(req);

      if (!admin) {
        return NextResponse.json(
          { success: false, error: "אין הרשאת אדמין" },
          { status: 403 }
        );
      }
    }

    const template = await Form101Template.findOne({
      name: "default",
      isActive: true,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      template: serializeTemplate(template),
    });
  } catch (error) {
    console.error("GET FORM 101 TEMPLATE FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת תבנית טופס 101",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await db();

    const admin = await requireAdmin(req);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "אין הרשאת אדמין" },
        { status: 403 }
      );
    }

    const body = await readRequestBody(req);
    const { fields, $set } = buildUpdatePayload(body, admin);

    if (!Object.keys(fields).length) {
      return NextResponse.json(
        {
          success: false,
          error: "לא התקבלו שדות לשמירה",
        },
        { status: 400 }
      );
    }

    const updated = await Form101Template.findOneAndUpdate(
      {
        name: "default",
        isActive: true,
      },
      {
        $set,
      },
      {
        new: true,
        upsert: true,
      }
    ).lean();

    return NextResponse.json({
      success: true,
      message: "התבנית נשמרה ואושרה בהצלחה",
      template: serializeTemplate(updated),
    });
  } catch (error) {
    console.error("SAVE FORM 101 TEMPLATE FAILED:", error);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בשמירת תבנית טופס 101",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
