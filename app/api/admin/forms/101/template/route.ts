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
type DigitSpacingMode = "equal" | "group" | "custom";
type DigitGroupSizeMode = "auto" | "manual";

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
};

const PAGE_WIDTH = 900;
const PAGE_HEIGHT = 1280;
const DEFAULT_TEMPLATE_NAME = "default";

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
      authResult.user?._id ||
      authResult.user?.id ||
      ""
  );
}

/**
 * trim רק בקצוות.
 * לא מוחק רווחים פנימיים, כדי ש"קרית אתא" לא יהפוך ל"קריתאתא".
 */
function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function cleanNumber(value: unknown, fallback: number) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeAlign(value: unknown): TextAlign {
  const raw = cleanString(value);

  if (raw === "left") return "left";
  if (raw === "center") return "center";

  return "right";
}

function normalizeDigitSpacingMode(value: unknown): DigitSpacingMode {
  const raw = cleanString(value);

  if (raw === "group" || raw === "custom") return "group";

  return "equal";
}

function normalizeDigitGaps(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => Math.max(1, cleanNumber(item, 13)))
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

function normalizeField(field: any): FieldConfig {
  const type = normalizeType(field?.type);

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

    type,
    fontSize: Math.max(6, cleanNumber(field?.fontSize, 14)),

    digitGap:
      field?.digitGap === null || field?.digitGap === undefined
        ? null
        : Math.max(1, cleanNumber(field?.digitGap, 13)),

    digitSpacingMode:
      type === "digits"
        ? normalizeDigitSpacingMode(field?.digitSpacingMode)
        : undefined,

    digitGaps: type === "digits" ? normalizeDigitGaps(field?.digitGaps) : [],

    digitGroupSize:
      type !== "digits" ||
      field?.digitGroupSize === null ||
      field?.digitGroupSize === undefined
        ? null
        : Math.max(1, cleanNumber(field?.digitGroupSize, 3)),

    digitGroupSizeMode:
      type === "digits" && field?.digitGroupSizeMode === "manual"
        ? "manual"
        : "auto",

    digitGroupGap:
      type !== "digits" ||
      field?.digitGroupGap === null ||
      field?.digitGroupGap === undefined
        ? null
        : Math.max(0, cleanNumber(field?.digitGroupGap, 0)),

    maxDigits:
      field?.maxDigits === null || field?.maxDigits === undefined
        ? null
        : Math.max(1, cleanNumber(field?.maxDigits, 1)),

    align: normalizeAlign(field?.align),
  };
}

function normalizeFieldsMap(fieldsInput: any) {
  const source =
    fieldsInput instanceof Map
      ? Object.fromEntries(fieldsInput)
      : fieldsInput && typeof fieldsInput === "object"
      ? fieldsInput
      : {};

  const normalized: Record<string, FieldConfig> = {};

  Object.entries(source).forEach(([key, value]) => {
    const cleanKey = cleanString(key);

    if (!cleanKey) return;

    normalized[cleanKey] = normalizeField(value);
  });

  return normalized;
}

function serializeFields(fieldsInput: any) {
  return normalizeFieldsMap(fieldsInput);
}

function serializeTemplate(template: any) {
  if (!template) {
    return {
      _id: "",
      id: "",
      name: DEFAULT_TEMPLATE_NAME,
      taxYear: null,
      fields: {},
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      isActive: false,
      approvedAt: null,
      approvedBy: "",
      createdAt: null,
      updatedAt: null,
    };
  }

  const rawFields =
    template.fields instanceof Map
      ? Object.fromEntries(template.fields)
      : template.fields || {};

  return {
    _id: String(template._id || ""),
    id: String(template._id || ""),
    name: template.name || DEFAULT_TEMPLATE_NAME,
    taxYear: template.taxYear || null,

    fields: serializeFields(rawFields),

    pageWidth: Math.max(1, Number(template.pageWidth || PAGE_WIDTH)),
    pageHeight: Math.max(1, Number(template.pageHeight || PAGE_HEIGHT)),

    isActive: Boolean(template.isActive),
    approvedAt: template.approvedAt || null,
    approvedBy: template.approvedBy ? String(template.approvedBy) : "",

    createdAt: template.createdAt || null,
    updatedAt: template.updatedAt || null,
  };
}

function jsonError(message: string, status = 400, extra: Record<string, any> = {}) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);
    const publicRead = searchParams.get("public") === "true";

    if (!publicRead) {
      const admin = await requireAdmin(req);

      if (!admin) {
        return jsonError("אין הרשאת אדמין", 403);
      }
    }

    const query: Record<string, any> = {
      name: DEFAULT_TEMPLATE_NAME,
      isActive: true,
    };

    /**
     * עובד צריך לקבל רק תבנית מאושרת.
     * אדמין יכול לראות גם אם עדיין אין approvedAt.
     */
    if (publicRead) {
      query.approvedAt = { $ne: null };
    }

    const template = await Form101Template.findOne(query)
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      template: serializeTemplate(template),
    });
  } catch (error) {
    console.error("GET FORM 101 TEMPLATE FAILED:", error);

    return jsonError("שגיאה בטעינת תבנית טופס 101", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await db();

    const admin = await requireAdmin(req);

    if (!admin) {
      return jsonError("אין הרשאת אדמין", 403);
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError("הבקשה לא תקינה", 400);
    }

    const fields = normalizeFieldsMap(body.fields);
    const pageWidth = Math.max(1, cleanNumber(body.pageWidth, PAGE_WIDTH));
    const pageHeight = Math.max(1, cleanNumber(body.pageHeight, PAGE_HEIGHT));

    if (!Object.keys(fields).length) {
      return jsonError("לא התקבלו שדות לשמירה", 400);
    }

    const now = new Date();

    /**
     * יש תמיד תבנית אחת פעילה בשם default.
     * כל שמירה של האדמין גם מאשרת אותה לשימוש העובדים.
     */
    const updated = await Form101Template.findOneAndUpdate(
      {
        name: DEFAULT_TEMPLATE_NAME,
        isActive: true,
      },
      {
        $set: {
          name: DEFAULT_TEMPLATE_NAME,
          fields,
          pageWidth,
          pageHeight,
          isActive: true,
          approvedAt: now,
          approvedBy: (admin as any)._id,
        },
        $setOnInsert: {
          taxYear: null,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return NextResponse.json({
      success: true,
      message: "התבנית נשמרה ואושרה בהצלחה",
      template: serializeTemplate(updated),
    });
  } catch (error) {
    console.error("SAVE FORM 101 TEMPLATE FAILED:", error);

    return jsonError("שגיאה בשמירת תבנית טופס 101", 500);
  }
}