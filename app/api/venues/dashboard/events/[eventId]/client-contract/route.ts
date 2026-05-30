import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "@/lib/mongodb";
import ClientContract from "@/models/ClientContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

type ContractFieldType =
  | "signature"
  | "date"
  | "text"
  | "fullName"
  | "phone"
  | "email"
  | "idNumber"
  | "checkbox"
  | "venueNote";

type ContractField = {
  id: string;
  type: ContractFieldType;
  label: string;
  required: boolean;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string;
  signatureDataUrl?: string;
};

type ContractPage = {
  pageNumber: number;
  url: string;
  name: string;
  type: "pdf" | "image";
};

function safeJsonParse<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string") return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeString(value: FormDataEntryValue | null, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value;
}

function safeNumber(value: FormDataEntryValue | null, fallback = 1) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

function isRealFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL;

  if (envUrl) return envUrl.replace(/\/$/, "");

  const host = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";

  return `${proto}://${host}`.replace(/\/$/, "");
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function normalizeFieldType(value: unknown): ContractFieldType {
  const type = String(value || "text");

  const allowedTypes: ContractFieldType[] = [
    "signature",
    "date",
    "text",
    "fullName",
    "phone",
    "email",
    "idNumber",
    "checkbox",
    "venueNote",
  ];

  return allowedTypes.includes(type as ContractFieldType)
    ? (type as ContractFieldType)
    : "text";
}

function normalizeFields(rawFields: unknown): ContractField[] {
  if (!Array.isArray(rawFields)) return [];

  return rawFields.map((field: any, index: number) => ({
    id: String(field?.id || `field-${index + 1}`),
    type: normalizeFieldType(field?.type),
    label: String(field?.label || ""),
    required: Boolean(field?.required),
    pageNumber: Math.max(1, Number(field?.pageNumber || 1)),
    x: Number(field?.x || 0),
    y: Number(field?.y || 0),
    width: Number(field?.width || 20),
    height: Number(field?.height || 6),
    value: String(field?.value || ""),
    signatureDataUrl: String(field?.signatureDataUrl || ""),
  }));
}

function normalizePages(rawPages: unknown, fallbackUrl = ""): ContractPage[] {
  if (!Array.isArray(rawPages)) return [];

  return rawPages.map((page: any, index: number) => ({
    pageNumber: Math.max(1, Number(page?.pageNumber || index + 1)),
    url: String(page?.url || fallbackUrl || ""),
    name: String(page?.name || `עמוד ${index + 1}`),
    type: String(page?.type || "pdf").includes("image") ? "image" : "pdf",
  }));
}

async function fileToBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getCloudinaryResourceType(file: File): "image" | "raw" {
  if (file.type.startsWith("image/")) return "image";
  return "raw";
}

async function uploadFileToCloudinary({
  eventId,
  file,
  prefix,
}: {
  eventId: string;
  file: File;
  prefix: string;
}) {
  const buffer = await fileToBuffer(file);
  const resourceType = getCloudinaryResourceType(file);

  const cleanOriginalName =
    file.name
      ?.replace(/\.[^/.]+$/, "")
      .replace(/[^\w\u0590-\u05FF.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "client-contract";

  const publicId = `${prefix}-${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}-${cleanOriginalName}`;

  const folder = `invistimo/client-contracts/${eventId}`;

  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(uploadResult);
      }
    );

    uploadStream.end(buffer);
  });

  return {
    url: String(result.secure_url || result.url || ""),
    publicId: String(result.public_id || ""),
    fileName: file.name || cleanOriginalName,
    resourceType,
  };
}

