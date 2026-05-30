import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import ClientContract from "@/models/ClientContract";
import connectDB from "@/lib/mongodb";

export const runtime = "nodejs";

type ContractFileType = "pdf" | "image";

function getBaseUrl(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";

  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";

  return `${proto}://${host}`;
}

function normalizeFileType(file: File): ContractFileType | "" {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "";
}

function safeFileName(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase() || ".file";
  return `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
}

async function saveFileToPublicUploads(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "client-contracts"
  );

  await mkdir(uploadDir, { recursive: true });

  const fileName = safeFileName(file.name);
  const filePath = path.join(uploadDir, fileName);

  await writeFile(filePath, buffer);

  return `/uploads/client-contracts/${fileName}`;
}

function buildLinks(req: NextRequest, token: string) {
  const baseUrl = getBaseUrl(req);

  return {
    signingLink: `${baseUrl}/client-contracts/sign/${token}`,
    viewLink: `${baseUrl}/client-contracts/sign/${token}?view=1`,
  };
}

function getRequestMeta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") || "",
    userAgent: req.headers.get("user-agent") || "",
  };
}

function normalizeFields(rawFields: any[]) {
  if (!Array.isArray(rawFields)) return [];

  return rawFields.map((field, index) => ({
    id: String(field?.id || `field-${index + 1}`),
    type: String(field?.type || "text"),
    label: String(field?.label || ""),
    required: Boolean(field?.required),

    pageNumber: Math.max(1, Number(field?.pageNumber || 1)),

    x: Number(field?.x || 0),
    y: Number(field?.y || 0),
    width: Number(field?.width || 20),
    height: Number(field?.height || 6),

    value: String(field?.value || ""),
    signatureDataUrl: String(field?.signatureDataUrl || ""),
    signedAt: field?.signedAt || null,
  }));
}

function normalizePages(rawPages: any[]) {
  if (!Array.isArray(rawPages)) return [];

  return rawPages.map((page, index) => ({
    pageNumber: Math.max(1, Number(page?.pageNumber || index + 1)),
    url: String(page?.url || page?.imageUrl || ""),
    name: String(page?.name || page?.fileName || `עמוד ${index + 1}`),
    type: String(page?.type || "pdf").includes("image") ? "image" : "pdf",
  }));
}

function buildPdfPages(fileUrl: string, fileName: string, pageCount: number) {
  const safePageCount = Math.max(1, Math.min(50, Number(pageCount || 1)));

  return Array.from({ length: safePageCount }).map((_, index) => ({
    pageNumber: index + 1,
    url: fileUrl,
    name: `${fileName || "הסכם"} - עמוד ${index + 1}`,
    type: "pdf",
  }));
}

function serializeContract(req: NextRequest, contract: any) {
  const object =
    typeof contract?.toObject === "function" ? contract.toObject() : contract;

  const links = object?.signingToken
    ? buildLinks(req, String(object.signingToken))
    : { signingLink: "", viewLink: "" };

  return {
    ...object,
    signingLink: links.signingLink,
    viewLink: links.viewLink,
    signedAt: object?.signedAt || null,
    digitalSignatureText: object?.digitalSignatureText || "",
    pageCount: Math.max(1, Number(object?.pageCount || 1)),
    pages: normalizePages(object?.pages || []),
    fields: normalizeFields(object?.fields || []),
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

    if (!contracts.length) {
      return NextResponse.json(
        { success: false, message: "לא נמצאו הסכמים" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contracts: contracts.map((contract) => serializeContract(req, contract)),
      contract: serializeContract(req, contracts[0]),
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

    const contractId = String(formData.get("contractId") || "");
    const title = String(formData.get("title") || "הסכם לקוח").trim();
    const hallId = String(formData.get("hallId") || "");
    const hallName = String(formData.get("hallName") || "");
    const eventTitle = String(formData.get("eventTitle") || "");
    const clientName = String(formData.get("clientName") || "");
    const clientPhone = String(formData.get("clientPhone") || "");
    const clientEmail = String(formData.get("clientEmail") || "");

    const requestedPageCount = Math.max(
      1,
      Math.min(50, Number(formData.get("pageCount") || 1))
    );

    const rawFields = String(formData.get("fields") || "[]");
    const rawPages = String(formData.get("pages") || "[]");

    let parsedFields: any[] = [];
    let parsedPages: any[] = [];

    try {
      parsedFields = JSON.parse(rawFields);
    } catch {
      parsedFields = [];
    }

    try {
      parsedPages = JSON.parse(rawPages);
    } catch {
      parsedPages = [];
    }

    const fields = normalizeFields(parsedFields);

    const existingContract = contractId
      ? await ClientContract.findOne({ _id: contractId, eventId })
      : null;

    if (existingContract?.locked || existingContract?.status === "signed") {
      return NextResponse.json(
        { success: false, message: "ההסכם כבר נחתם וננעל לעריכה" },
        { status: 423 }
      );
    }

    const pdfFileValue = formData.get("file");
    const pdfFile =
      pdfFileValue instanceof File && pdfFileValue.size > 0
        ? pdfFileValue
        : null;

    const imageFiles = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    let originalFileUrl = "";
    let originalFileName = "";
    let originalFileType: ContractFileType = "pdf";
    let nextPages: any[] = [];
    let finalPageCount = requestedPageCount;

    if (pdfFile) {
      const fileType = normalizeFileType(pdfFile);

      if (fileType !== "pdf") {
        return NextResponse.json(
          { success: false, message: "קובץ PDF לא תקין" },
          { status: 400 }
        );
      }

      originalFileUrl = await saveFileToPublicUploads(pdfFile);
      originalFileName = pdfFile.name;
      originalFileType = "pdf";
      finalPageCount = requestedPageCount;
      nextPages = buildPdfPages(originalFileUrl, originalFileName, finalPageCount);
    } else if (imageFiles.length > 0) {
      const savedImages: { url: string; name: string }[] = [];

      for (const imageFile of imageFiles) {
        const fileType = normalizeFileType(imageFile);

        if (fileType !== "image") {
          return NextResponse.json(
            { success: false, message: "אחד מקבצי התמונה אינו תקין" },
            { status: 400 }
          );
        }

        const url = await saveFileToPublicUploads(imageFile);

        savedImages.push({
          url,
          name: imageFile.name,
        });
      }

      originalFileUrl = savedImages[0]?.url || "";
      originalFileName =
        savedImages.length === 1
          ? savedImages[0].name
          : `${savedImages.length} עמודים בתמונות`;
      originalFileType = "image";
      finalPageCount = Math.max(1, savedImages.length);

      nextPages = savedImages.map((image, index) => ({
        pageNumber: index + 1,
        url: image.url,
        name: image.name,
        type: "image",
      }));
    } else if (existingContract?.originalFileUrl) {
      originalFileUrl = existingContract.originalFileUrl;
      originalFileName = existingContract.originalFileName || "";
      originalFileType = existingContract.originalFileType || "pdf";

      if (originalFileType === "pdf") {
        finalPageCount = requestedPageCount;
        nextPages = buildPdfPages(originalFileUrl, originalFileName, finalPageCount);
      } else {
        const existingPages = normalizePages(existingContract.pages || []);
        const incomingPages = normalizePages(parsedPages);

        nextPages = existingPages.length ? existingPages : incomingPages;
        finalPageCount = Math.max(1, nextPages.length);
      }
    } else {
      return NextResponse.json(
        { success: false, message: "חובה להעלות קובץ הסכם" },
        { status: 400 }
      );
    }

    if (!originalFileUrl) {
      return NextResponse.json(
        { success: false, message: "שמירת קובץ ההסכם נכשלה" },
        { status: 400 }
      );
    }

    const signingToken =
      existingContract?.signingToken || randomBytes(24).toString("hex");

    const signingTokenExpiresAt =
      existingContract?.signingTokenExpiresAt ||
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    const basePayload = {
      eventId,
      title: title || "הסכם לקוח",
      hallId,
      hallName,
      eventTitle,
      clientName,
      clientPhone,
      clientEmail,

      originalFileUrl,
      originalFileName,
      originalFileType,

      pageCount: finalPageCount,
      pages: nextPages,

      fields,

      signingToken,
      signingTokenExpiresAt,

      status: existingContract?.status === "sent" ? "sent" : "draft",
      locked: false,
    };

    const auditEntry = {
      action: existingContract ? "contract_updated" : "contract_created",
      at: new Date(),
      ...getRequestMeta(req),
    };

    const contract = existingContract
      ? await ClientContract.findByIdAndUpdate(
          existingContract._id,
          {
            ...basePayload,
            $push: {
              auditLog: auditEntry,
            },
          },
          { new: true }
        )
      : await ClientContract.create({
          ...basePayload,
          auditLog: [auditEntry],
        });

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "שמירת ההסכם נכשלה" },
        { status: 500 }
      );
    }

    const links = buildLinks(req, contract.signingToken);

    return NextResponse.json({
      success: true,
      contract: {
        ...contract.toObject(),
        signingLink: links.signingLink,
        viewLink: links.viewLink,
      },
      signingLink: links.signingLink,
      viewLink: links.viewLink,
      contractId: String(contract._id),
    });
  } catch (error) {
    console.error("POST client contract failed:", error);

    return NextResponse.json(
      { success: false, message: "שמירת ההסכם נכשלה" },
      { status: 500 }
    );
  }
}