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
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  required?: boolean;
  order?: number;
};

type SaveTemplateBody = {
  businessId?: string;
  name?: string;
  fileUrl?: string;
  pageCount?: number;
  fields?: TemplateField[];
  isActive?: boolean;
};

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeFieldType(value: unknown): FieldType {
  const type = cleanStr(value);

  if (type === "date") return "date";
  if (type === "signature") return "signature";

  return "text";
}

function normalizeFields(fields: unknown): TemplateField[] {
  if (!Array.isArray(fields)) return [];

  return fields
    .map((field, index) => {
      const item = field as TemplateField;

      return {
        id: cleanStr(item.id) || `${Date.now()}-${index}`,
        label: cleanStr(item.label) || `שדה ${index + 1}`,
        type: normalizeFieldType(item.type),
        pageIndex: Math.max(0, cleanNumber(item.pageIndex, 0)),
        x: Math.max(0, cleanNumber(item.x, 0)),
        y: Math.max(0, cleanNumber(item.y, 0)),
        width: Math.max(20, cleanNumber(item.width, 160)),
        height: Math.max(20, cleanNumber(item.height, 32)),
        required: item.required !== false,
        order: cleanNumber(item.order, index + 1),
      };
    })
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
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
    const fileUrl =
      cleanStr(body.fileUrl) || "/templates/employee-agreement-invistimo.pdf";
    const pageCount = Math.max(1, cleanNumber(body.pageCount, 11));
    const fields = normalizeFields(body.fields);
    const isActive = body.isActive !== false;

    const query: Record<string, unknown> = {
      isActive: true,
    };

    if (businessId && mongoose.Types.ObjectId.isValid(businessId)) {
      query.businessId = new mongoose.Types.ObjectId(businessId);
    } else {
      query.businessId = null;
    }

    const update = {
      businessId:
        businessId && mongoose.Types.ObjectId.isValid(businessId)
          ? new mongoose.Types.ObjectId(businessId)
          : null,
      name,
      fileUrl,
      pageCount,
      fields,
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