function serializeContract(contract: any, req: NextRequest) {
  const object =
    typeof contract?.toObject === "function" ? contract.toObject() : contract;

  const baseUrl = getBaseUrl(req);
  const token = String(object?.signingToken || "");

  const signingLink = token
    ? `${baseUrl}/client-contracts/sign/${encodeURIComponent(token)}`
    : "";

  const viewLink = token
    ? `${baseUrl}/client-contracts/sign/${encodeURIComponent(token)}?view=1`
    : "";

  return {
    ...object,
    _id: String(object?._id || object?.id || ""),
    id: String(object?._id || object?.id || ""),
    signingLink,
    viewLink,
    signedViewLink: viewLink,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה אירוע" },
        { status: 400 }
      );
    }

    const contracts = await ClientContract.find({ eventId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      contracts: contracts.map((contract: any) =>
        serializeContract(contract, req)
      ),
    });
  } catch (error) {
    console.error("GET client contracts failed:", error);

    return NextResponse.json(
      { success: false, message: "טעינת ההסכמים נכשלה" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: "חסר מזהה אירוע" },
        { status: 400 }
      );
    }

    const formData = await req.formData();

    const contractId = safeString(formData.get("contractId"), "");
    const title = safeString(formData.get("title"), "הסכם לקוח");

    const hallId = safeString(formData.get("hallId"), "");
    const hallName = safeString(formData.get("hallName"), "");
    const eventTitle = safeString(formData.get("eventTitle"), "");

    const clientName = safeString(formData.get("clientName"), "");
    const clientPhone = safeString(formData.get("clientPhone"), "");
    const clientEmail = safeString(formData.get("clientEmail"), "");

    const requestedPageCount = Math.max(
      1,
      safeNumber(formData.get("pageCount"), 1)
    );

    const fields = normalizeFields(safeJsonParse(formData.get("fields"), []));
    const sentPages = normalizePages(safeJsonParse(formData.get("pages"), []));

    const singleFile = isRealFile(formData.get("file"))
      ? (formData.get("file") as File)
      : null;

    const multiFiles = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    let existingContract: any = null;

    if (contractId) {
      existingContract = await ClientContract.findOne({
        _id: contractId,
        eventId,
      });
    }

    if (
      existingContract &&
      (existingContract.locked ||
        existingContract.status === "signed" ||
        existingContract.status === "locked")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "ההסכם כבר נחתם וננעל לצפייה בלבד",
        },
        { status: 423 }
      );
    }

    let originalFileUrl = existingContract?.originalFileUrl || "";
    let originalFileName = existingContract?.originalFileName || "";
    let originalFileType: "pdf" | "image" =
      existingContract?.originalFileType === "image" ? "image" : "pdf";

    let pageCount = Math.max(
      1,
      Number(existingContract?.pageCount || requestedPageCount)
    );

    let pages: ContractPage[] = Array.isArray(existingContract?.pages)
      ? existingContract.pages
      : [];

    if (singleFile) {
      const uploaded = await uploadFileToCloudinary({
        eventId,
        file: singleFile,
        prefix: "pdf",
      });

      originalFileUrl = uploaded.url;
      originalFileName = uploaded.fileName;
      originalFileType = "pdf";
      pageCount = requestedPageCount;

      pages = Array.from({ length: pageCount }).map((_, index) => ({
        pageNumber: index + 1,
        url: uploaded.url,
        name: `${uploaded.fileName} - עמוד ${index + 1}`,
        type: "pdf",
      }));
    } else if (multiFiles.length > 0) {
      const uploadedImages = await Promise.all(
        multiFiles.map((file, index) =>
          uploadFileToCloudinary({
            eventId,
            file,
            prefix: `image-${index + 1}`,
          })
        )
      );

      originalFileUrl = uploadedImages[0]?.url || "";
      originalFileName =
        multiFiles.length === 1
          ? uploadedImages[0]?.fileName || "הסכם לקוח"
          : `${multiFiles.length} עמודים בתמונות`;

      originalFileType = "image";
      pageCount = uploadedImages.length;

      pages = uploadedImages.map((uploaded, index) => ({
        pageNumber: index + 1,
        url: uploaded.url,
        name: uploaded.fileName || `עמוד ${index + 1}`,
        type: "image",
      }));
    } else if (existingContract) {
      pageCount = requestedPageCount || pageCount;

      if (sentPages.length > 0) {
        const existingUrl = String(existingContract.originalFileUrl || "");

        pages = sentPages.map((page, index) => ({
          pageNumber: Number(page.pageNumber || index + 1),
          url:
            page.url && !page.url.startsWith("blob:")
              ? page.url
              : existingUrl,
          name:
            page.name ||
            `${existingContract.originalFileName || "הסכם"} - עמוד ${
              index + 1
            }`,
          type: page.type || originalFileType,
        }));
      }
    }

    if (!originalFileUrl) {
      return NextResponse.json(
        { success: false, message: "צריך להעלות קובץ הסכם לפני שמירה" },
        { status: 400 }
      );
    }

    if (!pages.length) {
      pages = Array.from({ length: pageCount }).map((_, index) => ({
        pageNumber: index + 1,
        url: originalFileUrl,
        name: `${originalFileName || "הסכם"} - עמוד ${index + 1}`,
        type: originalFileType,
      }));
    }

    const signingToken = existingContract?.signingToken || makeToken();

    const payload = {
      eventId,
      title,
      hallId,
      hallName,
      eventTitle,
      clientName,
      clientPhone,
      clientEmail,

      originalFileUrl,
      originalFileName,
      originalFileType,
      pageCount,
      pages,
      fields,

      signingToken,
      status: existingContract?.status || "draft",
      locked: Boolean(existingContract?.locked || false),
    };

    let savedContract: any;

    if (existingContract) {
      existingContract.set(payload);
      savedContract = await existingContract.save();
    } else {
      savedContract = await ClientContract.create(payload);
    }

    const serialized = serializeContract(savedContract, req);

    return NextResponse.json({
      success: true,
      message: "ההסכם נשמר בהצלחה",
      contract: serialized,
      clientContract: serialized,
      contractId: serialized.id,
      signingLink: serialized.signingLink,
      viewLink: serialized.viewLink,
    });
  } catch (error) {
    console.error("POST client contract failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? `שמירת ההסכם נכשלה: ${error.message}`
            : "שמירת ההסכם נכשלה",
      },
      { status: 500 }
    );
  }
}
