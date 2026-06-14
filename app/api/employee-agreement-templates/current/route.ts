import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import db from "@/lib/db";
import EmployeeAgreementTemplate from "@/models/EmployeeAgreementTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_FILE_URL = "/templates/employee-agreement-invistimo.pdf";
const DEFAULT_PAGE_COUNT = 11;

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePage(raw: any, index: number, template: any) {
  const pageNumber = Math.max(
    1,
    cleanNumber(
      raw?.pageNumber,
      raw?.pageIndex !== undefined ? Number(raw.pageIndex) + 1 : index + 1
    )
  );

  return {
    pageIndex: pageNumber - 1,
    pageNumber,
    url: cleanStr(raw?.url) || cleanStr(template?.fileUrl) || DEFAULT_FILE_URL,
    imageUrl: cleanStr(raw?.imageUrl),
    name: cleanStr(raw?.name) || `עמוד ${pageNumber}`,
    type: cleanStr(raw?.type) === "pdf" ? "pdf" : "image",
  };
}

function normalizeTemplate(template: any) {
  const fileUrl = cleanStr(template?.fileUrl) || DEFAULT_FILE_URL;

  const pageCount = Math.max(
    1,
    Math.round(cleanNumber(template?.pageCount, DEFAULT_PAGE_COUNT))
  );

  const pages = Array.isArray(template?.pages)
    ? template.pages
        .map((page: any, index: number) =>
          normalizePage(page, index, {
            ...template,
            fileUrl,
          })
        )
        .filter((page: any) => page.pageNumber >= 1)
        .filter((page: any) => page.pageNumber <= pageCount)
        .sort((a: any, b: any) => a.pageNumber - b.pageNumber)
    : [];

  return {
    ...template,
    fileUrl,
    pageCount,
    pages,
    coordinateMode:
      cleanStr(template?.coordinateMode) === "pixel" ? "pixel" : "percent",
    fields: Array.isArray(template?.fields) ? template.fields : [],
    isActive: template?.isActive !== false,
  };
}

export async function GET(req: NextRequest) {
  try {
    await db();

    const { searchParams } = new URL(req.url);

    const businessId = cleanStr(searchParams.get("businessId"));

    const businessObjectId =
      businessId && mongoose.Types.ObjectId.isValid(businessId)
        ? new mongoose.Types.ObjectId(businessId)
        : null;

    let template = await EmployeeAgreementTemplate.findOne({
      isActive: true,
      businessId: businessObjectId,
    })
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .lean();

    if (!template && businessObjectId) {
      template = await EmployeeAgreementTemplate.findOne({
        isActive: true,
        businessId: null,
      })
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .lean();
    }

    if (!template) {
      return NextResponse.json(
        {
          success: true,
          template: {
            businessId: businessObjectId,
            name: "תבנית הסכם עבודה",
            fileUrl: DEFAULT_FILE_URL,
            pageCount: DEFAULT_PAGE_COUNT,
            pages: [],
            fields: [],
            coordinateMode: "percent",
            isActive: true,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        template: normalizeTemplate(template),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET EMPLOYEE AGREEMENT TEMPLATE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בטעינת תבנית ההסכם",
      },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, HEAD, OPTIONS",
    },
  });
}