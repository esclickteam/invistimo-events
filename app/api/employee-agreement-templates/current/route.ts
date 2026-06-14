import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import os from "os";
import path from "path";

import db from "@/lib/db";
import EmployeeAgreementTemplate from "@/models/EmployeeAgreementTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FieldType = "text" | "date" | "signature";
type PageFileType = "image" | "pdf";

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
  type?: PageFileType;
};

type SaveTemplateBody = {
  businessId?: string;
  name?: string;
  fileUrl?: string;
  pageCount?: number;
  fields?: TemplateField[];
  pages?: TemplatePage[];
  isActive?: boolean;
  coordinateMode?: "percent" | "pixel";
};

const DEFAULT_FILE_URL = "/templates/employee-agreement-invistimo.pdf";
const DEFAULT_PAGE_COUNT = 11;

const LEGACY_PAGE_WIDTH = 700;
const LEGACY_PAGE_HEIGHT = 900;

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

function normalizePageType(value: unknown): PageFileType {
  return cleanStr(value) === "pdf" ? "pdf" : "image";
}

function defaultFieldLabel(type: FieldType, index: number) {
  if (type === "date") return "תאריך";
  if (type === "signature") return "חתימה";
  if (type === "text") return "שדה טקסט";

  return `שדה ${index + 1}`;
}

