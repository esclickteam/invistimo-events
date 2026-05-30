import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import ClientContract from "@/models/ClientContract";
import connectDB from "@/lib/mongodb";

export const runtime = "nodejs";

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

function normalizeFileType(file: File) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "";
}

function safeFileName(fileName: string) {
  const ext = path.extname(fileName || "").toLowerCase();
  const cleanExt = ext || ".file";
  return `${Date.now()}-${randomBytes(8).toString("hex")}${cleanExt}`;
}

async function saveFileToPublicUploads(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), "public", "uploads", "client-contracts");
  await mkdir(uploadDir, { recursive: true });

  const fileName = safeFileName(file.name);
  const filePath = path.join(uploadDir, fileName);

  await writeFile(filePath, buffer);

  return `/uploads/client-contracts/${fileName}`;
}

function buildLinks(req: NextRequest, token: string) {
  const baseUrl = getBaseUrl(req);
  const signingLink = `${baseUrl}/client-contracts/sign/${token}`;
  const viewLink = `${baseUrl}/client-contracts/sign/${token}?view=1`;

  return {
    signingLink,
    viewLink,
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

    const contract = await ClientContract.findOne({ eventId })
      .sort({ createdAt: -1 })
      .lean();

    if (!contract) {
      return NextResponse.json(
        { success: false, message: "לא נמצא הסכם" },
        { status: 404 }
      );
    }

    const links = contract.signingToken
      ? buildLinks(req, String(contract.signingToken))
      : { signingLink: "", viewLink: "" };

    return NextResponse.json({
      success: true,
      contract: {
        ...contract,
        signingLink: links.signingLink,
        viewLink: links.viewLink,
      },
    });
  } catch (error) {
    console.error("GET client contract failed:", error);

    return NextResponse.json(
      { success: false, message: "טעינת ההסכם נכשלה" },
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
    const hallId = String(formData.get("hallId") || "");
    const hallName = String(formData.get("hallName") || "");
    const eventTitle = String(formData.get("eventTitle") || "");
    const clientName = String(formData.get("clientName") || "");
    const clientPhone = String(formData.get("clientPhone") || "");
    const clientEmail = String(formData.get("clientEmail") || "");
    const rawFields = String(formData.get("fields") || "[]");

    let fields = [];

    try {
      fields = JSON.parse(rawFields);
    } catch {
      fields = [];
    }

    const file = formData.get("file") as File | null;

    let originalFileUrl = "";
    let originalFileName = "";
    let originalFileType: "pdf" | "image" = "pdf";

    const existingContract = contractId
      ? await ClientContract.findOne({ _id: contractId, eventId })
      : await ClientContract.findOne({ eventId }).sort({ createdAt: -1 });

    if (existingContract?.locked || existingContract?.status === "signed") {
      return NextResponse.json(
        { success: false, message: "ההסכם כבר נחתם וננעל לעריכה" },
        { status: 423 }
      );
    }

    if (file && file.size > 0) {
      const fileType = normalizeFileType(file);

      if (!fileType) {
        return NextResponse.json(
          { success: false, message: "ניתן להעלות PDF או תמונה בלבד" },
          { status: 400 }
        );
      }

      originalFileUrl = await saveFileToPublicUploads(file);
      originalFileName = file.name;
      originalFileType = fileType as "pdf" | "image";
    } else if (existingContract?.originalFileUrl) {
      originalFileUrl = existingContract.originalFileUrl;
      originalFileName = existingContract.originalFileName || "";
      originalFileType = existingContract.originalFileType || "pdf";
    } else {
      return NextResponse.json(
        { success: false, message: "חובה להעלות קובץ הסכם" },
        { status: 400 }
      );
    }

    const signingToken =
      existingContract?.signingToken || randomBytes(24).toString("hex");

    const signingTokenExpiresAt =
      existingContract?.signingTokenExpiresAt ||
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    const payload = {
      eventId,
      hallId,
      hallName,
      eventTitle,
      clientName,
      clientPhone,
      clientEmail,
      originalFileUrl,
      originalFileName,
      originalFileType,
      fields,
      signingToken,
      signingTokenExpiresAt,
      status: existingContract?.status === "sent" ? "sent" : "draft",
      locked: false,
      $push: {
        auditLog: {
          action: existingContract ? "contract_updated" : "contract_created",
          at: new Date(),
          ip: req.headers.get("x-forwarded-for") || "",
          userAgent: req.headers.get("user-agent") || "",
        },
      },
    };

    const contract = existingContract
      ? await ClientContract.findByIdAndUpdate(existingContract._id, payload, {
          new: true,
        })
      : await ClientContract.create(payload);

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