import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreementTemplate from "@/models/EmployeeAgreementTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FieldType = "text" | "date" | "signature";

type TemplateField = {
  id?: string;
  label?: string;
  type?: FieldType;
  pageIndex?: number;
  pageNumber?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  required?: boolean;
  order?: number;
};

type TemplatePage = {
  pageIndex?: number;
  pageNumber?: number;
  url?: string;
  imageUrl?: string;
  name?: string;
  type?: "image" | "pdf";
};

type SaveTemplateBody = {
  businessId?: string;
  name?: string;
  fileUrl?: string;
  pageCount?: number;
  fields?: TemplateField[];
  pages?: TemplatePage[];
  isActive?: boolean;

  /**
   * מעכשיו מומלץ לשלוח:
   * coordinateMode: "percent"
   */
  coordinateMode?: "percent" | "pixel";

  /**
   * אופציונלי:
   * אם תרצי בעתיד לשנות תיקייה לתמונות בלי לשנות קוד.
   */
  pageImageBaseUrl?: string;
};

const DEFAULT_FILE_URL = "/templates/employee-agreement-invistimo.pdf";
const DEFAULT_PAGE_COUNT = 11;

/**
 * כאן שמים את תמונות העמודים של ה־PDF.
 * בפועל הקבצים צריכים להיות:
 * public/templates/employee-agreement-invistimo-pages/page-1.png
 * public/templates/employee-agreement-invistimo-pages/page-2.png
 * וכו׳
 */
const DEFAULT_PAGE_IMAGE_BASE_URL =
  "/templates/employee-agreement-invistimo-pages";

const DEFAULT_PAGE_IMAGE_EXT = "png";

/**
 * המרה מהקוד הישן:
 * לפני כן x/y/width/height נשמרו בערך בפיקסלים לפי 700x900.
 * עכשיו שומרים באחוזים.
 */
const LEGACY_PAGE_WIDTH = 700;
const LEGACY_PAGE_HEIGHT = 900;

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeFieldType(value: unknown): FieldType {
  const type = cleanStr(value);

  if (type === "date") return "date";
  if (type === "signature") return "signature";

  return "text";
}

function defaultFieldLabel(type: FieldType, index: number) {
  if (type === "date") return "תאריך";
  if (type === "signature") return "חתימה";
  if (type === "text") return "שדה טקסט";

  return `שדה ${index + 1}`;
}