function normalizeFields(
  fields: unknown,
  coordinateMode: "percent" | "pixel"
): TemplateField[] {
  if (!Array.isArray(fields)) return [];

  return fields
    .map((field, index): TemplateField => {
      const item = field as TemplateField;
      const type = normalizeFieldType(item.type);

      let x = cleanNumber(item.x, 38);
      let y = cleanNumber(item.y, 35);
      let width = cleanNumber(item.width, type === "signature" ? 24 : 22);
      let height = cleanNumber(item.height, type === "signature" ? 8 : 6);

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

function normalizePagesFromBody({
  pages,
  fileUrl,
  pageCount,
}: {
  pages: unknown;
  fileUrl: string;
  pageCount: number;
}): TemplatePage[] {
  if (!Array.isArray(pages)) return [];

  return pages
    .map((page, index): TemplatePage => {
      const item = page as TemplatePage;

      const pageNumber =
        item.pageNumber !== undefined
          ? Math.max(1, cleanNumber(item.pageNumber, index + 1))
          : item.pageIndex !== undefined
            ? Math.max(1, cleanNumber(item.pageIndex, index) + 1)
            : index + 1;

      return {
        pageIndex: pageNumber - 1,
        pageNumber,
        url: cleanStr(item.url) || fileUrl,
        imageUrl: cleanStr(item.imageUrl),
        name: cleanStr(item.name) || `עמוד ${pageNumber}`,
        type: normalizePageType(item.type),
      };
    })
    .filter((page) => Number(page.pageNumber) >= 1)
    .filter((page) => Number(page.pageNumber) <= pageCount)
    .sort((a, b) => Number(a.pageNumber || 0) - Number(b.pageNumber || 0));
}

async function getPdfPageCountFromBuffer(buffer: Buffer, fallback: number) {
  try {
    const pdf = await PDFDocument.load(buffer);

    return Math.max(1, pdf.getPageCount());
  } catch {
    return Math.max(1, fallback);
  }
}

async function readPublicPdf(fileUrl: string): Promise<Buffer | null> {
  const cleanFileUrl = cleanStr(fileUrl) || DEFAULT_FILE_URL;

  if (!cleanFileUrl.startsWith("/")) {
    return null;
  }

  const relativePath = cleanFileUrl.replace(/^\/+/, "");

  if (!relativePath.endsWith(".pdf")) {
    return null;
  }

  const absolutePath = path.join(process.cwd(), "public", relativePath);

  try {
    return await fs.readFile(absolutePath);
  } catch {
    return null;
  }
}

function cloudinaryPageImageUrl(publicId: string, pageNumber: number) {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    format: "jpg",
    transformation: [
      {
        page: pageNumber,
        width: 1800,
        crop: "scale",
        quality: "auto:best",
      },
    ],
  });
}

async function uploadPdfToCloudinaryAndBuildPages({
  pdfBuffer,
  originalName,
  pageCount,
}: {
  pdfBuffer: Buffer;
  originalName: string;
  pageCount: number;
}): Promise<{
  fileUrl: string;
  pages: TemplatePage[];
}> {
  if (!hasCloudinaryConfig()) {
    throw new Error("חסרה הגדרת Cloudinary ב־env");
  }

  const safeName =
    originalName
      .replace(/[^\w.\-א-ת]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "employee-agreement-template.pdf";

  const tempPath = path.join(os.tmpdir(), `${Date.now()}-${safeName}`);

  await fs.writeFile(tempPath, pdfBuffer);

  try {
    const uploaded = await cloudinary.uploader.upload(tempPath, {
      resource_type: "image",
      folder: "employee-agreement-templates",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    });

    const fileUrl = String(uploaded.secure_url || "");
    const publicId = String(uploaded.public_id || "");

    if (!fileUrl || !publicId) {
      throw new Error("Cloudinary לא החזיר קישור תקין לקובץ");
    }

    const pages: TemplatePage[] = Array.from({ length: pageCount }).map(
      (_, index): TemplatePage => {
        const pageNumber = index + 1;

        return {
          pageIndex: index,
          pageNumber,
          url: fileUrl,
          imageUrl: cloudinaryPageImageUrl(publicId, pageNumber),
          name: `עמוד ${pageNumber}`,
          type: "image",
        };
      }
    );

    return {
      fileUrl,
      pages,
    };
  } finally {
    await fs.unlink(tempPath).catch(() => null);
  }
}

async function parseRequest(req: NextRequest): Promise<{
  body: SaveTemplateBody;
  pdfFile: File | null;
}> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    const body: SaveTemplateBody = {
      businessId: cleanStr(formData.get("businessId")),
      name: cleanStr(formData.get("name")),
      fileUrl: cleanStr(formData.get("fileUrl")),
      pageCount: cleanNumber(formData.get("pageCount"), DEFAULT_PAGE_COUNT),
      isActive: cleanStr(formData.get("isActive")) !== "false",
      coordinateMode:
        cleanStr(formData.get("coordinateMode")) === "pixel"
          ? "pixel"
          : "percent",
    };

    const fieldsRaw = cleanStr(formData.get("fields"));
    const pagesRaw = cleanStr(formData.get("pages"));

    if (fieldsRaw) {
      try {
        body.fields = JSON.parse(fieldsRaw) as TemplateField[];
      } catch {
        body.fields = [];
      }
    }

    if (pagesRaw) {
      try {
        body.pages = JSON.parse(pagesRaw) as TemplatePage[];
      } catch {
        body.pages = [];
      }
    }

    const fileValue = formData.get("file");
    const pdfFile = fileValue instanceof File ? fileValue : null;

    return {
      body,
      pdfFile,
    };
  }

  const body = (await req.json().catch(() => null)) as SaveTemplateBody | null;

  return {
    body: body || {},
    pdfFile: null,
  };
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const { body, pdfFile } = await parseRequest(req);

    if (!body) {
      return NextResponse.json(
        { success: false, error: "בקשה לא תקינה" },
        { status: 400 }
      );
    }

    const businessId = cleanStr(body.businessId);
    const name = cleanStr(body.name) || "תבנית הסכם עבודה";

    let fileUrl = cleanStr(body.fileUrl) || DEFAULT_FILE_URL;

    let pageCount = Math.max(
      1,
      Math.round(cleanNumber(body.pageCount, DEFAULT_PAGE_COUNT))
    );

    const coordinateMode =
      body.coordinateMode === "pixel" ? "pixel" : "percent";

    const fields = normalizeFields(body.fields, coordinateMode);

    let pages: TemplatePage[] = normalizePagesFromBody({
      pages: body.pages,
      fileUrl,
      pageCount,
    });

    let pdfBuffer: Buffer | null = null;
    let originalPdfName = "employee-agreement-invistimo.pdf";

    if (pdfFile && pdfFile.type === "application/pdf") {
      pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
      originalPdfName = pdfFile.name || originalPdfName;
    } else if (!pages.some((page) => cleanStr(page.imageUrl))) {
      pdfBuffer = await readPublicPdf(fileUrl);
    }

    if (pdfBuffer) {
      pageCount = await getPdfPageCountFromBuffer(pdfBuffer, pageCount);

      const result = await uploadPdfToCloudinaryAndBuildPages({
        pdfBuffer,
        originalName: originalPdfName,
        pageCount,
      });

      fileUrl = result.fileUrl;
      pages = result.pages;
    }

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
        error:
          err instanceof Error
            ? err.message
            : "שגיאה בשמירת תבנית ההסכם",
      },
      { status: 500 }
    );
  }
}