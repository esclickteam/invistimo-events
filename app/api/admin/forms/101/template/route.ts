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
  digitGaps?: number[]; // legacy only
  digitGroupSize?: number | null;
  digitGroupSizeMode?: DigitGroupSizeMode;
  digitGroupGap?: number | null;
  maxDigits?: number | null;
  align?: TextAlign;
};

const PAGE_WIDTH = 900;
const PAGE_HEIGHT = 1280;

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
        : Math.max(1, cleanNumber(field?.digitGap, 13)),
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
  };
}

function normalizeFieldsMap(fieldsInput: any) {
  const fields =
    fieldsInput && typeof fieldsInput === "object" ? fieldsInput : {};

  const normalized: Record<string, FieldConfig> = {};

  Object.entries(fields).forEach(([key, value]) => {
    const cleanKey = cleanString(key);

    if (!cleanKey) return;

    normalized[cleanKey] = normalizeField(value);
  });

  return normalized;
}

function serializeTemplate(template: any) {
  if (!template) {
    return {
      fields: {},
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      approvedAt: null,
      updatedAt: null,
    };
  }

  const rawFields =
    template.fields instanceof Map
      ? Object.fromEntries(template.fields)
      : template.fields || {};

  return {
    _id: String(template._id),
    id: String(template._id),
    name: template.name || "default",
    taxYear: template.taxYear || null,
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

    const body = await req.json().catch(() => null);

    const fields = normalizeFieldsMap(body?.fields);
    const pageWidth = Math.max(1, cleanNumber(body?.pageWidth, PAGE_WIDTH));
    const pageHeight = Math.max(1, cleanNumber(body?.pageHeight, PAGE_HEIGHT));

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
        $set: {
          name: "default",
          fields,
          pageWidth,
          pageHeight,
          isActive: true,
          approvedAt: new Date(),
          approvedBy: (admin as any)._id,
        },
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