function normalizeFields(
  fields: unknown,
  coordinateMode: SaveTemplateBody["coordinateMode"]
): TemplateField[] {
  if (!Array.isArray(fields)) return [];

  return fields
    .map((field, index) => {
      const item = field as TemplateField;

      const type = normalizeFieldType(item.type);

      let x = cleanNumber(item.x, 38);
      let y = cleanNumber(item.y, 35);
      let width = cleanNumber(item.width, type === "signature" ? 24 : 22);
      let height = cleanNumber(item.height, type === "signature" ? 8 : 6);

      /**
       * אם מגיעים שדות ישנים בפיקסלים — ממירים לאחוזים.
       * אם coordinateMode הוא percent, לא נוגעים.
       */
      const looksLikeLegacyPixels =
        coordinateMode !== "percent" &&
        (x > 100 || y > 100 || width > 100 || height > 100);

      if (looksLikeLegacyPixels) {
        x = (x / LEGACY_PAGE_WIDTH) * 100;
        y = (y / LEGACY_PAGE_HEIGHT) * 100;
        width = (width / LEGACY_PAGE_WIDTH) * 100;
        height = (height / LEGACY_PAGE_HEIGHT) * 100;
      }

      width = clamp(Number(width.toFixed(2)), 4, 85);
      height = clamp(Number(height.toFixed(2)), 3, 35);
      x = clamp(Number(x.toFixed(2)), 0, 100 - width);
      y = clamp(Number(y.toFixed(2)), 0, 100 - height);

      const pageIndex =
        item.pageIndex !== undefined
          ? Math.max(0, cleanNumber(item.pageIndex, 0))
          : item.pageNumber !== undefined
            ? Math.max(0, cleanNumber(item.pageNumber, 1) - 1)
            : 0;

      return {
        id: cleanStr(item.id) || `${Date.now()}-${index}`,
        label: cleanStr(item.label) || defaultFieldLabel(type, index),
        type,
        pageIndex,
        x,
        y,
        width,
        height,
        required: item.required !== false,
        order: cleanNumber(item.order, index + 1),
      };
    })
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function normalizePageType(value: unknown): "image" | "pdf" {
  const type = cleanStr(value);

  if (type === "pdf") return "pdf";

  return "image";
}

function buildDefaultPages({
  fileUrl,
  pageCount,
  pageImageBaseUrl,
}: {
  fileUrl: string;
  pageCount: number;
  pageImageBaseUrl: string;
}): TemplatePage[] {
  return Array.from({ length: pageCount }).map((_, index) => {
    const pageNumber = index + 1;

    return {
      pageIndex: index,
      pageNumber,
      url: fileUrl,
      imageUrl: `${pageImageBaseUrl}/page-${pageNumber}.${DEFAULT_PAGE_IMAGE_EXT}`,
      name: `עמוד ${pageNumber}`,
      type: "image",
    };
  });
}

function normalizePages({
  pages,
  fileUrl,
  pageCount,
  pageImageBaseUrl,
}: {
  pages: unknown;
  fileUrl: string;
  pageCount: number;
  pageImageBaseUrl: string;
}): TemplatePage[] {
  if (!Array.isArray(pages) || pages.length === 0) {
    return buildDefaultPages({
      fileUrl,
      pageCount,
      pageImageBaseUrl,
    });
  }

  const normalized = pages.map((page, index) => {
    const item = page as TemplatePage;

    const pageNumber =
      item.pageNumber !== undefined
        ? Math.max(1, cleanNumber(item.pageNumber, index + 1))
        : item.pageIndex !== undefined
          ? Math.max(1, cleanNumber(item.pageIndex, index) + 1)
          : index + 1;

    const pageIndex = Math.max(0, pageNumber - 1);

    return {
      pageIndex,
      pageNumber,
      url: cleanStr(item.url) || fileUrl,
      imageUrl:
        cleanStr(item.imageUrl) ||
        `${pageImageBaseUrl}/page-${pageNumber}.${DEFAULT_PAGE_IMAGE_EXT}`,
      name: cleanStr(item.name) || `עמוד ${pageNumber}`,
      type: normalizePageType(item.type),
    };
  });

  /**
   * אם חסרים עמודים, משלימים אותם אוטומטית.
   */
  const existingPageNumbers = new Set(
    normalized.map((page) => Number(page.pageNumber))
  );

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    if (!existingPageNumbers.has(pageNumber)) {
      normalized.push({
        pageIndex: pageNumber - 1,
        pageNumber,
        url: fileUrl,
        imageUrl: `${pageImageBaseUrl}/page-${pageNumber}.${DEFAULT_PAGE_IMAGE_EXT}`,
        name: `עמוד ${pageNumber}`,
        type: "image",
      });
    }
  }

  return normalized
    .filter((page) => Number(page.pageNumber) >= 1)
    .filter((page) => Number(page.pageNumber) <= pageCount)
    .sort((a, b) => Number(a.pageNumber || 0) - Number(b.pageNumber || 0));
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const body = (await req.json().catch(() => null)) as SaveTemplateBody | null;

    if (!body) {
      return NextResponse.json(
        { success: false, error: "בקשה לא תקינה" },
        { status: 400 }
      );
    }

    const businessId = cleanStr(body.businessId);
    const name = cleanStr(body.name) || "תבנית הסכם עבודה";
    const fileUrl = cleanStr(body.fileUrl) || DEFAULT_FILE_URL;
    const pageCount = Math.max(
      1,
      Math.round(cleanNumber(body.pageCount, DEFAULT_PAGE_COUNT))
    );

    const pageImageBaseUrl =
      cleanStr(body.pageImageBaseUrl) || DEFAULT_PAGE_IMAGE_BASE_URL;

    const coordinateMode =
      body.coordinateMode === "pixel" ? "pixel" : "percent";

    const fields = normalizeFields(body.fields, coordinateMode);

    const pages = normalizePages({
      pages: body.pages,
      fileUrl,
      pageCount,
      pageImageBaseUrl,
    });

    const isActive = body.isActive !== false;

    const businessObjectId =
      businessId && mongoose.Types.ObjectId.isValid(businessId)
        ? new mongoose.Types.ObjectId(businessId)
        : null;

    const query: Record<string, unknown> = {
      isActive: true,
      businessId: businessObjectId,
    };

    const update = {
      businessId: businessObjectId,
      name,
      fileUrl,
      pageCount,
      pages,
      fields,
      coordinateMode,
      isActive,
      updatedAt: new Date(),
    };

    const template = await EmployeeAgreementTemplate.findOneAndUpdate(
      query,
      update,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (err) {
    console.error("SAVE EMPLOYEE AGREEMENT TEMPLATE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בשמירת תבנית ההסכם",
      },
      { status: 500 }
    );
  }
}